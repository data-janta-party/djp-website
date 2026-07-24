import { describe, expect, it } from 'vitest';

import {
  atBeat,
  b,
  holdFor,
  isKickBeat,
  kickBeatsInRange,
  KINETIC_BEAT,
  KINETIC_BPM,
  KINETIC_OFFSET_SEC,
} from '@/lib/data/kinetic-speech-beatmap';
import {
  beatDurationBeats,
  DELAYED_PROJECT_FACTS,
  DELAYED_PROJECT_SOURCES,
  getAllKineticBeats,
  getKineticSpeechAudioEndBeat,
  getKineticSpeechFilmDurationSec,
  getKineticSpeechStoryDurationSec,
  getKineticSpeechTranscript,
  getKineticSpeechVisualEndSec,
  KINETIC_ENDCARD_SOURCES,
  KINETIC_SPEECH_MUSIC_SOURCE,
  kineticSpeechAudioDurationSec,
  kineticSpeechCopy,
  kineticSpeechEndcardHoldSec,
  kineticSpeechReelCellEm,
  kineticSpeechRollerDomainLockGapBeats,
  kineticSpeechRollerSettleBeats,
  kineticSpeechRollerSlots,
  kineticSpeechRollerSpinDepth,
  kineticSpeechRollerVirtueHoldBeats,
  kineticSpeechRollerVirtueIndiaBeats,
  kineticSpeechRollerVirtues,
  kineticSpeechVirtues,
  kineticSpeechVisualTailSec,
  layoutKineticSpeech,
  stickyPrefixHoldBeats,
  type KineticBeat,
} from '@/lib/data/kinetic-speech';

function wordCount(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/** Holds are beat counts — convert to seconds for readability checks. */
function collectHoldBeats(beat: KineticBeat): number[] {
  switch (beat.kind) {
    case 'line':
      return [beat.hold];
    case 'pair':
      return [beat.holdLead, beat.holdHit];
    case 'slide-pair':
      return [beat.hold];
    case 'sticky':
      return beat.steps.flatMap((s) => [s.hold, ...(s.dots != null ? [s.dots] : [])]);
    case 'sticky-pair':
      return beat.steps.map((s) => s.hold);
    case 'flood':
    case 'silence':
    case 'cloud':
      return [beat.duration];
    case 'project-delays': {
      const holdEach = beat.holdEach ?? 3;
      return [...beat.projects.map(() => holdEach), beat.moreHold];
    }
    case 'rapid':
      return beat.words.map(() => beat.holdEach ?? 1);
    case 'quote':
      return [beat.hold];
    default:
      return [];
  }
}

describe('kinetic speech beat-locked budget', () => {
  it('uses the extracted 140 BPM grid with audio offset', () => {
    expect(KINETIC_BPM).toBe(140);
    expect(KINETIC_BEAT).toBeCloseTo(60 / 140, 5);
    expect(KINETIC_OFFSET_SEC).toBeCloseTo(0.2357, 3);
    expect(b(2)).toBe(2);
    expect(atBeat(0)).toBeCloseTo(KINETIC_OFFSET_SEC, 4);
    expect(atBeat(4) - atBeat(0)).toBeCloseTo(KINETIC_BEAT * 4, 5);
  });

  it('kick pattern exists on the analyzed grid (not silent)', () => {
    const kicks = Array.from({ length: 32 }, (_, i) => i).filter((i) => isKickBeat(i));
    expect(kicks.length).toBeGreaterThan(8);
  });

  it('story fits one pass of the ~142s track; film holds until music ends', () => {
    const story = getKineticSpeechStoryDurationSec();
    expect(story).toBeGreaterThan(70);
    // Demand sticky + thesis holds — story stays under ~130s ceiling
    expect(story).toBeLessThanOrEqual(130);
    expect(story).toBeLessThanOrEqual(kineticSpeechAudioDurationSec);
    // Open-on-first-kick + finale roller cuts — pin so silent length drift fails early
    expect(story).toBeGreaterThanOrEqual(90);
    // Pin layout length so silent story drift fails early (AQI ramp + vip + floods + demand sticky)
    // short a2 spam flood + mid-film project-delays cards; sticky co-plant + cough prefixHold + a6-abki
    // cold-open Chalta pairs: footpath/garbage/rich/poor/dengue/food/flood-cities (+ office/bribe) before VIP/AQI
    // bridge collapse vignette removed; food + flood-cities pairs; kick-snaps re-settle
    // Imagine reverse scenes (slightly longer garbage/AQI/project/Every) + a6-change
    // mid-film project-delays before a2-flood shifts kick-snaps; pin so drift fails early
    // Lack act cut + Demand rework (We want line + rapid list)
    expect(layoutKineticSpeech().endBeat).toBe(293);
    // Visual endcard is short; full film spans to natural track end so music is not cut
    expect(kineticSpeechEndcardHoldSec).toBe(11);
    expect(kineticSpeechVisualTailSec).toBe(0.4);
    const visualEnd = getKineticSpeechVisualEndSec();
    expect(visualEnd).toBeCloseTo(
      story + kineticSpeechEndcardHoldSec + kineticSpeechVisualTailSec,
      5,
    );
    expect(visualEnd).toBeLessThan(kineticSpeechAudioDurationSec);
    const film = getKineticSpeechFilmDurationSec();
    expect(film).toBe(Math.max(visualEnd, kineticSpeechAudioDurationSec));
    expect(film).toBe(kineticSpeechAudioDurationSec);
    expect(film).toBe(142);
    // Endcard heartbeat exclusive end = last grid slot before ~142s audio ends
    const audioEndBeat = getKineticSpeechAudioEndBeat();
    expect(audioEndBeat).toBeCloseTo(
      (kineticSpeechAudioDurationSec - KINETIC_OFFSET_SEC) / KINETIC_BEAT,
      5,
    );
    const endcard = layoutKineticSpeech().items.find((i) => i.beat.kind === 'endcard');
    expect(endcard).toBeDefined();
    if (endcard) {
      const kicksToMusicEnd = kickBeatsInRange(endcard.startBeat, audioEndBeat);
      const kicksVisualOnly = kickBeatsInRange(
        endcard.startBeat,
        endcard.startBeat + Math.ceil(kineticSpeechEndcardHoldSec / KINETIC_BEAT),
      );
      // Heartbeat covers at least the visual endcard window; film still spans to audio end
      // (music tail after visual hold may have no remaining analyzed kicks near 142s).
      expect(kicksToMusicEnd.length).toBeGreaterThanOrEqual(kicksVisualOnly.length);
      // HARD BUDGET WALL (Imagine reverse scenes @ endBeat 298):
      // endcard still has a kick pulse window on the music tail.
      expect(kicksToMusicEnd.length).toBeGreaterThanOrEqual(12);
      // Last pulse lands before audio duration (exclusive end of range)
      const lastKick = kicksToMusicEnd[kicksToMusicEnd.length - 1]!;
      expect(atBeat(lastKick)).toBeLessThan(kineticSpeechAudioDurationSec);
    }
  });

  it('pins finale roller slots, virtues, and spin timing', () => {
    expect([...kineticSpeechRollerSlots]).toEqual(['data', 'janta', 'party']);
    expect(kineticSpeechRollerSlots.join('.')).toBe(kineticSpeechCopy.endcard.url);
    // Step-through reel: multi-beat holds (readable adjectives, not blur)
    expect(kineticSpeechRollerSpinDepth).toBe(5);
    expect(kineticSpeechRollerVirtueHoldBeats).toBe(2);
    expect(kineticSpeechRollerVirtueIndiaBeats).toBe(
      (kineticSpeechRollerSpinDepth + 1) * kineticSpeechRollerVirtueHoldBeats,
    );
    expect(kineticSpeechRollerDomainLockGapBeats).toBe(2);
    expect(kineticSpeechReelCellEm).toBe(1.15);
    // Join unlock after adjective phase + 3 domain locks + 1 beat must fit endcard hold
    expect(kineticSpeechRollerSettleBeats).toBe(
      kineticSpeechRollerVirtueIndiaBeats +
        kineticSpeechRollerSlots.length * kineticSpeechRollerDomainLockGapBeats +
        1,
    );
    expect(kineticSpeechRollerSettleBeats).toBe(19);
    expect(kineticSpeechRollerSettleBeats * KINETIC_BEAT).toBeLessThanOrEqual(
      kineticSpeechEndcardHoldSec,
    );
    // Roller vision list includes rapid virtues plus extras
    for (const v of kineticSpeechVirtues) {
      expect(kineticSpeechRollerVirtues).toContain(v);
    }
    expect(kineticSpeechRollerVirtues).toContain('traceable');
    expect(kineticSpeechRollerVirtues).toContain('trackable');
  });

  it('opens film text on the first solid kick (no cold-open silence)', () => {
    const { items } = layoutKineticSpeech();
    expect(items[0]?.beat.id).toBe('a1-p1');
    expect(items[0]?.startBeat).toBe(3);
    expect(getAllKineticBeats().some((b) => b.id === 'a0-breathe')).toBe(false);
  });

  it('every laid-out event starts on a half-beat of the grid', () => {
    const { items } = layoutKineticSpeech();
    for (const item of items) {
      // startBeat should be n or n+0.5
      const doubled = item.startBeat * 2;
      expect(Math.abs(doubled - Math.round(doubled))).toBeLessThan(1e-9);
      // absolute time matches formula
      expect(atBeat(item.startBeat)).toBeCloseTo(
        KINETIC_OFFSET_SEC + item.startBeat * KINETIC_BEAT,
        5,
      );
    }
  });

  it('does not put multi-word phrases on slam / slam-xl', () => {
    for (const beat of getAllKineticBeats()) {
      if (beat.kind === 'line' && (beat.role === 'slam' || beat.role === 'slam-xl')) {
        // Wide thesis punches (“It is time for action.”) may use slam weight with multi-word copy
        if (beat.wide) continue;
        expect(wordCount(beat.text)).toBeLessThanOrEqual(2);
      }
      if (beat.kind === 'pair') {
        const hitRole = beat.hitRole ?? 'slam';
        if (hitRole === 'slam' || hitRole === 'slam-xl') {
          expect(wordCount(beat.hit)).toBeLessThanOrEqual(2);
        }
      }
    }
  });

  it('keeps readable holds (>= 1 beat for most body content)', () => {
    const holds = getAllKineticBeats().flatMap(collectHoldBeats);
    const short = holds.filter((h) => h < 1);
    expect(short.length / holds.length).toBeLessThan(0.15);
    const bodyish = holds.filter((h) => h >= 2);
    expect(bodyish.length).toBeGreaterThan(holds.length * 0.35);
  });

  it('holdFor gives longer thesis holds than filler (in beats)', () => {
    expect(holdFor('Metro.', 'filler')).toBeLessThan(
      holdFor('Bad governance affects everyone.', 'thesis'),
    );
  });

  it('includes core punchline and sticky beats', () => {
    const ids = getAllKineticBeats().map((beat) => beat.id);
    expect(ids).toContain('a2-deadline-sticky');
    expect(ids).toContain('a2-waiting');
    // False bridge-collapse vignette removed
    expect(ids).not.toContain('a2-bridge-years');
    expect(ids).not.toContain('a2-bridge-inaug');
    expect(ids).not.toContain('a2-bridge-fell');
    expect(ids).not.toContain('a2-bridge-ch');
    expect(ids).not.toContain('a2-delayed-list');
    expect(ids).toContain('a2-flood');
    expect(ids).toContain('a2-no');
    expect(ids).toContain('a2-nahi');
    expect(ids).not.toContain('a1-no');
    expect(ids).toContain('a1-food');
    expect(ids).toContain('a1-flood-cities');
    expect(ids).toContain('a1-office');
    expect(ids).toContain('a1-office-ch');
    expect(ids).not.toContain('a3-why');
    expect(ids).toContain('a3-lr');
    expect(ids).toContain('a3-ns');
    expect(ids).not.toContain('a3-pothole');
    expect(ids).not.toContain('a3-pollution');
    expect(ids).not.toContain('a3-ambulance');
    expect(ids).toContain('a3-equal');
    // Lack act removed — Demand opens after Divide
    expect(ids).not.toContain('a4-lack');
    expect(ids).not.toContain('a4-lack-hit');
    expect(ids).toContain('a4b-enough');
    expect(ids).toContain('a4b-want');
    expect(ids).toContain('a4b-want-list');
    expect(ids).toContain('a4b-now');
    expect(ids).not.toContain('a4b-dev');
    expect(ids).not.toContain('a4b-gov');
    expect(ids).not.toContain('a4b-account');
    expect(ids).toContain('a5-open');
    expect(ids).toContain('a5-garbage');
    expect(ids).toContain('a5-aqi');
    expect(ids).toContain('a5-project');
    expect(ids).toContain('a5-every');
    expect(ids).toContain('a5-public');
    expect(ids).toContain('a5-honest');
    expect(ids).toContain('a5-on-time');
    // Retired six-adjective synonym stack
    expect(ids).not.toContain('a5-trackable');
    expect(ids).not.toContain('a5-auditable');
    expect(ids).not.toContain('a5-visible');
    expect(ids).not.toContain('a5-transparent');
    expect(ids).not.toContain('a5-accountable');
    expect(ids).toContain('a6-change');
    expect(ids).toContain('a6-gandhi');
    expect(ids).not.toContain('a6-tagore');
    expect(ids).not.toContain('a6-gandhi-attr');
    expect(ids).toContain('a6-virtues');
    expect(ids).toContain('a6-india');
    expect(ids).toContain('a6-abki');
    expect(ids).not.toContain('a6-url');
    expect(ids).not.toContain('a6-deserve');
    expect(ids).toContain('a2-project-delays');
    expect(ids).toContain('a6-endcard');
    // Deadline/waiting → delayed project cards → Delayed/Chalta Hai flood; Abki → endcard
    const waiting = ids.indexOf('a2-waiting');
    const delays = ids.indexOf('a2-project-delays');
    const flood = ids.indexOf('a2-flood');
    const india = ids.indexOf('a6-india');
    const abki = ids.indexOf('a6-abki');
    const endcard = ids.indexOf('a6-endcard');
    expect(delays).toBeGreaterThan(waiting);
    expect(flood).toBeGreaterThan(delays);
    expect(abki).toBeGreaterThan(india);
    expect(endcard).toBeGreaterThan(abki);
  });

  it('government office counts 1→5 visits then Chalta Hai', () => {
    const office = getAllKineticBeats().find((b) => b.id === 'a1-office');
    expect(office && office.kind === 'sticky-pair').toBe(true);
    if (office && office.kind === 'sticky-pair') {
      expect(office.fixed).toBe('Government office.');
      expect(office.steps.map((s) => s.text)).toEqual([
        '1 visit.',
        '2 visits.',
        '3 visits.',
        '4 visits.',
        '5 visits.',
      ]);
      expect(office.steps.every((s) => s.hold === 1)).toBe(true);
    }
    const ch = getAllKineticBeats().find((b) => b.id === 'a1-office-ch');
    expect(ch && ch.kind === 'line' && ch.text).toBe('Chalta Hai.');
  });

  it('bribe pair drops taxes line', () => {
    const bribe = getAllKineticBeats().find((b) => b.id === 'a1-p4');
    expect(bribe && bribe.kind === 'pair').toBe(true);
    if (bribe && bribe.kind === 'pair') {
      expect(bribe.lead).toBe('Have to bribe.');
      expect(bribe.hit).toBe('Chalta Hai.');
      expect(bribe.lead).not.toMatch(/Taxes/i);
    }
  });

  it('cold-open Chalta pairs: footpath / garbage / rich / poor / dengue / food / flood-cities before office and VIP', () => {
    const ids = getAllKineticBeats().map((b) => b.id);
    const footpath = ids.indexOf('a1-p1');
    const garbage = ids.indexOf('a1-p2');
    const rich = ids.indexOf('a1-rich');
    const poor = ids.indexOf('a1-poor');
    const dengue = ids.indexOf('a1-dengue');
    const food = ids.indexOf('a1-food');
    const floodCities = ids.indexOf('a1-flood-cities');
    const office = ids.indexOf('a1-office');
    const bribe = ids.indexOf('a1-p4');
    const vip = ids.indexOf('a1-vip-ambulance');

    expect(footpath).toBe(0);
    expect(garbage).toBeGreaterThan(footpath);
    expect(rich).toBeGreaterThan(garbage);
    expect(poor).toBeGreaterThan(rich);
    expect(dengue).toBeGreaterThan(poor);
    expect(food).toBeGreaterThan(dengue);
    expect(floodCities).toBeGreaterThan(food);
    expect(office).toBeGreaterThan(floodCities);
    expect(bribe).toBeGreaterThan(office);
    expect(vip).toBeGreaterThan(bribe);

    const byId = Object.fromEntries(getAllKineticBeats().map((b) => [b.id, b]));
    const expectPair = (id: string, lead: string, holdLead: number) => {
      const beat = byId[id];
      expect(beat && beat.kind === 'pair').toBe(true);
      if (beat && beat.kind === 'pair') {
        expect(beat.lead).toBe(lead);
        expect(beat.hit).toBe('Chalta Hai.');
        expect(beat.heartbeat).toBe(true);
        expect(beat.holdLead).toBe(holdLead);
        expect(beat.holdHit).toBe(holdFor('Chalta Hai.', 'slam-word'));
      }
    };
    // Full holdFor body leads (readable openers)
    expectPair('a1-p1', 'Footpath broken.', holdFor('Footpath broken.', 'body'));
    expectPair('a1-p2', 'Garbage on the street.', holdFor('Garbage on the street.', 'body'));
    expectPair('a1-food', 'Food adulteration.', holdFor('Food adulteration.', 'body'));
    expectPair(
      'a1-flood-cities',
      'Same cities flooding every year.',
      holdFor('Same cities flooding every year.', 'body'),
    );
    // Snug leads (under holdFor body 4/4/5) — cold-open density + music-tail budget
    expectPair('a1-rich', 'Rich getting richer.', 2);
    expectPair('a1-poor', 'Poor getting poorer.', 2);
    expectPair('a1-dengue', '1 lakh dengue cases.', 3);
    expect(holdFor('Rich getting richer.', 'body')).toBe(4);
    expect(holdFor('Poor getting poorer.', 'body')).toBe(4);
    expect(holdFor('1 lakh dengue cases.', 'body')).toBe(5);
    expect(holdFor('Food adulteration.', 'body')).toBe(3);
    expect(holdFor('Same cities flooding every year.', 'body')).toBe(6);
    // Near-duplicate road line retired for footpath
    expect(getAllKineticBeats().some((b) => b.kind === 'pair' && b.lead === 'Road broken.')).toBe(
      false,
    );
  });

  it('Gandhi is a single quote slide with attribution', () => {
    const g = getAllKineticBeats().find((b) => b.id === 'a6-gandhi');
    expect(g && g.kind === 'quote').toBe(true);
    if (g && g.kind === 'quote') {
      expect(g.text).toMatch(/Be the change/i);
      expect(g.attribution).toMatch(/Mahatma Gandhi/i);
    }
  });

  it('every / deadline / waiting stickies stay single-line when possible', () => {
    for (const id of ['a5-every', 'a2-deadline-sticky', 'a2-waiting']) {
      const sticky = getAllKineticBeats().find((b) => b.id === id);
      expect(sticky && sticky.kind === 'sticky').toBe(true);
      if (sticky && sticky.kind === 'sticky') {
        expect(sticky.inline).toBe(true);
      }
    }
  });

  it('carries the change answer and action thesis after Gandhi', () => {
    const ids = getAllKineticBeats().map((b) => b.id);
    expect(ids.indexOf('a6-change')).toBe(ids.indexOf('a6-gandhi') + 1);
    expect(ids.indexOf('a6-action')).toBe(ids.indexOf('a6-change') + 1);
    const change = getAllKineticBeats().find(
      (beat) => beat.kind === 'line' && beat.id === 'a6-change',
    );
    expect(change && change.kind === 'line' && change.text).toBe('We are the change.');
    if (change && change.kind === 'line') {
      expect(change.role).toBe('slam');
      expect(change.wide).toBe(true);
      expect(change.hold).toBe(holdFor('We are the change.', 'thesis'));
    }
    const action = getAllKineticBeats().find(
      (beat) => beat.kind === 'line' && beat.id === 'a6-action',
    );
    expect(action && action.kind === 'line' && action.text).toBe('It is time for action.');
    const build = getAllKineticBeats().find(
      (beat) => beat.kind === 'line' && beat.id === 'a6-build',
    );
    expect(build && build.kind === 'line' && build.text).toBe("Let's build a");
  });

  it('Imagine act is lived reverse scenes + Every sticky + Public/Honest/On time (not jargon stack)', () => {
    const ids = getAllKineticBeats().map((b) => b.id);
    const open = ids.indexOf('a5-open');
    const garbage = ids.indexOf('a5-garbage');
    const aqi = ids.indexOf('a5-aqi');
    const project = ids.indexOf('a5-project');
    const every = ids.indexOf('a5-every');
    const publicId = ids.indexOf('a5-public');
    const honest = ids.indexOf('a5-honest');
    const onTime = ids.indexOf('a5-on-time');
    const gandhi = ids.indexOf('a6-gandhi');

    expect(open).toBeGreaterThan(ids.indexOf('a4b-now'));
    expect(garbage).toBe(open + 1);
    expect(aqi).toBe(garbage + 1);
    expect(project).toBe(aqi + 1);
    expect(every).toBe(project + 1);
    expect(publicId).toBe(every + 1);
    expect(honest).toBe(publicId + 1);
    expect(onTime).toBe(honest + 1);
    expect(gandhi).toBe(onTime + 1);

    const byId = Object.fromEntries(getAllKineticBeats().map((b) => [b.id, b]));

    const openBeat = byId['a5-open'];
    expect(openBeat?.kind).toBe('line');
    if (openBeat?.kind === 'line') {
      expect(openBeat.text).toBe('Imagine.');
      expect(openBeat.role).toBe('slam');
      expect(openBeat.hold).toBe(holdFor('Imagine.', 'slam-word'));
    }

    const garbageBeat = byId['a5-garbage'];
    expect(garbageBeat?.kind).toBe('pair');
    if (garbageBeat?.kind === 'pair') {
      expect(garbageBeat.lead).toBe('Garbage on the street.');
      expect(garbageBeat.hit).toBe('Cleaned. Caught. Fixed.');
      expect(garbageBeat.leadRole).toBe('body');
      expect(garbageBeat.hitRole).toBe('close');
      expect(garbageBeat.wide).toBe(true);
      expect(garbageBeat.holdLead).toBe(b(3));
      expect(garbageBeat.holdHit).toBe(b(3));
    }

    const aqiBeat = byId['a5-aqi'];
    expect(aqiBeat?.kind).toBe('sticky-pair');
    if (aqiBeat?.kind === 'sticky-pair') {
      expect(aqiBeat.mode).toBe('swap-hit');
      // Stable subject — not "AQI climbing." under "Issue fixed."
      expect(aqiBeat.fixed).toBe('AQI');
      expect(aqiBeat.fixedRole).toBe('slam');
      expect(aqiBeat.steps.map((s) => s.text)).toEqual([
        'climbing.',
        'Source detected.',
        'Issue fixed.',
      ]);
      expect(aqiBeat.steps.map((s) => s.hold)).toEqual([b(1.5), b(2), b(2)]);
      // No color ramp — monochrome Imagine (only a1-aqi may color)
      expect(aqiBeat.steps.every((s) => s.color == null)).toBe(true);
      expect(beatDurationBeats(aqiBeat)).toBe(6.5);
    }

    const projectBeat = byId['a5-project'];
    expect(projectBeat?.kind).toBe('sticky-pair');
    if (projectBeat?.kind === 'sticky-pair') {
      expect(projectBeat.mode).toBe('swap-hit');
      expect(projectBeat.fixed).toBe('A project announced.');
      expect(projectBeat.steps.map((s) => s.text)).toEqual([
        'Track against time.',
        'Accountability set.',
        'Updated monthly.',
        'Project finished.',
      ]);
      expect(projectBeat.steps.every((s) => s.hold === b(2))).toBe(true);
      expect(beatDurationBeats(projectBeat)).toBe(9);
    }

    const everyBeat = byId['a5-every'];
    expect(everyBeat?.kind).toBe('sticky');
    if (everyBeat?.kind === 'sticky') {
      expect(everyBeat.prefix).toBe('Every');
      expect(everyBeat.inline).toBe(true);
      expect(everyBeat.steps.map((s) => s.suffix)).toEqual([
        'project.',
        'deadline.',
        'rupee.',
      ]);
      expect(everyBeat.steps.every((s) => s.hold === b(1.5))).toBe(true);
      expect(everyBeat.exitHold ?? 0).toBe(0);
      expect(beatDurationBeats(everyBeat)).toBe(4.5);
    }

    const publicBeat = byId['a5-public'];
    const honestBeat = byId['a5-honest'];
    const onTimeBeat = byId['a5-on-time'];
    expect(publicBeat?.kind === 'line' && publicBeat.text).toBe('Public.');
    expect(honestBeat?.kind === 'line' && honestBeat.text).toBe('Honest.');
    expect(onTimeBeat?.kind === 'line' && onTimeBeat.text).toBe('On time.');
    if (onTimeBeat?.kind === 'line') {
      expect(onTimeBeat.wide).toBe(true);
      expect(onTimeBeat.role).toBe('slam');
      expect(onTimeBeat.hold).toBe(holdFor('On time.', 'slam-word'));
    }

    // Street language only — no open-source / software / synonym parade
    const transcript = getKineticSpeechTranscript();
    expect(transcript).toMatch(/Imagine\./);
    expect(transcript).toMatch(/Cleaned\. Caught\. Fixed\./);
    // Fixed subject AQI + process morphs (transcript joins fixed + steps)
    expect(transcript).toMatch(/\bAQI\b/);
    expect(transcript).toMatch(/climbing\./);
    expect(transcript).toMatch(/Source detected\./);
    expect(transcript).toMatch(/Issue fixed\./);
    expect(transcript).toMatch(/A project announced\./);
    expect(transcript).toMatch(/Project finished\./);
    expect(transcript).toMatch(/Accountability set\./);
    expect(transcript).toMatch(/Updated monthly\./);
    expect(transcript).toMatch(/Public\./);
    expect(transcript).toMatch(/Honest\./);
    expect(transcript).toMatch(/On time\./);
    expect(transcript).not.toMatch(/Trackable\./);
    expect(transcript).not.toMatch(/Auditable\./);
    expect(transcript).not.toMatch(/open source/i);
  });

  it('Demand act lands after Divide and before Imagine with We want + rapid list', () => {
    const ids = getAllKineticBeats().map((b) => b.id);
    const equal = ids.indexOf('a3-equal');
    const enough = ids.indexOf('a4b-enough');
    const want = ids.indexOf('a4b-want');
    const wantList = ids.indexOf('a4b-want-list');
    const now = ids.indexOf('a4b-now');
    const imagine = ids.indexOf('a5-open');
    expect(equal).toBeGreaterThanOrEqual(0);
    expect(enough).toBeGreaterThan(equal);
    expect(want).toBeGreaterThan(enough);
    expect(wantList).toBeGreaterThan(want);
    expect(now).toBeGreaterThan(wantList);
    expect(imagine).toBeGreaterThan(now);
    // Hardcut Divide → Demand → Imagine (no breath pads, no Lack act)
    expect(ids).not.toContain('a4-lack');
    expect(ids).not.toContain('a4-lack-hit');
    expect(ids).not.toContain('a4-breath');
    expect(ids).not.toContain('a4b-breath');
    // Replaced sticky morph with solo We want + rapid three words
    expect(ids).not.toContain('a4b-dev');
    expect(ids).not.toContain('a4b-gov');
    expect(ids).not.toContain('a4b-account');

    const byId = Object.fromEntries(getAllKineticBeats().map((b) => [b.id, b]));

    const enoughBeat = byId['a4b-enough'];
    expect(enoughBeat?.kind).toBe('line');
    if (enoughBeat?.kind === 'line') {
      expect(enoughBeat.text).toBe('Enough is enough.');
      expect(enoughBeat.role).toBe('close');
      expect(enoughBeat.motion).toBe('hardcut');
      expect(enoughBeat.heartbeat).toBe(true);
      expect(enoughBeat.wide).toBe(true);
      expect(enoughBeat.hold).toBe(b(7));
      expect(enoughBeat.role !== 'slam' && enoughBeat.role !== 'slam-xl').toBe(true);
    }

    const wantBeat = byId['a4b-want'];
    expect(wantBeat?.kind).toBe('line');
    if (wantBeat?.kind === 'line') {
      expect(wantBeat.text).toBe('We want');
      expect(wantBeat.role).toBe('close');
      expect(wantBeat.wide).toBe(true);
      expect(wantBeat.heartbeat).toBe(true);
      expect(wantBeat.hold).toBe(holdFor('We want', 'body'));
    }

    const wantListBeat = byId['a4b-want-list'];
    expect(wantListBeat?.kind).toBe('rapid');
    if (wantListBeat?.kind === 'rapid') {
      expect(wantListBeat.words).toEqual([
        'development',
        'no corruption',
        'accountability',
      ]);
      expect(wantListBeat.holdEach).toBe(2);
      expect(wantListBeat.role).toBe('body');
    }

    const nowBeat = byId['a4b-now'];
    expect(nowBeat?.kind).toBe('pair');
    if (nowBeat?.kind === 'pair') {
      expect(nowBeat.lead).toBe('and we want it…');
      expect(nowBeat.hit).toBe('now.');
      expect(nowBeat.leadRole).toBe('close');
      expect(nowBeat.hitRole).toBe('slam');
      expect(nowBeat.pulseHit).toBe(true);
      expect(nowBeat.heartbeat).toBe(true);
      expect(nowBeat.wide).toBe(true);
      expect(nowBeat.holdLead).toBe(holdFor('and we want it…', 'body'));
      expect(nowBeat.holdHit).toBe(holdFor('now.', 'slam-word'));
      // Same total budget as former thesis line (7 beats) — endBeat pin holds
      expect(nowBeat.holdLead + nowBeat.holdHit).toBe(7);
      expect(nowBeat.holdLead + nowBeat.holdHit).toBe(
        holdFor('and we want it now.', 'thesis'),
      );
    }
  });

  it('uses denser full-stage word-spam floods', () => {
    const floods = getAllKineticBeats().filter((b) => b.kind === 'flood');
    expect(floods.length).toBeGreaterThanOrEqual(2);
    for (const flood of floods) {
      if (flood.kind === 'flood') {
        expect(flood.count).toBeGreaterThanOrEqual(48);
        expect(flood.count).toBeLessThanOrEqual(72);
        // Words-only flood contract (tiles mode removed)
        expect(flood.words.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('a2-flood is classic Delayed / Chalta Hai word spam', () => {
    const flood = getAllKineticBeats().find((b) => b.id === 'a2-flood');
    expect(flood && flood.kind === 'flood').toBe(true);
    if (!(flood && flood.kind === 'flood')) {
      return;
    }
    expect(flood.words).toEqual(['Delayed.', 'CHALTA HAI', 'Chalta Hai.']);
    expect(flood.count).toBe(56);
    expect(flood.duration).toBe(8);
    expect(flood.shake).toBe(true);
  });

  it('mid-film project-delays sequence features major delayed projects with years (no sources)', () => {
    const delays = getAllKineticBeats().find((b) => b.id === 'a2-project-delays');
    expect(delays && delays.kind === 'project-delays').toBe(true);
    if (!(delays && delays.kind === 'project-delays')) {
      return;
    }
    // Readable card holds — not a blur crawl
    expect(delays.holdEach).toBe(3);
    expect(delays.moreHold).toBe(3);
    expect(delays.moreLabel).toBe('1000+ more.');
    expect(delays.projects.length).toBe(DELAYED_PROJECT_FACTS.length);
    expect(delays.projects.length).toBe(6);
    // Featured manifesto list
    expect(delays.projects.some((r) => /Bullet Train/i.test(r.project))).toBe(true);
    expect(delays.projects.some((r) => /Expressway/i.test(r.project))).toBe(true);
    expect(delays.projects.some((r) => /AMCA|fighter/i.test(r.project))).toBe(true);
    expect(delays.projects.some((r) => /Bengaluru Metro/i.test(r.project))).toBe(true);
    expect(delays.projects.some((r) => /Mumbai Metro/i.test(r.project))).toBe(false);
    expect(delays.projects.some((r) => /Jewar/i.test(r.project))).toBe(true);
    expect(delays.projects.some((r) => /Udhampur|Baramulla/i.test(r.project))).toBe(true);
    // Unique projects — no duplicates
    const projects = delays.projects.map((r) => r.project);
    expect(new Set(projects).size).toBe(delays.projects.length);
    // Each card: project + years delayed
    expect(
      delays.projects.every(
        (r) => r.project.length > 0 && /\d/.test(r.years) && /year/i.test(r.years),
      ),
    ).toBe(true);
    // No opaque MoSPI-style acronyms as sole names — public labels
    expect(
      delays.projects.every(
        (r) => !/\b(USBRL|PFBR|DMIC|BLR)\b/i.test(`${r.project} ${r.years}`),
      ),
    ).toBe(true);
    // Stage-readable field budgets
    expect(delays.projects.every((r) => r.project.length <= 60)).toBe(true);
    expect(delays.projects.every((r) => r.years.length <= 24)).toBe(true);
    // Shared constants power the beat; sources are endcard-only (not on beat)
    expect(delays.projects).toBe(DELAYED_PROJECT_FACTS);
    expect('sources' in delays).toBe(false);
    // Duration = 6×3 + 3
    expect(beatDurationBeats(delays)).toBe(21);
    // Transcript: name / Delayed. / years + more — no mid-film source labels
    const transcript = getKineticSpeechTranscript();
    expect(transcript).toMatch(/Bullet Train/);
    expect(transcript).toMatch(/Bengaluru Metro/);
    expect(transcript).toMatch(/Delayed\./);
    expect(transcript).toMatch(/5 years/);
    expect(transcript).toMatch(/4 years/);
    expect(transcript).toMatch(/5 years/);
    expect(transcript).toMatch(/21 years/);
    // Prefer single upper figure over ranges where called out
    expect(transcript).not.toMatch(/3–4 years/);
    expect(transcript).not.toMatch(/4–5 years/);
    expect(transcript).toMatch(/1000\+ more\./);
    // Source labels only appear via endcard Sources word, not mid-film dump.
    // Anchor a2-flood after "1000+ more." so we do not hit act1's CHALTA HAI first.
    const delaysIdx = transcript.indexOf('1000+ more.');
    expect(delaysIdx).toBeGreaterThanOrEqual(0);
    const a2FloodIdx = transcript.indexOf('CHALTA HAI', delaysIdx);
    expect(a2FloodIdx).toBeGreaterThan(delaysIdx);
    const midSlice = transcript.slice(delaysIdx, a2FloodIdx);
    expect(midSlice).not.toMatch(/MoSPI/);
    expect(midSlice).not.toMatch(/TOI|idrw|Metro Rail News|News18/);
    // Placement: after Still waiting, immediately before Delayed/Chalta Hai flood
    const ids = getAllKineticBeats().map((b) => b.id);
    expect(ids.indexOf('a2-project-delays')).toBeGreaterThan(ids.indexOf('a2-waiting'));
    expect(ids.indexOf('a2-flood')).toBeGreaterThan(ids.indexOf('a2-project-delays'));
    // credits-roll kind fully removed
    expect(getAllKineticBeats().some((b) => (b as { kind: string }).kind === 'credits-roll')).toBe(
      false,
    );
  });

  it('endcard Sources list covers music credit + every delayed project source', () => {
    expect(kineticSpeechCopy.endcard.sources).toBe('Sources');
    expect(KINETIC_SPEECH_MUSIC_SOURCE.label.length).toBeGreaterThan(0);
    expect(KINETIC_SPEECH_MUSIC_SOURCE.href).toMatch(
      /^https:\/\/pixabay\.com\/music\/main-title-lifestyle-sport-tribal-stomping-kinetic-promo-music-131761\/$/,
    );
    expect(KINETIC_ENDCARD_SOURCES[0]).toEqual(KINETIC_SPEECH_MUSIC_SOURCE);
    // Music + all delayed-project sources (incl. MoSPI)
    expect(KINETIC_ENDCARD_SOURCES.length).toBe(1 + DELAYED_PROJECT_SOURCES.length);
    for (const s of DELAYED_PROJECT_SOURCES) {
      expect(KINETIC_ENDCARD_SOURCES.some((e) => e.href === s.href && e.label === s.label)).toBe(
        true,
      );
    }
    expect(
      KINETIC_ENDCARD_SOURCES.every((s) => s.label.length > 0 && s.href.startsWith('https://')),
    ).toBe(true);
    // Coverage: dedicated refs for featured delays
    const sourceBlob = DELAYED_PROJECT_SOURCES.map((s) => `${s.label} ${s.href}`).join(' | ');
    expect(sourceBlob).toMatch(/Bullet Train/i);
    expect(sourceBlob).toMatch(/timesofindia\.indiatimes\.com/i);
    expect(sourceBlob).toMatch(/Expressway/i);
    expect(sourceBlob).toMatch(/AMCA/i);
    expect(sourceBlob).toMatch(/idrw\.org/i);
    expect(sourceBlob).toMatch(/Bengaluru Metro/i);
    expect(sourceBlob).toMatch(/metrorailnews\.in/i);
    expect(sourceBlob).toMatch(/Jewar/i);
    expect(sourceBlob).toMatch(/news18\.com/i);
    expect(sourceBlob).toMatch(/USBRL|Udhampur|Baramulla/i);
    // Prefer delay-reporting news where available (not only project overview pages)
    expect(DELAYED_PROJECT_SOURCES.some((s) => /Mint|TOI|News18|idrw|MoSPI/i.test(s.label))).toBe(
      true,
    );
    expect(DELAYED_PROJECT_SOURCES.every((s) => !s.href.includes('noidaairport.com'))).toBe(true);
    // Transcript mentions Sources on endcard
    expect(getKineticSpeechTranscript()).toMatch(/Sources/);
  });

  it('after Still waiting: delayed project cards then Delayed/Chalta Hai flood (no bridge vignette)', () => {
    const ids = getAllKineticBeats().map((b) => b.id);
    const waiting = ids.indexOf('a2-waiting');
    const delays = ids.indexOf('a2-project-delays');
    const flood = ids.indexOf('a2-flood');
    expect(waiting).toBeGreaterThanOrEqual(0);
    expect(delays).toBeGreaterThan(waiting);
    expect(flood).toBeGreaterThan(delays);
    // Contiguous: waiting immediately precedes project-delays (no bridge beats between)
    expect(delays).toBe(waiting + 1);
    expect(ids).not.toContain('a2-bridge-years');
    expect(ids).not.toContain('a2-bridge-inaug');
    expect(ids).not.toContain('a2-bridge-fell');
    expect(ids).not.toContain('a2-bridge-ch');
  });

  it('after delayed flood: NO. then Nahi chalta hai.', () => {
    const ids = getAllKineticBeats().map((b) => b.id);
    const flood = ids.indexOf('a2-flood');
    const no = ids.indexOf('a2-no');
    const nahi = ids.indexOf('a2-nahi');
    expect(flood).toBeGreaterThanOrEqual(0);
    expect(no).toBeGreaterThan(flood);
    expect(nahi).toBeGreaterThan(no);
    const noBeat = getAllKineticBeats().find((b) => b.id === 'a2-no');
    const nahiBeat = getAllKineticBeats().find((b) => b.id === 'a2-nahi');
    expect(noBeat && noBeat.kind === 'line' && noBeat.text).toBe('NO.');
    expect(noBeat && noBeat.kind === 'line' && noBeat.role).toBe('slam-xl');
    expect(nahiBeat && nahiBeat.kind === 'line' && nahiBeat.text).toBe('Nahi chalta hai.');
  });

  it('kick-snaps floods and slam-xl lines onto kick beats', () => {
    const { items } = layoutKineticSpeech();
    for (const item of items) {
      if (item.beat.kind === 'flood') {
        expect(isKickBeat(item.startBeat)).toBe(true);
      }
      if (item.beat.kind === 'line' && item.beat.role === 'slam-xl') {
        expect(isKickBeat(item.startBeat)).toBe(true);
      }
    }
    const flood2 = items.find((i) => i.beat.id === 'a2-flood');
    const no = items.find((i) => i.beat.id === 'a2-no');
    expect(flood2 && isKickBeat(flood2.startBeat)).toBe(true);
    expect(no && isKickBeat(no.startBeat)).toBe(true);
  });

  it('a2 spam flood lands on kicks for wall intensity', () => {
    const flood = getAllKineticBeats().find((b) => b.id === 'a2-flood');
    expect(flood && flood.kind === 'flood').toBe(true);
    if (!(flood && flood.kind === 'flood')) {
      return;
    }
    const item = layoutKineticSpeech().items.find((i) => i.beat.id === 'a2-flood');
    expect(item).toBeDefined();
    const kicks = kickBeatsInRange(item!.startBeat, item!.endBeat);
    // Short spam flood still thumps across a few kicks
    expect(kicks.length).toBeGreaterThanOrEqual(2);
    expect(flood.duration).toBe(8);
  });

  it('rapid virtues list is complete and beat-locked', () => {
    const rapid = getAllKineticBeats().find((b) => b.kind === 'rapid' && b.id === 'a6-virtues');
    expect(rapid && rapid.kind === 'rapid').toBe(true);
    if (rapid && rapid.kind === 'rapid') {
      expect(rapid.words).toEqual([...kineticSpeechVirtues]);
      expect(rapid.holdEach ?? 1).toBe(1);
    }
  });

  it('deadline sticky is inline with beat-synced dots and kick heartbeat', () => {
    const sticky = getAllKineticBeats().find((b) => b.id === 'a2-deadline-sticky');
    expect(sticky && sticky.kind === 'sticky').toBe(true);
    if (sticky && sticky.kind === 'sticky') {
      expect(sticky.inline).toBe(true);
      expect(sticky.heartbeat).toBe(true);
      expect(sticky.prefix).toBe('Deadline');
      expect(sticky.steps.every((s) => (s.dots ?? 0) >= 1)).toBe(true);
      // Ellipsis is trailing "..." of the phrase, not a separate period+chrome
      expect(sticky.steps.map((s) => s.suffix)).toEqual([
        'promised',
        'extended',
        'extended again',
      ]);
    }
  });

  it('visible-suffix stickies co-plant prefix with first suffix (no solo prefix beat)', () => {
    for (const id of ['a2-deadline-sticky', 'a5-every']) {
      const sticky = getAllKineticBeats().find((b) => b.id === id);
      expect(sticky && sticky.kind === 'sticky').toBe(true);
      if (sticky && sticky.kind === 'sticky') {
        expect(stickyPrefixHoldBeats(sticky)).toBe(0);
        const holdDots = sticky.steps.reduce((n, s) => n + s.hold + (s.dots ?? 0), 0);
        expect(beatDurationBeats(sticky)).toBe(holdDots + (sticky.exitHold ?? 0));
      }
    }
    // Empty-suffix (dots only) still plants prefix alone for 1 beat
    const waiting = getAllKineticBeats().find((b) => b.id === 'a2-waiting');
    expect(waiting && waiting.kind === 'sticky').toBe(true);
    if (waiting && waiting.kind === 'sticky') {
      expect(stickyPrefixHoldBeats(waiting)).toBe(1);
      const holdDots = waiting.steps.reduce((n, s) => n + s.hold + (s.dots ?? 0), 0);
      expect(beatDurationBeats(waiting)).toBe(1 + holdDots + (waiting.exitHold ?? 0));
    }
  });

  it('cough sticky holds solo prefix then second Cough (~1s stagger)', () => {
    const cough = getAllKineticBeats().find((b) => b.id === 'a2-cough-sticky');
    expect(cough && cough.kind === 'sticky').toBe(true);
    if (cough && cough.kind === 'sticky') {
      expect(cough.prefix).toBe('Cough');
      expect(cough.cough).toBe(true);
      expect(cough.prefixHold).toBe(b(2));
      expect(stickyPrefixHoldBeats(cough)).toBe(2);
      expect(cough.steps.map((s) => s.suffix)).toEqual(['Cough']);
      // prefixHold + step hold (no exitHold — hardcut to Chalta Hai)
      expect(beatDurationBeats(cough)).toBe(2 + 2);
      expect(cough.exitHold ?? 0).toBe(0);
    }
  });

  it('still-waiting sticky carries inline ellipsis dots and kick heartbeat', () => {
    const sticky = getAllKineticBeats().find((b) => b.id === 'a2-waiting');
    const deadline = getAllKineticBeats().find((b) => b.id === 'a2-deadline-sticky');
    expect(sticky && sticky.kind === 'sticky').toBe(true);
    if (sticky && sticky.kind === 'sticky') {
      expect(sticky.inline).toBe(true);
      expect(sticky.heartbeat).toBe(true);
      expect(sticky.prefix).toBe('Still waiting');
      // Match Deadline sticky type size (body, not close)
      expect(sticky.prefixRole ?? 'body').toBe('body');
      expect(sticky.steps[0]?.role ?? sticky.prefixRole ?? 'body').toBe('body');
      expect(sticky.steps[0]?.dots).toBeGreaterThanOrEqual(1);
    }
    if (deadline && deadline.kind === 'sticky') {
      expect(deadline.prefixRole ?? 'body').toBe('body');
    }
  });

  it('left/right and north/south are beat-locked tussles', () => {
    const lr = getAllKineticBeats().find((b) => b.id === 'a3-lr');
    const ns = getAllKineticBeats().find((b) => b.id === 'a3-ns');
    expect(lr && lr.kind === 'slide-pair').toBe(true);
    expect(ns && ns.kind === 'slide-pair').toBe(true);
    if (lr && lr.kind === 'slide-pair') {
      expect(lr.tussle).toBe(true);
      expect(lr.axis ?? 'x').toBe('x');
      expect(lr.hold).toBeGreaterThanOrEqual(6);
      expect(lr.left).toBe('Left.');
      expect(lr.right).toBe('Right.');
    }
    if (ns && ns.kind === 'slide-pair') {
      expect(ns.tussle).toBe(true);
      expect(ns.axis).toBe('y');
      expect(ns.hold).toBeGreaterThanOrEqual(6);
      expect(ns.left).toBe('North.');
      expect(ns.right).toBe('South.');
    }
  });

  it('divide closes with bad governance affects everyone (no doesn\'t care triad)', () => {
    const texts = getAllKineticBeats()
      .filter((b): b is Extract<KineticBeat, { kind: 'line' }> => b.kind === 'line')
      .filter((b) => b.id.startsWith('a3-'))
      .map((b) => b.text);
    expect(texts).not.toContain("The pothole doesn't care.");
    expect(texts).not.toContain("The pollution doesn't care.");
    expect(texts).not.toContain("The delayed ambulance doesn't care.");
    expect(texts).toContain('Bad governance affects everyone.');
    const equal = getAllKineticBeats().find((b) => b.id === 'a3-equal');
    expect(equal && equal.kind === 'line').toBe(true);
    if (equal && equal.kind === 'line') {
      expect(equal.wide).toBe(true);
      expect(equal.role).toBe('close');
    }
  });

  it('keeps monochrome stage — no invert beats; only India uses tiranga', () => {
    const kinds = new Set(getAllKineticBeats().map((b) => b.kind));
    expect(kinds.has('invert' as KineticBeat['kind'])).toBe(false);
    const tirangaIds = getAllKineticBeats()
      .filter((b): b is Extract<KineticBeat, { kind: 'line' }> => b.kind === 'line')
      .filter((b) => b.tiranga)
      .map((b) => b.id);
    expect(tirangaIds).toEqual(['a6-india']);
  });

  it('featured project cards land mid-film before Delayed/Chalta Hai flood (not sticky-inventory)', () => {
    expect(getAllKineticBeats().some((b) => b.id === 'a2-delayed-list')).toBe(false);
    // sticky-inventory / credits-roll removed; project-delays cards sit right before a2-flood
    const ids = getAllKineticBeats().map((b) => b.id);
    expect(ids.indexOf('a2-project-delays')).toBeLessThan(ids.indexOf('a2-flood'));
    const a2 = getAllKineticBeats().find((b) => b.id === 'a2-flood');
    expect(a2 && a2.kind === 'flood' && a2.words.length >= 1).toBe(true);
    expect(getAllKineticBeats().some((b) => b.kind === 'project-delays')).toBe(true);
    expect(getAllKineticBeats().some((b) => (b as { kind: string }).kind === 'credits-roll')).toBe(
      false,
    );
  });

  it('project-delays CSS emphasizes name + years over Delayed label; sources only on endcard', async () => {
    const { readFile } = await import('node:fs/promises');
    const { resolve } = await import('node:path');
    const css = await readFile(
      resolve(process.cwd(), 'app/globals.css'),
      'utf8',
    );
    // Hierarchy: project semibold, years heavy slam, dim Delayed label
    expect(css).toMatch(/\.kinetic-delay-project\s*\{[^}]*font-weight:\s*600/s);
    expect(css).toMatch(/\.kinetic-delay-years\s*\{[^}]*font-weight:\s*800/s);
    expect(css).toMatch(/\.kinetic-delay-label\s*\{[^}]*opacity:\s*0\.72/s);
    expect(css).toMatch(/--kinetic-off-white:\s*#f7f6f5/);
    expect(css).toMatch(
      /\.kinetic-delay-project\s*\{[^}]*color:\s*var\(--kinetic-off-white\)/s,
    );
    expect(css).toMatch(
      /\.kinetic-delay-years\s*\{[^}]*color:\s*var\(--kinetic-off-white\)/s,
    );
    // Mid-film sources dock CSS removed
    expect(css).not.toMatch(/\.kinetic-delay-sources\b/);
    expect(css).not.toMatch(/\.kinetic-delay-sources-heading/);
    expect(css).not.toMatch(/\.kinetic-delay-sources-link/);
    expect(css).not.toMatch(/\[data-k-delay-sources\]/);
    expect(css).toMatch(/--kinetic-focus-ring:/);
    // Endcard Sources HoverCard is portaled to body — popup must redeclare film tokens
    // (tokens are otherwise only under #kinetic-speech-film).
    expect(css).toMatch(
      /\.kinetic-endcard-sources-content\s*\{[^}]*--kinetic-charcoal:\s*#000000/s,
    );
    expect(css).toMatch(
      /\.kinetic-endcard-sources-content\s*\{[^}]*background:\s*var\(--kinetic-charcoal/s,
    );
    expect(css).toMatch(/\.kinetic-endcard-sources-heading/);
    expect(css).toMatch(/\.kinetic-endcard-sources-link/);
    // Dead credits-roll / tiles-flood / sticky-inventory CSS must stay gone
    expect(css).not.toMatch(/\.kinetic-credits-roll\b/);
    expect(css).not.toMatch(/\.kinetic-credit-row\b/);
    expect(css).not.toMatch(/\.kinetic-flood-tile-card\b/);
    expect(css).not.toMatch(/\.kinetic-sticky-inventory\b/);
  });

  it('sticky-pair lines stay within a stage-width character budget', () => {
    // Stacked layout: each half is its own line. Full project names + crore may
    // soft-wrap on mobile; keep a generous char budget under 96vw.
    const STICKY_PAIR_LINE_BUDGET = 60;
    for (const beat of getAllKineticBeats()) {
      if (beat.kind !== 'sticky-pair') {
        continue;
      }
      expect(beat.fixed.length).toBeLessThanOrEqual(STICKY_PAIR_LINE_BUDGET);
      for (const step of beat.steps) {
        expect(step.text.length).toBeLessThanOrEqual(STICKY_PAIR_LINE_BUDGET);
      }
    }
  });

  it('project-delays project/years fields stay within a stage-width character budget', () => {
    const PROJECT_BUDGET = 60;
    const YEARS_BUDGET = 24;
    for (const beat of getAllKineticBeats()) {
      if (beat.kind !== 'project-delays') {
        continue;
      }
      for (const row of beat.projects) {
        expect(row.project.length).toBeLessThanOrEqual(PROJECT_BUDGET);
        expect(row.years.length).toBeLessThanOrEqual(YEARS_BUDGET);
      }
    }
  });

  it('VIP ambulance is in act1 before Chalta Hai flood (5 / 10 / 15 then Chalta Hai)', () => {
    const ids = getAllKineticBeats().map((b) => b.id);
    const bribe = ids.indexOf('a1-p4');
    const vip = ids.indexOf('a1-vip-ambulance');
    const vipCh = ids.indexOf('a1-vip-ch');
    const aqi = ids.indexOf('a1-aqi');
    const aqiCh = ids.indexOf('a1-aqi-ch');
    const flood = ids.indexOf('a1-flood');
    expect(bribe).toBeGreaterThanOrEqual(0);
    expect(vip).toBeGreaterThan(bribe);
    expect(vipCh).toBeGreaterThan(vip);
    expect(aqi).toBeGreaterThan(vipCh);
    expect(aqiCh).toBeGreaterThan(aqi);
    expect(flood).toBeGreaterThan(aqiCh);
    expect(ids).not.toContain('a3-vip-ambulance');
    expect(ids).not.toContain('a3-vip-ch');

    const vipBeat = getAllKineticBeats().find((b) => b.id === 'a1-vip-ambulance');
    expect(vipBeat && vipBeat.kind === 'sticky-pair').toBe(true);
    if (vipBeat && vipBeat.kind === 'sticky-pair') {
      expect(vipBeat.fixed).toMatch(/Ambulance stuck for VIP/i);
      expect(vipBeat.steps.map((s) => s.text)).toEqual([
        '5 minutes.',
        '10 minutes.',
        '15 minutes.',
      ]);
    }
    const ch = getAllKineticBeats().find((b) => b.id === 'a1-vip-ch');
    expect(ch && ch.kind === 'line' && ch.text).toBe('Chalta Hai.');
  });

  it('AQI counter ramps 100→500 orange-to-red before Chalta Hai flood', () => {
    const aqi = getAllKineticBeats().find((b) => b.id === 'a1-aqi');
    expect(aqi && aqi.kind === 'sticky-pair').toBe(true);
    if (!(aqi && aqi.kind === 'sticky-pair')) {
      return;
    }
    expect(aqi.mode).toBe('swap-lead');
    expect(aqi.fixed).toBe('AQI');
    expect(aqi.fixedRole).toBe('slam');
    expect(aqi.stepRole).toBe('slam');
    expect(aqi.steps.map((s) => s.text)).toEqual(['100', '200', '300', '400', '500']);
    expect(aqi.steps.every((s) => s.hold === 1)).toBe(true);
    // Orange → red ramp (only intentional color exception in monochrome film)
    const colors = aqi.steps.map((s) => s.color);
    expect(colors.every((c) => typeof c === 'string' && c.startsWith('#'))).toBe(true);
    expect(colors.map((c) => c!.toLowerCase())).toEqual([
      '#f59e0b',
      '#f97316',
      '#fb7185',
      '#f87171',
      '#ef4444',
    ]);
    // Green channel falls orange→red; tail stays bright (no dark maroon)
    const greens = colors.map((c) => parseInt(c!.slice(3, 5), 16));
    expect(greens[0]!).toBeGreaterThan(greens[greens.length - 1]!);
    expect(colors[colors.length - 1]!.toLowerCase()).toBe('#ef4444');
    const ch = getAllKineticBeats().find((b) => b.id === 'a1-aqi-ch');
    expect(ch && ch.kind === 'line' && ch.text).toBe('Chalta Hai.');
    // Only AQI sticky-pair may carry step colors (monochrome guard)
    const coloredPairs = getAllKineticBeats()
      .filter(
        (beat) =>
          beat.kind === 'sticky-pair' && beat.steps.some((step) => step.color != null),
      )
      .map((beat) => beat.id);
    expect(coloredPairs).toEqual(['a1-aqi']);
  });

  it('Gandhi quote role hierarchy is quote ≥ body and attribution whisper', () => {
    const g = getAllKineticBeats().find((b) => b.id === 'a6-gandhi');
    expect(g && g.kind === 'quote').toBe(true);
    if (g && g.kind === 'quote') {
      expect(g.textRole === 'body' || g.textRole === 'close').toBe(true);
      expect(g.attrRole).toBe('whisper');
    }
  });

  it('divide act frames political tussle as China-vs-media distraction', () => {
    const ids = getAllKineticBeats().map((b) => b.id);
    const china = ids.indexOf('a3-china');
    const media = ids.indexOf('a3-media');
    const lr = ids.indexOf('a3-lr');
    expect(china).toBeGreaterThanOrEqual(0);
    expect(media).toBeGreaterThan(china);
    expect(lr).toBeGreaterThan(media);
    expect(ids).not.toContain('a3-waiting');
    expect(ids).not.toContain('a3-argue');
    const byId = Object.fromEntries(getAllKineticBeats().map((b) => [b.id, b]));
    expect(byId['a3-china']?.kind === 'line' && byId['a3-china'].text).toMatch(/China/i);
    if (byId['a3-china']?.kind === 'line') {
      expect(byId['a3-china'].text).toBe('While China races ahead…');
      expect(byId['a3-china'].motion).toBe('rise');
      expect(byId['a3-china'].wide).toBe(true);
      expect(byId['a3-china'].hold).toBe(holdFor('While China races ahead…', 'body'));
    }
    expect(byId['a3-media']?.kind === 'line' && byId['a3-media'].text).toMatch(/media/i);
  });

  it('Abki baar pair lands after India and before endcard', () => {
    const abki = getAllKineticBeats().find((b) => b.id === 'a6-abki');
    expect(abki && abki.kind === 'pair').toBe(true);
    if (abki && abki.kind === 'pair') {
      expect(abki.lead).toBe('Abki baar…');
      expect(abki.hit).toBe('development ki sarkar…');
      expect(abki.leadRole).toBe('slam');
      expect(abki.hitRole).toBe('close');
      expect(abki.leadMotion).toBe('pop');
      expect(abki.hitMotion).toBe('pop');
      expect(abki.wide).toBe(true);
      expect(abki.heartbeat).toBe(true);
      expect(abki.holdLead).toBe(holdFor('Abki baar…', 'body'));
      expect(abki.holdHit).toBe(holdFor('development ki sarkar…', 'body'));
    }
    const ids = getAllKineticBeats().map((b) => b.id);
    expect(ids.indexOf('a6-abki')).toBeGreaterThan(ids.indexOf('a6-india'));
    expect(ids.indexOf('a6-endcard')).toBeGreaterThan(ids.indexOf('a6-abki'));
    // Project-delays already ran mid-film before a2-flood
    expect(ids.indexOf('a2-project-delays')).toBeLessThan(ids.indexOf('a2-flood'));
    expect(ids.indexOf('a2-project-delays')).toBeLessThan(ids.indexOf('a6-abki'));
  });
});

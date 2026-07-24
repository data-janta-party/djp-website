/**
 * Kinetic speech film — “The System We Deserve” (v6 beat-locked)
 *
 * All holds / durations are **beat counts** on the extracted 140 BPM grid
 * (see kinetic-speech-beatmap.ts + kinetic-speech-beats.json).
 * GSAP schedules via atBeat(i) so text, pulses, and loading ticks land only
 * on musical beats — never on random energy spikes.
 *
 * Arc: Chalta Hai → Delay (deadline → project cards → flood) → Divide →
 *      Demand → Imagine → Gandhi / We are the change → Virtues → India →
 *      Abki baar → endcard Sources + CTA
 */

import {
  atBeat,
  b,
  holdFor,
  isDownbeat,
  isKickBeat,
  KINETIC_BEAT,
  KINETIC_OFFSET_SEC,
  type BeatRole,
} from '@/lib/data/kinetic-speech-beatmap';

export const kineticSpeechAudioSrc = '/audio/speech-trailer.mp3' as const;

/** One pass of the track — story finishes inside this. */
export const kineticSpeechAudioDurationSec = 142 as const;

/**
 * Small timeline tail after story + endcard hold (enter offset + settle buffer).
 * Shared by visual-end and film-duration so sync/onComplete stay aligned.
 */
export const kineticSpeechVisualTailSec = 0.4 as const;

export type TypeRole = 'whisper' | 'body' | 'slam' | 'slam-xl' | 'brand' | 'micro-grid' | 'close';

export type MotionVerb =
  | 'pop'
  | 'rise'
  | 'hardcut'
  | 'slide-l'
  | 'slide-r'
  | 'replace'
  | 'pulse'
  | 'dim';

/** Film stage is always pure black (monochrome). */
export type StageBg = 'charcoal';

export type StickyStep = {
  suffix: string;
  /** Hold in beats */
  hold: number;
  /** Loading-dot duration in beats (steps on each beat) */
  dots?: number;
  role?: TypeRole;
};

/**
 * One featured delayed-project card (name + years).
 * Kinetic manifesto — approximate public delays, not a MoSPI footnote table.
 */
export type DelayedProjectFact = {
  project: string;
  years: string;
};

/** Attribution link for endcard Sources hover card (music + delay figures). */
export type DelayedProjectSource = {
  label: string;
  href: string;
};

/**
 * Featured delayed India projects for the kinetic card sequence.
 * Lands mid-film right before the Delayed/Chalta Hai spam flood.
 * Short punchy names; years-only (no cost overruns).
 */
export const DELAYED_PROJECT_FACTS = [
  { project: 'Bullet Train', years: '5 years' },
  { project: 'Delhi–Mumbai Expressway', years: '4 years' },
  { project: '5th-gen fighter (AMCA)', years: '10+ years' },
  { project: 'Bengaluru Metro', years: '5 years' },
  { project: 'Jewar Airport (Noida Intl.)', years: '5 years' },
  { project: 'Udhampur-Baramulla Rail', years: '21 years' },
] as const satisfies readonly DelayedProjectFact[];

/**
 * Clickable sources for delay figures — endcard Sources hover only (not mid-film).
 * One reputable reference per featured delayed project; MoSPI as general context.
 * Order loosely follows DELAYED_PROJECT_FACTS.
 */
export const DELAYED_PROJECT_SOURCES = [
  {
    // TOI: 4+ year slip, cost overrun reporting
    label: 'Bullet Train (TOI)',
    href: 'https://timesofindia.indiatimes.com/business/india-business/delay-of-over-four-years-pushes-up-bullet-train-project-cost-by-83/articleshow/126316040.cms',
  },
  {
    // Gadkari / NHAI revised completion (Mint) — delay reporting, not a project overview
    label: 'Expressway (Mint)',
    href: 'https://www.livemint.com/news/delhimumbai-expressway-deadline-revised-completion-date-union-minister-road-transport-and-highways-nitin-gadkari-11722493320658.html',
  },
  {
    // idrw: first flight delayed to 2032; prototype rollout slips to 2030
    label: 'AMCA (idrw)',
    href: 'https://idrw.org/amca-first-flight-delayed-to-2032-indias-5th-gen-stealth-fighter-prototype-rollout-slips-to-2030/',
  },
  {
    // Continuous Pink / Blue line deadline slips (Metro Rail News)
    label: 'Bengaluru Metro (Metro Rail News)',
    href: 'https://metrorailnews.in/bengaluru-metro-amid-continuous-delays-new-deadlines-announced-for-pink-and-blue-line/',
  },
  {
    // Full cost + every missed deadline timeline (News18)
    label: 'Jewar (News18)',
    href: 'https://www.news18.com/cities/noida/jewar-airport-full-cost-every-missed-deadline-and-the-complete-timeline-from-2001-to-march-2026-ws-l-10000330.html',
  },
  {
    label: 'USBRL (Wikipedia)',
    href: 'https://www.newindianexpress.com/india/2023/Aug/31/delayed-railway-projects-up-from-56-to-98-in-1-year-2610262.html',
  },
] as const satisfies readonly DelayedProjectSource[];

/** Trailer music credit (Pixabay kinetic promo track). */
export const KINETIC_SPEECH_MUSIC_SOURCE = {
  label: 'Music (Pixabay)',
  href: 'https://pixabay.com/music/main-title-lifestyle-sport-tribal-stomping-kinetic-promo-music-131761/',
} as const satisfies DelayedProjectSource;

/**
 * Endcard Sources hover card: music credit + delayed-project references.
 * Mid-film project-delays cards do not show sources (endcard only).
 */
export const KINETIC_ENDCARD_SOURCES = [
  KINETIC_SPEECH_MUSIC_SOURCE,
  ...DELAYED_PROJECT_SOURCES,
] as const satisfies readonly DelayedProjectSource[];

/**
 * hold / holdLead / holdHit / duration / exitHold are all **beat counts**.
 */
export type KineticBeat =
  | {
      kind: 'line';
      id: string;
      text: string;
      role: TypeRole;
      motion: MotionVerb;
      hold: number;
      dim?: boolean;
      emphasisWord?: string;
      /** Heartbeat scale pulse on kick beats while held (default true for slam). */
      heartbeat?: boolean;
      /** Tiranga gradient on the word (saffron / white / green). */
      tiranga?: boolean;
      /**
       * Wider stage clamp for long multi-word thesis lines (Demand etc.).
       * Default short-punch max-w is too narrow for 6–9 word sentences.
       */
      wide?: boolean;
    }
  | {
      kind: 'pair';
      id: string;
      lead: string;
      hit: string;
      holdLead: number;
      holdHit: number;
      leadRole?: TypeRole;
      hitRole?: TypeRole;
      leadMotion?: MotionVerb;
      hitMotion?: MotionVerb;
      lock?: boolean;
      pulseHit?: boolean;
      heartbeat?: boolean;
      /**
       * Wider lead clamp for multi-word connective tissue (Demand “and we want it…”).
       * Hit stays short-punch slam width unless multi-word on a wide pair
       * (e.g. Abki “development ki sarkar…” shares thesis clamp; Demand “now.” stays punch).
       */
      wide?: boolean;
    }
  | {
      kind: 'slide-pair';
      id: string;
      left: string;
      right: string;
      hold: number;
      /** Horizontal (default) or vertical opposition layout. */
      axis?: 'x' | 'y';
      /** Multi-beat tug-of-war on the grid (Left↔Right / North↕South). */
      tussle?: boolean;
    }
  | {
      kind: 'sticky';
      id: string;
      prefix: string;
      steps: readonly StickyStep[];
      prefixRole?: TypeRole;
      exitHold?: number;
      /**
       * Beats to hold the prefix alone before the first suffix.
       * Default: `0` when any step has a visible suffix (co-plant, e.g. Deadline),
       * `1` for empty-suffix + dots (Still waiting).
       * Set explicitly for staggered reveals (e.g. Cough → Cough Cough ≈ 1s at b(2)).
       */
      prefixHold?: number;
      /**
       * Cough jolt motion: each word heaves (y + scale + micro-rotate) and the
       * sticky root shakes — reads as a double cough, not a soft sticky morph.
       */
      cough?: boolean;
      /** Force single horizontal row (Deadline + suffix + dots). */
      inline?: boolean;
      /**
       * Long Demand-style stickies: stage max-w + gutters; prefix stays on the
       * same line as the suffix (flex-nowrap). Multi-word suffixes may soft-wrap
       * inside the suffix slot. Short Deadline stickies stay unbounded nowrap
       * (`inline` only).
       */
      wide?: boolean;
      /**
       * Scale-thump the sticky root on each kick while held (deadline / waiting).
       * Enter pop is skipped via scheduleHeartbeat’s startBeat guard.
       */
      heartbeat?: boolean;
    }
  | {
      kind: 'sticky-pair';
      id: string;
      mode: 'swap-lead' | 'swap-hit';
      fixed: string;
      steps: readonly {
        text: string;
        hold: number;
        /** Optional intentional color (AQI ramp only — film is monochrome otherwise). */
        color?: string;
      }[];
      fixedRole?: TypeRole;
      stepRole?: TypeRole;
      pulseFixed?: boolean;
      /**
       * Long inventory lines: smaller mobile type so full project names fit.
       * Short pairs (office visits, VIP minutes) omit this for readable body size.
       */
      dense?: boolean;
    }
  | {
      /**
       * Full-stage word-spam wall (e.g. CHALTA HAI / Delayed.).
       * Labels cycle via `index % words.length`.
       */
      kind: 'flood';
      id: string;
      count: number;
      /** Flood duration in beats */
      duration: number;
      shake?: boolean;
      words: readonly [string, ...string[]];
    }
  | {
      kind: 'silence';
      id: string;
      /** Silence in beats (still advances the grid) */
      duration: number;
    }
  | {
      kind: 'cloud';
      id: string;
      words: readonly string[];
      duration: number;
    }
  | {
      /** One word at a time, beat-synced (virtue list). */
      kind: 'rapid';
      id: string;
      words: readonly string[];
      /** Beats each word stays on screen (default 1). */
      holdEach?: number;
      role?: TypeRole;
    }
  | {
      /** Quote + attribution on one slide (Gandhi close). */
      kind: 'quote';
      id: string;
      text: string;
      attribution: string;
      hold: number;
      textRole?: TypeRole;
      attrRole?: TypeRole;
    }
  | {
      /**
       * Mid-film delayed projects: centered card sequence (name / Delayed. / years),
       * then a slam "1000+ more." Sources live on the endcard hover card only.
       */
      kind: 'project-delays';
      id: string;
      projects: readonly DelayedProjectFact[];
      /** Per-project hold in beats (readable, not a blur crawl). */
      holdEach?: number;
      /** Slam after the featured list, e.g. "1000+ more." */
      moreLabel: string;
      /** Hold for the more slam line (beats). */
      moreHold: number;
    }
  | {
      /**
       * Finale: word reels (virtues → data.janta.party), then Join CTA.
       * Join becomes interactive after reels settle; music may still tail out.
       */
      kind: 'endcard';
      id: string;
    };

export type KineticAct = {
  id: string;
  label: string;
  beats: readonly KineticBeat[];
};

export type LaidOutBeat = {
  beat: KineticBeat;
  /** Grid beat index where this event starts (text appears on this beat). */
  startBeat: number;
  /** Grid beat index where this event ends (exclusive for next event). */
  endBeat: number;
};

export const kineticSpeechCopy = {
  poster: {
    kicker: 'A film about the system we got used to',
    title: 'Every Indian knows this feeling.',
    play: 'Play',
    reducedMotionTitle: 'The System We Deserve',
  },
  endcard: {
    url: 'data.janta.party',
    join: 'Join the movement',
    sources: 'Sources',
  },

  controls: {
    mute: 'Mute',
    unmute: 'Unmute',
    /** Shown when browser autoplay blocks unmuted audio until a gesture. */
    tapForSound: 'Tap for sound',
    replay: 'Replay',
    pause: 'Pause',
    play: 'Play',
    skip: 'Skip to end',
    home: 'Back home',
  },
  a11y: {
    region: 'Kinetic digital speech',
    loading: 'Loading speech',
    playing: 'Speech playing',
    paused: 'Speech paused',
    ended: 'Speech ended',
    transcript: 'Full speech transcript',
    soundBlocked: 'Sound blocked — tap to enable audio',
  },
} as const;

export const kineticSpeechJoinHref = '/#volunteer' as const;
export const kineticSpeechUrlHref = 'https://data.janta.party' as const;

/**
 * Visual endcard dwell after story start (seconds) — roller settle + join.
 * Film timeline then holds silently until the track ends so music is not cut.
 */
export const kineticSpeechEndcardHoldSec = 11 as const;

/** Finale domain parts locked into the three word reels (data.janta.party). */
export const kineticSpeechRollerSlots = ['data', 'janta', 'party'] as const;



/**
 * How many intermediate reel cells before the lock glyph.
 * Discrete beat snaps (readable step-through, not continuous blur).
 */
export const kineticSpeechRollerSpinDepth = 5 as const;

/** Hold beats per vision word while all three slots revolve adjectives. */
export const kineticSpeechRollerVirtueHoldBeats = 2 as const;

/**
 * Beats of adjective revolving before domain locks begin.
 * = (spinDepth + 1 cells) × hold so each word including the last is readable.
 */
export const kineticSpeechRollerVirtueIndiaBeats =
  (kineticSpeechRollerSpinDepth + 1) * kineticSpeechRollerVirtueHoldBeats;

/** Beats between successive domain locks (data → janta → party). */
export const kineticSpeechRollerDomainLockGapBeats = 2 as const;

/**
 * Reel cell height in em — must match `.kinetic-reel-cell` / window in globals.css.
 * Join unlocks after adjective phase + domain locks + 1 beat hold.
 */
export const kineticSpeechReelCellEm = 1.15 as const;

/** Beats from endcard start until Join unlock (adjective steps + domain locks + settle). */
export const kineticSpeechRollerSettleBeats =
  kineticSpeechRollerVirtueIndiaBeats +
  kineticSpeechRollerSlots.length * kineticSpeechRollerDomainLockGapBeats +
  1;

/** Rapid close virtues — one per beat. */
export const kineticSpeechVirtues = [
  'cleaner',
  'safer',
  'greener',
  'healthier',
  'accountable',
  'transparent',
  'auditable',
  'quieter',
  'happier',
  'inclusive',
  'walkable',
  'bikeable',
  'faster',
] as const;

/**
 * Words the finale reels spin through (virtues + extras for vision list).
 * Kept separate from rapid-list length so story beat budget stays stable.
 */
export const kineticSpeechRollerVirtues = [
  'traceable',
  'trackable',
  ...kineticSpeechVirtues,
] as const;

/**
 * Solo-prefix beats before the first sticky suffix (see `prefixHold` on sticky).
 */
export function stickyPrefixHoldBeats(
  beat: Extract<KineticBeat, { kind: 'sticky' }>,
): number {
  if (beat.prefixHold != null) return beat.prefixHold;
  const hasVisibleSuffix = beat.steps.some((s) => s.suffix.length > 0);
  // Visible suffix: co-plant (0). Empty-suffix + dots: plant prefix 1 beat first.
  return hasVisibleSuffix ? 0 : 1;
}

/**
 * Beat cost of one director event (integer/half beats).
 */
export function beatDurationBeats(beat: KineticBeat): number {
  switch (beat.kind) {
    case 'line':
      return beat.hold;
    case 'pair':
      return beat.holdLead + beat.holdHit;
    case 'slide-pair':
      return beat.hold;
    case 'sticky': {
      let n = stickyPrefixHoldBeats(beat);
      for (const step of beat.steps) {
        n += step.hold + (step.dots ?? 0);
      }
      n += beat.exitHold ?? 0;
      return n;
    }
    case 'sticky-pair': {
      let n = 1; // plant fixed
      for (const step of beat.steps) {
        n += step.hold;
      }
      return n;
    }
    case 'flood':
      return beat.duration;
    case 'silence':
      return beat.duration;
    case 'cloud':
      return beat.duration;
    case 'rapid':
      return beat.words.length * (beat.holdEach ?? 1);
    case 'quote':
      return beat.hold;
    case 'project-delays': {
      const holdEach = beat.holdEach ?? 3;
      return beat.projects.length * holdEach + beat.moreHold;
    }
    case 'endcard':
      return 0;
    default:
      return 0;
  }
}

/** Major punches should land on kick (heartbeat) beats, not arbitrary grid slots. */
function wantsKickSnap(beat: KineticBeat): boolean {
  if (beat.kind === 'flood') {
    return true;
  }
  if (beat.kind === 'line' && (beat.role === 'slam-xl' || beat.role === 'brand')) {
    return true;
  }
  if (
    beat.kind === 'line' &&
    (beat.id === 'a6-change' || beat.id === 'a6-action' || beat.id === 'a6-india')
  ) {
    return true;
  }
  return false;
}

/** Advance bi to the next kick beat (or downbeat fallback). */
function snapToKickBeat(bi: number): number {
  const i = Math.ceil(bi - 1e-9);
  // Already on a kick — keep it
  if (isKickBeat(i) || (i === bi && isKickBeat(Math.floor(bi)))) {
    if (isKickBeat(Math.round(bi))) {
      return Math.round(bi);
    }
  }
  for (let n = 0; n < 16; n += 1) {
    if (isKickBeat(i + n)) {
      return i + n;
    }
  }
  // Fallback: next downbeat
  for (let n = 0; n < 8; n += 1) {
    if (isDownbeat(i + n)) {
      return i + n;
    }
  }
  return i;
}

/**
 * Lay out the entire film on the beat grid.
 * Starts at beat 3 — first solid kick of the groove (audio already playing).
 * Floods / slam-xl / brand snap forward to the next kick beat.
 */
export function layoutKineticSpeech(startBeat = 3): {
  items: LaidOutBeat[];
  endBeat: number;
} {
  let bi = startBeat;
  const items: LaidOutBeat[] = [];
  for (const beat of getAllKineticBeats()) {
    if (wantsKickSnap(beat)) {
      bi = snapToKickBeat(bi);
    }
    const dur = beatDurationBeats(beat);
    items.push({ beat, startBeat: bi, endBeat: bi + dur });
    bi += dur;
  }
  return { items, endBeat: bi };
}

/**
 * Director beat list — every hold is a beat count on the 140 BPM grid.
 */
const kineticSpeechActs: readonly KineticAct[] = [
  // ── ACT 1 — Chalta Hai (lands on first solid kick; no cold-open silence) ─
  {
    id: 'act1',
    label: 'Chalta Hai',
    beats: [
      {
        kind: 'pair',
        id: 'a1-p1',
        lead: 'Footpath broken.',
        hit: 'Chalta Hai.',
        holdLead: holdFor('Footpath broken.', 'body'),
        holdHit: holdFor('Chalta Hai.', 'slam-word'),
        heartbeat: true,
      },
      {
        kind: 'pair',
        id: 'a1-p2',
        lead: 'Garbage on the street.',
        hit: 'Chalta Hai.',
        holdLead: holdFor('Garbage on the street.', 'body'),
        holdHit: holdFor('Chalta Hai.', 'slam-word'),
        heartbeat: true,
      },
      {
        // Snug holds (under holdFor body) — cold-open density + music-tail budget
        kind: 'pair',
        id: 'a1-rich',
        lead: 'Rich getting richer.',
        hit: 'Chalta Hai.',
        holdLead: 2,
        holdHit: holdFor('Chalta Hai.', 'slam-word'),
        heartbeat: true,
      },
      {
        kind: 'pair',
        id: 'a1-poor',
        lead: 'Poor getting poorer.',
        hit: 'Chalta Hai.',
        holdLead: 2,
        holdHit: holdFor('Chalta Hai.', 'slam-word'),
        heartbeat: true,
      },
      {
        kind: 'pair',
        id: 'a1-dengue',
        lead: '1 lakh dengue cases.',
        hit: 'Chalta Hai.',
        holdLead: 3,
        holdHit: holdFor('Chalta Hai.', 'slam-word'),
        heartbeat: true,
      },
      {
        kind: 'pair',
        id: 'a1-food',
        lead: 'Food adulteration.',
        hit: 'Chalta Hai.',
        holdLead: holdFor('Food adulteration.', 'body'),
        holdHit: holdFor('Chalta Hai.', 'slam-word'),
        heartbeat: true,
      },
      {
        kind: 'pair',
        id: 'a1-flood-cities',
        lead: 'Same cities flooding every year.',
        hit: 'Chalta Hai.',
        // Full body hold — five-word lead needs air before the slam hit
        holdLead: holdFor('Same cities flooding every year.', 'body'),
        holdHit: holdFor('Chalta Hai.', 'slam-word'),
        heartbeat: true,
      },
      {
        // Government office. + 1→5 visits on successive beats, then Chalta Hai.
        kind: 'sticky-pair',
        id: 'a1-office',
        mode: 'swap-hit',
        fixed: 'Government office.',
        fixedRole: 'body',
        stepRole: 'body',
        steps: [
          { text: '1 visit.', hold: b(1) },
          { text: '2 visits.', hold: b(1) },
          { text: '3 visits.', hold: b(1) },
          { text: '4 visits.', hold: b(1) },
          { text: '5 visits.', hold: b(1) },
        ],
      },
      {
        kind: 'line',
        id: 'a1-office-ch',
        text: 'Chalta Hai.',
        role: 'slam',
        motion: 'pop',
        hold: holdFor('Chalta Hai.', 'slam-word'),
        heartbeat: true,
      },
      {
        kind: 'pair',
        id: 'a1-p4',
        lead: 'Have to bribe.',
        hit: 'Chalta Hai.',
        holdLead: holdFor('Have to bribe.', 'body'),
        holdHit: holdFor('Chalta Hai.', 'slam-word'),
        heartbeat: true,
      },
      // VIP convoy: ambulance wait 5 → 10 → 15 minutes, then Chalta Hai — before the flood.
      {
        kind: 'sticky-pair',
        id: 'a1-vip-ambulance',
        mode: 'swap-hit',
        fixed: 'Ambulance stuck for VIP.',
        fixedRole: 'body',
        stepRole: 'body',
        pulseFixed: true,
        steps: [
          { text: '5 minutes.', hold: b(2) },
          { text: '10 minutes.', hold: b(2) },
          { text: '15 minutes.', hold: b(2) },
        ],
      },
      {
        kind: 'line',
        id: 'a1-vip-ch',
        text: 'Chalta Hai.',
        role: 'slam',
        motion: 'pop',
        hold: holdFor('Chalta Hai.', 'slam-word'),
        heartbeat: true,
      },
      // AQI death spiral (only intentional color ramp: orange → red) then Chalta Hai → flood
      {
        kind: 'sticky-pair',
        id: 'a1-aqi',
        mode: 'swap-lead',
        fixed: 'AQI',
        fixedRole: 'slam',
        stepRole: 'slam',
        steps: [
          // Orange → red; tail stays bright enough on pure black for ~AA text
          { text: '100', hold: b(1), color: '#f59e0b' },
          { text: '200', hold: b(1), color: '#f97316' },
          { text: '300', hold: b(1), color: '#fb7185' },
          { text: '400', hold: b(1), color: '#f87171' },
          { text: '500', hold: b(1), color: '#ef4444' },
        ],
      },
      {
        // Solo "Cough" → after ~1s (b(2) @ 140 BPM ≈ 0.86s) second "Cough"
        // cough: heave + root shake on each word; no exitHold — hardcut into Chalta Hai
        kind: 'sticky',
        id: 'a2-cough-sticky',
        prefix: 'Cough',
        inline: true,
        cough: true,
        prefixHold: b(2),
        steps: [{ suffix: 'Cough', hold: b(2) }],
      },
      {
        kind: 'line',
        id: 'a1-aqi-ch',
        text: 'Chalta Hai.',
        role: 'slam',
        motion: 'pop',
        hold: holdFor('Chalta Hai.', 'slam-word'),
        heartbeat: true,
      },
      {
        kind: 'flood',
        id: 'a1-flood',
        words: ['CHALTA HAI'],
        count: 56,
        duration: b(8),
      },
      // Flood hardcuts into the delay machine (no breath — budget for cough prefixHold)
    ],
  },

  // ── ACT 2 — Delay machine ──────────────────────────────────────────
  {
    id: 'act2',
    label: 'The delay machine',
    beats: [
      {
        kind: 'line',
        id: 'a2-announced',
        text: 'Project announced.',
        role: 'body',
        motion: 'replace',
        hold: holdFor('Project announced.', 'body'),
        wide: true,
      },
      {
        kind: 'line',
        id: 'a2-ribbon',
        text: 'Ribbon cut.',
        role: 'body',
        motion: 'replace',
        hold: holdFor('Ribbon cut.', 'body'),
      },
      {
        kind: 'line',
        id: 'a2-headline',
        text: 'Headline printed.',
        role: 'body',
        motion: 'replace',
        hold: holdFor('Headline printed.', 'body'),
        wide: true,
      },
      {
        kind: 'sticky',
        id: 'a2-deadline-sticky',
        prefix: 'Deadline',
        inline: true,
        // Kick thumps on the whole phrase while dots hop on every whole beat
        heartbeat: true,
        steps: [
          { suffix: 'promised', hold: b(2), dots: b(3) },
          { suffix: 'extended', hold: b(2), dots: b(3) },
          // Extra beat so “extended again” is readable before the dots cycle
          { suffix: 'extended again', hold: b(3), dots: b(3) },
        ],
        exitHold: b(1),
      },
      {
        kind: 'sticky',
        id: 'a2-waiting',
        prefix: 'Still waiting',
        // Same body role as Deadline sticky so “Still waiting…” matches “Deadline extended…” size
        prefixRole: 'body',
        inline: true,
        heartbeat: true,
        steps: [{ suffix: '', hold: b(1), dots: b(3), role: 'body' }],
        exitHold: b(1),
      },
      /**
       * Kinetic delayed-project cards — one project at a time (name / Delayed. / years),
       * then "1000+ more." Sources only on endcard hover. Immediately before the spam flood.
       */
      {
        kind: 'project-delays',
        id: 'a2-project-delays',
        projects: DELAYED_PROJECT_FACTS,
        holdEach: b(3),
        moreLabel: '1000+ more.',
        moreHold: b(3),
      },
      /**
       * Classic full-screen spam flood — Delayed. / CHALTA HAI / Chalta Hai.
       * Follows the featured project-delay cards.
       */
      {
        kind: 'flood',
        id: 'a2-flood',
        words: ['Delayed.', 'CHALTA HAI', 'Chalta Hai.'],
        count: 56,
        duration: b(8),
        shake: true,
      },
      {
        kind: 'line',
        id: 'a2-no',
        text: 'NO.',
        role: 'slam-xl',
        motion: 'hardcut',
        hold: holdFor('NO.', 'slam-xl'),
        heartbeat: true,
      },
      {
        kind: 'line',
        id: 'a2-nahi',
        text: 'Nahi chalta hai.',
        role: 'close',
        motion: 'pop',
        hold: holdFor('Nahi chalta hai.', 'thesis'),
        heartbeat: true,
        wide: true,
      },
      // Breath into divide act
      { kind: 'silence', id: 'a2-stop', duration: b(1) },
    ],
  },

  // ── ACT 3 — Divide & equal harm ────────────────────────────────────
  {
    id: 'act3',
    label: 'Divide & distract',
    beats: [
      {
        kind: 'line',
        id: 'a3-china',
        text: 'While China races ahead…',
        role: 'body',
        motion: 'rise',
        hold: holdFor('While China races ahead…', 'body'),
        wide: true,
      },
      {
        kind: 'line',
        id: 'a3-media',
        text: 'Our media keeps us busy with…',
        role: 'body',
        motion: 'rise',
        hold: holdFor('Our media keeps us busy with…', 'body'),
        wide: true,
      },
      {
        kind: 'slide-pair',
        id: 'a3-lr',
        left: 'Left.',
        right: 'Right.',
        hold: b(6),
        axis: 'x',
        tussle: true,
      },
      {
        kind: 'slide-pair',
        id: 'a3-ns',
        left: 'North.',
        right: 'South.',
        hold: b(6),
        axis: 'y',
        tussle: true,
      },
      { kind: 'slide-pair', id: 'a3-rc', left: 'Religion.', right: 'Caste.', hold: b(4) },
      {
        kind: 'line',
        id: 'a3-equal',
        text: 'Bad governance affects everyone.',
        role: 'close',
        motion: 'rise',
        hold: holdFor('Bad governance affects everyone.', 'thesis'),
        heartbeat: true,
        wide: true,
      },
    ],
  },

  // ── ACT 4 — Demand (Divide → Demand → Imagine) ────────────────────
  // Thesis bookend + solo "We want" + rapid list + pair slam "now".
  // Thesis enough uses b(7). Film still ends with music at 142s.
  {
    id: 'act4',
    label: 'Demand',
    beats: [
      {
        // Multi-word: close role (not slam) + hardcut punch + thesis hold + wide clamp
        kind: 'line',
        id: 'a4b-enough',
        text: 'Enough is enough.',
        role: 'close',
        motion: 'hardcut',
        // Thesis floor is 5; +2 beats (~0.9s) for thesis weight before We want
        hold: b(7),
        heartbeat: true,
        wide: true,
      },
      {
        // Solo plant — then the three demands flash as rapid words
        kind: 'line',
        id: 'a4b-want',
        text: 'We want',
        role: 'close',
        motion: 'pop',
        hold: holdFor('We want', 'body'),
        heartbeat: true,
        wide: true,
      },
      {
        kind: 'rapid',
        id: 'a4b-want-list',
        words: ['development', 'no corruption', 'accountability'],
        holdEach: 2,
        role: 'body',
      },
      {
        // Lead close + slam "now." punch (pair total hold = former thesis line budget)
        // wide: multi-word lead uses thesis clamp (not short-punch 14ch pair default)
        kind: 'pair',
        id: 'a4b-now',
        lead: 'and we want it…',
        hit: 'now.',
        holdLead: holdFor('and we want it…', 'body'),
        holdHit: holdFor('now.', 'slam-word'),
        leadRole: 'close',
        hitRole: 'slam',
        pulseHit: true,
        heartbeat: true,
        wide: true,
      },
      // No extra silence — Imagine slam opens on the next grid kick.
    ],
  },

  // ── ACT 5 — Imagine / lived after (street language, not jargon stack) ─
  {
    id: 'act5',
    label: 'Imagine',
    beats: [
      {
        kind: 'line',
        id: 'a5-open',
        text: 'Imagine.',
        role: 'slam',
        motion: 'pop',
        hold: holdFor('Imagine.', 'slam-word'),
        heartbeat: true,
      },
      // Before → after: garbage cleaned (multi-word hit = close + wide, not slam punch width)
      {
        kind: 'pair',
        id: 'a5-garbage',
        lead: 'Garbage on the street.',
        hit: 'Cleaned. Caught. Fixed.',
        leadRole: 'body',
        hitRole: 'close',
        // Slightly longer than cold-open snug so reverse scenes can be read
        holdLead: b(3),
        holdHit: b(3),
        wide: true,
        heartbeat: true,
      },
      // AQI process: stable subject + morphing state (avoids "climbing / Issue fixed" contradiction)
      {
        kind: 'sticky-pair',
        id: 'a5-aqi',
        mode: 'swap-hit',
        fixed: 'AQI',
        fixedRole: 'slam',
        stepRole: 'body',
        steps: [
          // Slight air over former snug holds so process is readable
          { text: 'climbing.', hold: b(1.5) },
          { text: 'Source detected.', hold: b(2) },
          { text: 'Issue fixed.', hold: b(2) },
        ],
      },
      // Project lifecycle process (morph inventory — not slam punches)
      {
        kind: 'sticky-pair',
        id: 'a5-project',
        mode: 'swap-hit',
        fixed: 'A project announced.',
        fixedRole: 'body',
        stepRole: 'body',
        steps: [
          { text: 'Track against time.', hold: b(2) },
          { text: 'Accountability set.', hold: b(2) },
          { text: 'Updated monthly.', hold: b(2) },
          { text: 'Project finished.', hold: b(2) },
        ],
      },
      {
        kind: 'sticky',
        id: 'a5-every',
        prefix: 'Every',
        prefixRole: 'body',
        inline: true,
        steps: [
          // Still snappy morph, +½ beat so project/deadline/rupee register
          { suffix: 'project.', hold: b(1.5) },
          { suffix: 'deadline.', hold: b(1.5) },
          { suffix: 'rupee.', hold: b(1.5) },
        ],
        // No exitHold — hardcut into Public / Honest / On time triad
      },
      {
        kind: 'line',
        id: 'a5-public',
        text: 'Public.',
        role: 'slam',
        motion: 'pop',
        hold: holdFor('Public.', 'slam-word'),
        heartbeat: true,
      },
      {
        kind: 'line',
        id: 'a5-honest',
        text: 'Honest.',
        role: 'slam',
        motion: 'pop',
        hold: holdFor('Honest.', 'slam-word'),
        heartbeat: true,
      },
      {
        kind: 'line',
        id: 'a5-on-time',
        text: 'On time.',
        role: 'slam',
        motion: 'pop',
        // Two-word slam: wide clamp + slam-word hold (readable phrase, not 1-beat blip)
        hold: holdFor('On time.', 'slam-word'),
        heartbeat: true,
        wide: true,
      },
      // No breath pad — hardcut Imagine → Gandhi (budget for reverse scenes + music kick-tail)
    ],
  },

  // ── ACT 6 — Gandhi / We are the change / virtues / India / Abki baar / CTA ─
  {
    id: 'act6',
    label: 'We are the change',
    beats: [
      {
        kind: 'quote',
        id: 'a6-gandhi',
        text: '"Be the change you wish to see in the world"',
        attribution: '— Mahatma Gandhi',
        hold: holdFor('"Be the change you wish to see in the world"', 'thesis'),
        // Body role + CSS wrap/clamp: quote always larger than whisper attr, never clips
        textRole: 'body',
        attrRole: 'whisper',
      },
      {
        kind: 'line',
        id: 'a6-change',
        text: 'We are the change.',
        role: 'slam',
        motion: 'pop',
        hold: holdFor('We are the change.', 'thesis'),
        heartbeat: true,
        wide: true,
      },
      {
        kind: 'line',
        id: 'a6-action',
        text: 'It is time for action.',
        role: 'slam',
        motion: 'pop',
        hold: holdFor('It is time for action.', 'thesis'),
        heartbeat: true,
        wide: true,
      },
      {
        kind: 'line',
        id: 'a6-build',
        text: "Let's build a",
        role: 'body',
        motion: 'rise',
        hold: holdFor("Let's build a", 'body'),
      },
      {
        kind: 'rapid',
        id: 'a6-virtues',
        words: kineticSpeechVirtues,
        holdEach: 1,
        role: 'body',
      },
      {
        kind: 'line',
        id: 'a6-india',
        text: 'India.',
        role: 'slam-xl',
        motion: 'pop',
        hold: holdFor('India.', 'slam-xl'),
        tiranga: true,
        heartbeat: true,
      },
      // Political close after Tiranga: Abki baar… / development ki sarkar…
      {
        kind: 'pair',
        id: 'a6-abki',
        lead: 'Abki baar…',
        hit: 'development ki sarkar…',
        holdLead: holdFor('Abki baar…', 'body'),
        holdHit: holdFor('development ki sarkar…', 'body'),
        leadRole: 'slam',
        hitRole: 'close',
        leadMotion: 'pop',
        hitMotion: 'pop',
        wide: true,
        // Kick thump matches neighboring close punches (change / action / India)
        heartbeat: true,
      },
      // Finale: password roller spells data.janta.party + Join CTA
      // No breath — Demand sticky budget needs endcard kick-tail on the music
      { kind: 'endcard', id: 'a6-endcard' },
    ],
  },
] as const;

/** Flatten all beats for the stage renderer. */
export function getAllKineticBeats(): KineticBeat[] {
  return kineticSpeechActs.flatMap((act) => [...act.beats]);
}

function beatToTranscriptLines(beat: KineticBeat): string[] {
  switch (beat.kind) {
    case 'line':
      return [beat.text];
    case 'pair':
      return [beat.lead, beat.hit];
    case 'slide-pair':
      return [beat.left, beat.right];
    case 'sticky': {
      const hasVisibleSuffix = beat.steps.some((s) => s.suffix.length > 0);
      const lines: string[] = [];
      // Staggered stickies (prefixHold > 0): include solo prefix line first
      if (hasVisibleSuffix && stickyPrefixHoldBeats(beat) > 0) {
        lines.push(beat.prefix);
      }
      for (const s of beat.steps) {
        const base = `${beat.prefix} ${s.suffix}`.trim();
        lines.push((s.dots ?? 0) > 0 ? `${base}...` : base);
      }
      return lines;
    }
    case 'sticky-pair':
      return beat.mode === 'swap-lead'
        ? beat.steps.map((s) => `${s.text} ${beat.fixed}`)
        : beat.steps.map((s) => `${beat.fixed} ${s.text}`);
    case 'flood':
      return [...beat.words];
    case 'cloud':
      return [beat.words.join(' · ')];
    case 'rapid':
      return [...beat.words];
    case 'quote':
      return [beat.text, beat.attribution];
    case 'project-delays': {
      // Project cards only — source labels live on the endcard Sources transcript line
      const lines = beat.projects.map(
        (p) => `${p.project}\nDelayed.\n${p.years}`,
      );
      lines.push(beat.moreLabel);
      return lines;
    }
    case 'endcard': {
      const e = kineticSpeechCopy.endcard;
      return [e.url, e.join, e.sources];
    }
    case 'silence':
      return [];
    default:
      return [];
  }
}

/** Plain-text transcript for a11y / reduced motion. */
export function getKineticSpeechTranscript(): string {
  const lines: string[] = [];
  for (const act of kineticSpeechActs) {
    for (const beat of act.beats) {
      lines.push(...beatToTranscriptLines(beat));
    }
  }
  return lines.join('\n');
}

/** Story duration to endcard start (seconds), from beat layout. */
export function getKineticSpeechStoryDurationSec(): number {
  const { items, endBeat } = layoutKineticSpeech();
  const end = items.find((i) => i.beat.kind === 'endcard');
  if (end) {
    return atBeat(end.startBeat);
  }
  return atBeat(endBeat);
}

/**
 * Seconds when the visual story + endcard (roller settle + tail) is complete.
 * Audio may continue past this until `kineticSpeechAudioDurationSec`.
 */
export function getKineticSpeechVisualEndSec(): number {
  return (
    getKineticSpeechStoryDurationSec() +
    kineticSpeechEndcardHoldSec +
    kineticSpeechVisualTailSec
  );
}

/**
 * Full film duration: visual end, then hold until natural track end.
 * Timeline `onComplete` fires with the music (never cuts audio mid-track).
 */
export function getKineticSpeechFilmDurationSec(): number {
  return Math.max(getKineticSpeechVisualEndSec(), kineticSpeechAudioDurationSec);
}

/**
 * Grid beat index at (or just past) natural audio end — exclusive upper bound
 * for kick-range helpers so endcard heartbeat can thump through the music tail.
 *
 * Heartbeat follows the analyzed kick map only: if the beatmap has no kicks in
 * the final ~few seconds before audio end, the roller does not invent residual
 * pulses there (film/timeline still runs to `kineticSpeechAudioDurationSec`).
 */
export function getKineticSpeechAudioEndBeat(): number {
  return (kineticSpeechAudioDurationSec - KINETIC_OFFSET_SEC) / KINETIC_BEAT;
}

export type { BeatRole };

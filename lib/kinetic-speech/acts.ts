/**
 * Director beat list — every hold is a beat count on the 140 BPM grid.
 * Content only; layout and duration live in sibling modules.
 */

import {
  b,
  holdFor,
} from '@/lib/data/kinetic-speech-beatmap';
import {
  DELAYED_PROJECT_FACTS,
  kineticSpeechVirtues,
} from '@/lib/kinetic-speech/constants';
import type { KineticAct, KineticBeat } from '@/lib/kinetic-speech/types';

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
      // Quality of work: built with pride → fails in the rains → shrug
      {
        kind: 'sticky-pair',
        id: 'a1-expressway',
        mode: 'swap-hit',
        fixed: 'Expressway built.',
        fixedRole: 'body',
        stepRole: 'body',
        // Whole-beat step — half-beats cascade into expensive kick-snap pads later
        steps: [{ text: 'Broken by the rains.', hold: b(2) }],
      },
      {
        kind: 'line',
        id: 'a1-expressway-ch',
        text: 'Chalta Hai.',
        role: 'slam',
        motion: 'pop',
        hold: holdFor('Chalta Hai.', 'slam-word'),
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
        hold: b(4),
        axis: 'x',
        tussle: true,
      },
      {
        kind: 'slide-pair',
        id: 'a3-ns',
        left: 'North.',
        right: 'South.',
        hold: b(4),
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
        hold: b(5),
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
        words: ['development', 'quality', 'no corruption', 'accountability'],
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
      // Quality reverse of Act 1 expressway shrug — built once, stays standing
      {
        kind: 'pair',
        id: 'a5-infra',
        lead: 'Infrastructure built.',
        hit: 'Built to last.',
        leadRole: 'body',
        hitRole: 'close',
        holdLead: b(2),
        holdHit: b(2),
        wide: true,
        heartbeat: true,
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

/** Exported for transcript / debugging. */
export function getKineticSpeechActs(): readonly KineticAct[] {
  return kineticSpeechActs;
}

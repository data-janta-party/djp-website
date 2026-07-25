/**
 * Kinetic speech film — shared types (beat kinds, layout, stage).
 */

import type { BeatRole } from '@/lib/data/kinetic-speech-beatmap';

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

export type { BeatRole };

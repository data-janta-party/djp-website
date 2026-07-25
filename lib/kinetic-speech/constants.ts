/**
 * Kinetic speech film — constants, copy, roller config, sources.
 */

import type {
  DelayedProjectFact,
  DelayedProjectSource,
} from '@/lib/kinetic-speech/types';

export const kineticSpeechAudioSrc = '/audio/speech-trailer.mp3' as const;

/** One pass of the track — story finishes inside this. */
export const kineticSpeechAudioDurationSec = 142 as const;

/**
 * Small timeline tail after story + endcard hold (enter offset + settle buffer).
 * Shared by visual-end and film-duration so sync/onComplete stay aligned.
 */
export const kineticSpeechVisualTailSec = 0.4 as const;

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
    replay: 'Replay',
    pause: 'Pause',
    play: 'Play',
    /** Visible label on the top-left film chrome (navbar-style pill). */
    home: 'Back',
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


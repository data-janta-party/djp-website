/**
 * Adjectives that rotate in “Let's build {word} India.”
 * Curated for single-token fit and manifesto tone (Transparent first).
 */
export const JOIN_INDIA_ADJECTIVES = [
  'Transparent',
  'Accountable',
  'Digital',
  'Inclusive',
  'Auditable',
  'Walkable',
  'Clean',
  'Safer',
  'Greener',
  'Fair',
  'Open',
  'Traceable',
  'Public',
  'Measurable',
  'Hopeful',
] as const;

/** Hold each adjective before crossfade (ms). */
export const JOIN_ADJECTIVE_HOLD_MS = 2200 as const;

/** Crossfade duration — keep in sync with CSS animation (ms). */
export const JOIN_ADJECTIVE_CROSSFADE_MS = 420 as const;

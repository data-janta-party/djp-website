/**
 * Kinetic speech film — data, layout, and pure helpers.
 * Prefer importing from `@/lib/kinetic-speech` or the legacy barrel
 * `@/lib/data/kinetic-speech` (re-exports this package).
 */

export type {
  TypeRole,
  MotionVerb,
  StageBg,
  StickyStep,
  DelayedProjectFact,
  DelayedProjectSource,
  KineticBeat,
  KineticAct,
  LaidOutBeat,
  BeatRole,
} from '@/lib/kinetic-speech/types';

export {
  kineticSpeechAudioSrc,
  kineticSpeechAudioDurationSec,
  kineticSpeechVisualTailSec,
  DELAYED_PROJECT_FACTS,
  DELAYED_PROJECT_SOURCES,
  KINETIC_SPEECH_MUSIC_SOURCE,
  KINETIC_ENDCARD_SOURCES,
  kineticSpeechCopy,
  kineticSpeechJoinHref,
  kineticSpeechUrlHref,
  kineticSpeechEndcardHoldSec,
  kineticSpeechRollerSlots,
  kineticSpeechRollerSpinDepth,
  kineticSpeechRollerVirtueHoldBeats,
  kineticSpeechRollerVirtueIndiaBeats,
  kineticSpeechRollerDomainLockGapBeats,
  kineticSpeechReelCellEm,
  kineticSpeechRollerSettleBeats,
  kineticSpeechVirtues,
  kineticSpeechRollerVirtues,
} from '@/lib/kinetic-speech/constants';

export { stickyPrefixHoldBeats } from '@/lib/kinetic-speech/sticky';
export { beatDurationBeats, layoutKineticSpeech } from '@/lib/kinetic-speech/layout';
export { getAllKineticBeats } from '@/lib/kinetic-speech/acts';
export { getKineticSpeechTranscript } from '@/lib/kinetic-speech/transcript';
export {
  getKineticSpeechStoryDurationSec,
  getKineticSpeechVisualEndSec,
  getKineticSpeechFilmDurationSec,
  getKineticSpeechAudioEndBeat,
} from '@/lib/kinetic-speech/film-duration';

export {
  buildKineticSpeechTimeline,
  type BuildKineticSpeechTimelineOptions,
} from '@/lib/kinetic-speech/build-timeline';

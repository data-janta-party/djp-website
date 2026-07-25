/**
 * Kinetic speech film data — re-exports `@/lib/kinetic-speech`.
 * Prefer the package path for new code; this barrel keeps existing imports working.
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
} from '@/lib/kinetic-speech';

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
  stickyPrefixHoldBeats,
  beatDurationBeats,
  layoutKineticSpeech,
  getAllKineticBeats,
  getKineticSpeechTranscript,
  getKineticSpeechStoryDurationSec,
  getKineticSpeechEndcardInteractiveSec,
  getKineticSpeechVisualEndSec,
  getKineticSpeechFilmDurationSec,
  getKineticSpeechAudioEndBeat,
} from '@/lib/kinetic-speech';

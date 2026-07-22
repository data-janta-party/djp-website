import { KineticSpeechFilm } from '@/components/ui/compositions/civic-pulse/KineticSpeechFilm';
import { cn } from '@/lib/utils/index';

export interface DigitalSpeechPageViewProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly className?: string;
}

/**
 * Digital speech — timed kinetic manifesto film.
 *
 * Auto-starts on mount so `/speech` plays immediately; browsers may still
 * require a user gesture for unmuted audio (tap-for-sound UI handles that).
 */
export function DigitalSpeechPageView({ className }: DigitalSpeechPageViewProps) {
  return (
    <div id="digital-speech" className={cn('flex w-full flex-col gap-0', className)}>
      <KineticSpeechFilm />
    </div>
  );
}

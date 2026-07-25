import { KineticSpeechFilm } from '@/components/ui/compositions/civic-pulse/KineticSpeechFilm';
import { cn } from '@/lib/utils/index';

export interface DigitalSpeechPageViewProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly className?: string;
}

/**
 * Digital speech — timed kinetic manifesto film.
 *
 * Shows a big play gate first; playback starts on user gesture (also unlocks
 * unmuted audio more reliably than cold-load autoplay).
 */
export function DigitalSpeechPageView({ className }: DigitalSpeechPageViewProps) {
  return (
    <div id="digital-speech" className={cn('relative min-h-svh w-full', className)}>
      <KineticSpeechFilm />
    </div>
  );
}

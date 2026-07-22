import { HomeBrand } from '@/components/ui/compositions/civic-pulse/HomeBrand';
import { JoinMovement } from '@/components/ui/compositions/civic-pulse/JoinMovement';
import { VolunteerForm } from '@/components/ui/compositions/civic-pulse/VolunteerForm';
import { cn } from '@/lib/utils/index';

export interface CivicPulseHomePageViewProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly className?: string;
}

export function CivicPulseHomePageView({ className }: CivicPulseHomePageViewProps) {
  return (
    <div
      id="civic-pulse-home"
      className={cn('flex w-full flex-col gap-0 pb-24 md:pb-32', className)}
    >
      <HomeBrand />
      <JoinMovement />
      <div
        id="volunteer-snap"
        className="story-snap-volunteer mx-auto w-full max-w-(--spacing-container-max) px-margin-mobile md:px-gutter"
      >
        <div className="story-snap-inset w-full" id="tpl-components-civic-pulse-pages-civic-pulse-home-page-view-l22-c9">
          <VolunteerForm />
        </div>
      </div>
    </div>
  );
}

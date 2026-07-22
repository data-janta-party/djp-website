'use client';

import { useState, type FormEvent } from 'react';

import { submitVolunteerApplication } from '@/actions/volunteer';
import { Button } from '@/components/ui/atoms/Button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/atoms/Card';
import { Input } from '@/components/ui/atoms/Input';
import { Label } from '@/components/ui/atoms/Label';
import { Textarea } from '@/components/ui/atoms/Textarea';
import { volunteerFieldIds, volunteerSectionId } from '@/lib/data/civic-pulse';
import { useLocale } from '@/hooks/useLocale';
import { cn } from '@/lib/utils/index';

export interface VolunteerFormProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly className?: string;
}

export function VolunteerForm({ className }: VolunteerFormProps) {
  const { messages } = useLocale();
  const copy = messages.volunteer;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const result = await submitVolunteerApplication({
      name: String(formData.get('name') ?? ''),
      email: String(formData.get('email') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      city: String(formData.get('city') ?? ''),
      interest: String(formData.get('interest') ?? ''),
      website: String(formData.get('website') ?? ''),
    });

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    form.reset();
    setSuccess(true);
  }

  return (
    <section
      id={volunteerSectionId}
      aria-labelledby="volunteer-heading"
      className={cn('relative w-full', className)}
    >
      <div aria-hidden className="ambient-glow pointer-events-none absolute inset-0 -z-10 rounded-3xl" id="tpl-components-ui-compositions-civic-pulse-volunteer-form-l58-c7" />
      <Card className="overflow-hidden rounded-3xl border-outline-variant bg-surface-container-lowest/90 shadow-sm backdrop-blur-md">
        <CardHeader className="gap-2 px-padding-card pt-padding-card pb-2">
          <p className="text-sm font-semibold tracking-widest text-muted-foreground uppercase" id="tpl-components-ui-compositions-civic-pulse-volunteer-form-l61-c11">
            {copy.eyebrow}
          </p>
          <h2 id="volunteer-heading" className="text-3xl font-light tracking-tight text-primary">
            {copy.title}
          </h2>
          <CardDescription className="max-w-xl text-md font-light text-muted-foreground">
            {copy.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-padding-card pb-padding-card">
          {success ? (
            <div
              role="status"
              className="flex flex-col gap-2 rounded-2xl border border-outline-variant bg-surface-container-low p-6" id="tpl-components-ui-compositions-civic-pulse-volunteer-form-l73-c13"
            >
              <p className="text-xl font-light text-primary" id="tpl-components-ui-compositions-civic-pulse-volunteer-form-l77-c15">{copy.successTitle}</p>
              <p className="text-md font-light text-muted-foreground" id="tpl-components-ui-compositions-civic-pulse-volunteer-form-l78-c15">{copy.successMessage}</p>
              <Button
                id="volunteer-submit-another"
                type="button"
                variant="outline"
                className="mt-4 w-fit rounded-full"
                onClick={() => setSuccess(false)}
              >
                {messages.common.submitAnother}
              </Button>
            </div>
          ) : (
            <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate id="tpl-components-ui-compositions-civic-pulse-volunteer-form-l90-c13">
              {/* Honeypot: hidden from humans; bots that fill it are rejected server-side. */}
              <div
                aria-hidden="true"
                className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
                id="tpl-components-ui-compositions-civic-pulse-volunteer-form-honeypot"
              >
                <label id="volunteer-website-label" htmlFor={volunteerFieldIds.website}>
                  Website
                </label>
                <input
                  id={volunteerFieldIds.website}
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  defaultValue=""
                />
              </div>
              <div className="grid gap-5 md:grid-cols-2" id="tpl-components-ui-compositions-civic-pulse-volunteer-form-l91-c15">
                <div className="flex flex-col gap-2" id="tpl-components-ui-compositions-civic-pulse-volunteer-form-l92-c17">
                  <Label htmlFor={volunteerFieldIds.name}>{copy.fields.name.label}</Label>
                  <Input
                    id={volunteerFieldIds.name}
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder={copy.fields.name.placeholder}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="flex flex-col gap-2" id="tpl-components-ui-compositions-civic-pulse-volunteer-form-l104-c17">
                  <Label htmlFor={volunteerFieldIds.email}>{copy.fields.email.label}</Label>
                  <Input
                    id={volunteerFieldIds.email}
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder={copy.fields.email.placeholder}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="flex flex-col gap-2" id="tpl-components-ui-compositions-civic-pulse-volunteer-form-l116-c17">
                  <Label htmlFor={volunteerFieldIds.phone}>
                    {copy.fields.phone.label}
                    <span className="ml-1 font-normal text-muted-foreground" id="tpl-components-ui-compositions-civic-pulse-volunteer-form-l119-c21">
                      ({messages.common.optional})
                    </span>
                  </Label>
                  <Input
                    id={volunteerFieldIds.phone}
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder={copy.fields.phone.placeholder}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="flex flex-col gap-2" id="tpl-components-ui-compositions-civic-pulse-volunteer-form-l132-c17">
                  <Label htmlFor={volunteerFieldIds.city}>{copy.fields.city.label}</Label>
                  <Input
                    id={volunteerFieldIds.city}
                    name="city"
                    type="text"
                    required
                    autoComplete="address-level2"
                    placeholder={copy.fields.city.placeholder}
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2" id="tpl-components-ui-compositions-civic-pulse-volunteer-form-l145-c15">
                <Label htmlFor={volunteerFieldIds.interest}>{copy.fields.interest.label}</Label>
                <Textarea
                  id={volunteerFieldIds.interest}
                  name="interest"
                  required
                  rows={4}
                  placeholder={copy.fields.interest.placeholder}
                  className="min-h-28 resize-y rounded-xl"
                />
              </div>
              {error ? (
                <p role="alert" className="text-sm text-error" id="tpl-components-ui-compositions-civic-pulse-volunteer-form-l157-c17">
                  {error}
                </p>
              ) : null}
              <div className="pt-2" id="tpl-components-ui-compositions-civic-pulse-volunteer-form-l161-c15">
                <Button
                  id="volunteer-submit"
                  type="submit"
                  size="lg"
                  disabled={pending}
                  className="rounded-full px-8"
                >
                  {pending ? messages.common.submitting : copy.submitLabel}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

/**
 * Beat-locked schedule for laid-out kinetic speech items.
 *
 * Kind registry (schedule side): `SCHEDULE_KIND_HANDLERS` is exhaustive over
 * `KineticBeat['kind']`. Sticky + endcard live in `schedule/kinds/`; shared
 * helpers take `ScheduleContext` (no closure spaghetti).
 */

import gsap from 'gsap';

import {
  atBeat,
  isKickBeat,
  KINETIC_BEAT,
  kickBeatsInRange,
  wholeBeatsInRange,
} from '@/lib/data/kinetic-speech-beatmap';
import { layoutKineticSpeech } from '@/lib/kinetic-speech/layout';
import {
  defaultIn,
  defaultOut,
  IN_SNAP,
  OUT_SNAP,
} from '@/lib/kinetic-speech/motion';
import type { KineticBeat, StageBg } from '@/lib/kinetic-speech/types';
import type { ScheduleContext, ScheduleKindHandler } from '@/lib/kinetic-speech/schedule/context';
import { sel } from '@/lib/kinetic-speech/schedule/context';
import {
  animateLineIn,
  animateLineOut,
  scheduleHeartbeat,
  softClearLastReplace,
} from '@/lib/kinetic-speech/schedule/helpers';
import { scheduleEndcard } from '@/lib/kinetic-speech/schedule/kinds/endcard';
import { scheduleSticky } from '@/lib/kinetic-speech/schedule/kinds/sticky';

export type ScheduleKineticSpeechOptions = {
  onJoinReady?: () => void;
};

type GsapQ = ReturnType<typeof gsap.utils.selector>;

/** Exhaustive schedule registry — add a kind here + duration + transcript + BeatNodes. */
export const SCHEDULE_KIND_HANDLERS: Record<KineticBeat['kind'], ScheduleKindHandler> = {
  silence: () => {
    /* silence advances the grid with no visuals */
  },
  line: (ctx, item, next, startT, endT) => {
    const beat = item.beat;
    if (beat.kind !== 'line') return;
    const inn = defaultIn(beat.motion);
    const out = defaultOut(beat.motion);
    const nextIsReplace = next?.beat.kind === 'line' && next.beat.motion === 'replace';

    if (beat.motion === 'replace') {
      animateLineIn(ctx, beat.id, beat.motion, inn, startT);
      if (nextIsReplace) {
        ctx.setLastLineSel(sel(beat.id));
      } else {
        animateLineOut(ctx, beat.id, 'replace', out, endT);
        ctx.setLastLineSel(null);
      }
    } else {
      softClearLastReplace(ctx, startT);
      animateLineIn(ctx, beat.id, beat.motion, inn, startT);
      animateLineOut(ctx, beat.id, beat.motion, out, endT);
      ctx.setLastLineSel(null);
    }

    if (beat.heartbeat || beat.role === 'slam' || beat.role === 'slam-xl') {
      scheduleHeartbeat(ctx, sel(beat.id), item.startBeat, item.endBeat);
    }

  },
  pair: (ctx, item, next, startT, endT) => {
    const beat = item.beat;
    if (beat.kind !== 'pair') return;
    const { tl, q } = ctx;
    softClearLastReplace(ctx, startT);
    const leadId = `${beat.id}-lead`;
    const hitId = `${beat.id}-hit`;
    const leadMotion = beat.leadMotion ?? (beat.lock ? 'rise' : 'pop');
    const hitMotion = beat.hitMotion ?? 'pop';
    const leadIn = defaultIn(leadMotion);
    const hitIn = defaultIn(hitMotion);

    // Lead on startBeat for holdLead beats; hit lands on the next grid beat after lead
    const hitBeat = item.startBeat + beat.holdLead;
    const hitAt = atBeat(hitBeat);

    animateLineIn(ctx, leadId, leadMotion, leadIn, startT);
    tl.to(q(sel(leadId)), { autoAlpha: 0, duration: OUT_SNAP, ease: 'none' }, hitAt);

    animateLineIn(ctx, hitId, hitMotion, hitIn, hitAt, { pulse: beat.pulseHit });
    tl.to(q(sel(hitId)), { autoAlpha: 0, duration: OUT_SNAP, ease: 'none' }, endT);

    if (beat.heartbeat) {
      scheduleHeartbeat(ctx, sel(leadId), item.startBeat, hitBeat);
      scheduleHeartbeat(ctx, sel(hitId), hitBeat, item.endBeat);
    }

  },
  'slide-pair': (ctx, item, next, startT, endT) => {
    const beat = item.beat;
    if (beat.kind !== 'slide-pair') return;
    const { tl, q } = ctx;
    softClearLastReplace(ctx, startT);
    const leftId = `${beat.id}-left`;
    const rightId = `${beat.id}-right`;
    const leftSel = sel(leftId);
    const rightSel = sel(rightId);
    const inn = defaultIn('slide-l');
    const axis = beat.axis ?? 'x';

    if (beat.tussle) {
      // Both words visible — beat-synced tug-of-war (argue motion).
      if (axis === 'y') {
        tl.fromTo(
          q(leftSel),
          { autoAlpha: 0, y: -72, scale: 1 },
          { autoAlpha: 1, y: -18, scale: 1, duration: inn, ease: 'expo.out' },
          startT,
        );
        tl.fromTo(
          q(rightSel),
          { autoAlpha: 0, y: 72, scale: 1 },
          { autoAlpha: 1, y: 18, scale: 1, duration: inn, ease: 'expo.out' },
          startT,
        );
      } else {
        tl.fromTo(
          q(leftSel),
          { autoAlpha: 0, x: -90, scale: 1 },
          { autoAlpha: 1, x: -28, scale: 1, duration: inn, ease: 'expo.out' },
          startT,
        );
        tl.fromTo(
          q(rightSel),
          { autoAlpha: 0, x: 90, scale: 1 },
          { autoAlpha: 1, x: 28, scale: 1, duration: inn, ease: 'expo.out' },
          startT,
        );
      }

      let tug = 0;
      for (const dBeat of wholeBeatsInRange(item.startBeat, item.endBeat)) {
        // First grid beat is the entrance; tug starts on subsequent beats.
        if (dBeat <= item.startBeat) {
          continue;
        }
        const dt = atBeat(dBeat);
        const leftWins = tug % 2 === 0;
        if (axis === 'y') {
          if (leftWins) {
            tl.to(q(leftSel), { y: -42, scale: 1.12, duration: 0.08, ease: 'power2.out' }, dt);
            tl.to(q(rightSel), { y: 8, scale: 0.9, duration: 0.08, ease: 'power2.out' }, dt);
          } else {
            tl.to(q(rightSel), { y: 42, scale: 1.12, duration: 0.08, ease: 'power2.out' }, dt);
            tl.to(q(leftSel), { y: -8, scale: 0.9, duration: 0.08, ease: 'power2.out' }, dt);
          }
        } else if (leftWins) {
          tl.to(q(leftSel), { x: -56, scale: 1.12, duration: 0.08, ease: 'power2.out' }, dt);
          tl.to(q(rightSel), { x: 12, scale: 0.9, duration: 0.08, ease: 'power2.out' }, dt);
        } else {
          tl.to(q(rightSel), { x: 56, scale: 1.12, duration: 0.08, ease: 'power2.out' }, dt);
          tl.to(q(leftSel), { x: -12, scale: 0.9, duration: 0.08, ease: 'power2.out' }, dt);
        }
        tug += 1;
      }

      tl.to(q(leftSel), { autoAlpha: 0, duration: 0.1, ease: 'power3.in' }, endT);
      tl.to(q(rightSel), { autoAlpha: 0, duration: 0.1, ease: 'power3.in' }, endT);
      tl.set(q(leftSel), { x: 0, y: 0, scale: 1 }, endT + 0.1);
      tl.set(q(rightSel), { x: 0, y: 0, scale: 1 }, endT + 0.1);
    } else {
      animateLineIn(ctx, leftId, 'slide-l', inn, startT);
      // Right lands one half-beat later for stereo punch, still on grid
      animateLineIn(ctx, rightId, 'slide-r', inn, startT + KINETIC_BEAT / 2);
      animateLineOut(ctx, leftId, 'slide-l', 0.1, endT);
      animateLineOut(ctx, rightId, 'slide-r', 0.1, endT);
    }

  },
  'sticky-pair': (ctx, item, next, startT, endT) => {
    const beat = item.beat;
    if (beat.kind !== 'sticky-pair') return;
    const { tl, q } = ctx;
    softClearLastReplace(ctx, startT);
    const root = sel(beat.id);
    const fixedId = `${beat.id}-fixed`;
    const swapBase = `${beat.id}-swap`;
    let bi = item.startBeat;

    tl.set(q(root), { autoAlpha: 1 }, atBeat(bi));
    tl.fromTo(
      q(sel(fixedId)),
      { autoAlpha: 0, scale: 1.14 },
      { autoAlpha: 1, scale: 1, duration: IN_SNAP, ease: 'expo.out' },
      atBeat(bi),
    );
    bi += 1;

    beat.steps.forEach((step, i) => {
      const swapId = `${swapBase}-${i}`;
      const stepT = atBeat(bi);
      if (i > 0) {
        tl.to(
          q(sel(`${swapBase}-${i - 1}`)),
          { autoAlpha: 0, y: -8, duration: OUT_SNAP, ease: 'power3.in' },
          stepT,
        );
      }
      const stepColor = step.color;
      tl.fromTo(
        q(sel(swapId)),
        { autoAlpha: 0, y: 10, ...(stepColor ? { color: stepColor } : {}) },
        {
          autoAlpha: 1,
          y: 0,
          duration: IN_SNAP,
          ease: 'expo.out',
          ...(stepColor ? { color: stepColor } : {}),
        },
        stepT,
      );
      // Intentional AQI ramp: paint fixed label to match the rising number
      if (stepColor) {
        tl.to(
          q(sel(fixedId)),
          { color: stepColor, duration: IN_SNAP, ease: 'none' },
          stepT,
        );
      }
      // Pulse fixed word (e.g. Chalta Hai.) on every kick in the step window,
      // including the entry beat so 1-beat holds still thump.
      if (beat.pulseFixed) {
        for (const kb of kickBeatsInRange(bi, bi + step.hold)) {
          const kt = atBeat(kb);
          // Entry kick: slight offset so it doesn't fight the swap fromTo at bi
          const pulseAt = kb === bi ? kt + 0.02 : kt;
          tl.to(q(sel(fixedId)), { scale: 1.08, duration: 0.05, ease: 'power2.out' }, pulseAt);
          tl.to(
            q(sel(fixedId)),
            { scale: 1, duration: 0.12, ease: 'power3.out' },
            pulseAt + 0.05,
          );
        }
      }
      bi += step.hold;
    });

    tl.to(q(root), { autoAlpha: 0, duration: OUT_SNAP }, endT);
    // clearProps color so AQI ramp never leaks into replay monochrome
    tl.set(
      q(`${root} [data-k-node]`),
      { autoAlpha: 0, y: 0, scale: 1, clearProps: 'color' },
      endT + OUT_SNAP,
    );

  },
  flood: (ctx, item, next, startT, endT) => {
    const beat = item.beat;
    if (beat.kind !== 'flood') return;
    const { tl, q } = ctx;
    softClearLastReplace(ctx, startT);
    const floodRoot = sel(beat.id);
    const tileEls = gsap.utils.toArray<Element>(q(`${floodRoot} [data-k-flood-tile]`));
    tl.set(q(floodRoot), { autoAlpha: 1, scale: 1 }, startT);
    tl.set(tileEls, { autoAlpha: 0, scale: 0.85, x: 0, y: 0 }, startT);

    // One batch of tiles pops on every whole beat — only tween that slice
    const floodBeats = wholeBeatsInRange(item.startBeat, item.endBeat);
    const tileCount = Math.max(1, tileEls.length || beat.count);
    floodBeats.forEach((bi, idx) => {
      const t = atBeat(bi);
      const from = Math.floor((idx / Math.max(1, floodBeats.length)) * tileCount);
      const to = Math.floor(((idx + 1) / Math.max(1, floodBeats.length)) * tileCount);
      const batch = tileEls.slice(from, Math.max(to, from + 1));
      if (batch.length > 0) {
        tl.to(
          batch,
          {
            autoAlpha: 1,
            scale: 1,
            duration: 0.08,
            ease: 'expo.out',
            stagger: { each: 0.01 },
          },
          t,
        );
      }
      // Kick beats: brightness flash, then fully rest scale at 1
      if (isKickBeat(bi)) {
        tl.to(
          q('#kinetic-bg'),
          {
            filter: 'brightness(1.4)',
            duration: 0.04,
            yoyo: true,
            repeat: 1,
            ease: 'none',
          },
          t,
        );
        tl.to(q(floodRoot), { scale: 1.06, duration: 0.06, ease: 'power2.out' }, t);
        tl.to(q(floodRoot), { scale: 1, duration: 0.1, ease: 'power2.in' }, t + 0.06);
      }
    });

    if (beat.shake) {
      const mid = atBeat(item.startBeat + beat.duration / 2);
      tl.to(
        tileEls,
        {
          x: '+=3',
          duration: 0.035,
          yoyo: true,
          repeat: 8,
          ease: 'power1.inOut',
          stagger: { each: 0.008, from: 'random' },
        },
        mid,
      );
    }

    tl.set(q(floodRoot), { autoAlpha: 0, scale: 1 }, endT);
    tl.set(tileEls, { autoAlpha: 0, scale: 0.85, x: 0, y: 0 }, endT);
    tl.set(q('#kinetic-bg'), { filter: 'none' }, endT);

  },
  cloud: (ctx, item, next, startT, endT) => {
    const beat = item.beat;
    if (beat.kind !== 'cloud') return;
    const { tl, q } = ctx;
    softClearLastReplace(ctx, startT);
    const cloudRoot = sel(beat.id);
    const wordEls = gsap.utils.toArray<HTMLElement>(
      q(`${cloudRoot} [data-k-cloud-word]`),
    );
    tl.set(q(cloudRoot), { autoAlpha: 1 }, startT);
    tl.set(wordEls, { autoAlpha: 0, scale: 1, x: 0, y: 0 }, startT);
    // One word per beat — tween only that element, not the full collection
    wholeBeatsInRange(item.startBeat, item.endBeat).forEach((bi, idx) => {
      const el = wordEls[idx];
      if (!el) {
        return;
      }
      tl.to(el, { autoAlpha: 1, duration: 0.12 }, atBeat(bi));
    });
    tl.to(q(cloudRoot), { autoAlpha: 0, duration: 0.2 }, endT - 0.2);
    tl.set(wordEls, { autoAlpha: 0, scale: 1, x: 0, y: 0 }, endT);

  },
  rapid: (ctx, item, next, startT, endT) => {
    const beat = item.beat;
    if (beat.kind !== 'rapid') return;
    const { tl, q } = ctx;
    softClearLastReplace(ctx, startT);
    const rapidRoot = sel(beat.id);
    const holdEach = beat.holdEach ?? 1;
    tl.set(q(rapidRoot), { autoAlpha: 1 }, startT);
    tl.set(
      q(`${rapidRoot} [data-k-rapid-word]`),
      { autoAlpha: 0, scale: 1, y: 0 },
      startT,
    );

    beat.words.forEach((_, i) => {
      const wordId = `${beat.id}-w${i}`;
      const wordStart = item.startBeat + i * holdEach;
      const wordEnd = wordStart + holdEach;
      const t0 = atBeat(wordStart);
      const t1 = atBeat(wordEnd);
      if (i > 0) {
        tl.to(
          q(sel(`${beat.id}-w${i - 1}`)),
          { autoAlpha: 0, y: -10, scale: 0.96, duration: OUT_SNAP, ease: 'power3.in' },
          t0,
        );
      }
      tl.fromTo(
        q(sel(wordId)),
        { autoAlpha: 0, y: 14, scale: 1.06 },
        { autoAlpha: 1, y: 0, scale: 1, duration: IN_SNAP, ease: 'expo.out' },
        t0,
      );
      if (i === beat.words.length - 1) {
        tl.to(
          q(sel(wordId)),
          { autoAlpha: 0, duration: OUT_SNAP, ease: 'power3.in' },
          t1,
        );
      }
    });

    tl.set(q(rapidRoot), { autoAlpha: 0 }, endT);
    tl.set(
      q(`${rapidRoot} [data-k-rapid-word]`),
      { autoAlpha: 0, scale: 1, y: 0 },
      endT,
    );

  },
  quote: (ctx, item, next, startT, endT) => {
    const beat = item.beat;
    if (beat.kind !== 'quote') return;
    const { tl, q } = ctx;
    softClearLastReplace(ctx, startT);
    const root = sel(beat.id);
    const inn = defaultIn('rise');
    tl.fromTo(
      q(root),
      { autoAlpha: 0, y: 18 },
      { autoAlpha: 1, y: 0, duration: inn, ease: 'power4.out' },
      startT,
    );
    tl.to(q(root), { autoAlpha: 0, duration: OUT_SNAP, ease: 'power3.in' }, endT);
    tl.set(q(root), { y: 0 }, endT + OUT_SNAP);

  },
  'project-delays': (ctx, item, next, startT, endT) => {
    const beat = item.beat;
    if (beat.kind !== 'project-delays') return;
    const { tl, q } = ctx;
    softClearLastReplace(ctx, startT);
    const root = sel(beat.id);
    const holdEach = beat.holdEach ?? 3;
    const cardCount = beat.projects.length;
    // Root visible for the whole section; cards hardcut on the grid.
    tl.set(q(root), { autoAlpha: 1 }, startT);
    tl.set(
      q(`${root} [data-k-delay-card]`),
      { autoAlpha: 0, scale: 1, y: 0 },
      startT,
    );
    tl.set(q(`${root} [data-k-delay-more]`), { autoAlpha: 0, scale: 1, y: 0 }, startT);

    beat.projects.forEach((_, i) => {
      const cardId = `${beat.id}-p${i}`;
      const cardStart = item.startBeat + i * holdEach;
      const cardEnd = cardStart + holdEach;
      const t0 = atBeat(cardStart);
      const t1 = atBeat(cardEnd);
      if (i > 0) {
        tl.to(
          q(sel(`${beat.id}-p${i - 1}`)),
          { autoAlpha: 0, y: -12, scale: 0.96, duration: OUT_SNAP, ease: 'power3.in' },
          t0,
        );
      }
      tl.fromTo(
        q(sel(cardId)),
        { autoAlpha: 0, y: 16, scale: 1.04 },
        { autoAlpha: 1, y: 0, scale: 1, duration: IN_SNAP, ease: 'expo.out' },
        t0,
      );
      // Each delayed-project card thumps on kicks while held (delay machine pulse)
      scheduleHeartbeat(ctx, sel(cardId), cardStart, cardEnd);
      if (i === cardCount - 1) {
        tl.to(
          q(sel(cardId)),
          { autoAlpha: 0, y: -12, scale: 0.96, duration: OUT_SNAP, ease: 'power3.in' },
          t1,
        );
      }
    });

    const moreStart = item.startBeat + cardCount * holdEach;
    const moreT0 = atBeat(moreStart);
    tl.fromTo(
      q(`${root} [data-k-delay-more]`),
      { autoAlpha: 0, y: 18, scale: 1.08 },
      { autoAlpha: 1, y: 0, scale: 1, duration: IN_SNAP, ease: 'expo.out' },
      moreT0,
    );
    // Kick thump on the slam "1000+ more." while held
    scheduleHeartbeat(ctx, `${root} [data-k-delay-more]`, moreStart, item.endBeat);

    tl.set(q(root), { autoAlpha: 0 }, endT);
    tl.set(
      q(`${root} [data-k-delay-card]`),
      { autoAlpha: 0, scale: 1, y: 0 },
      endT,
    );
    tl.set(q(`${root} [data-k-delay-more]`), { autoAlpha: 0, scale: 1, y: 0 }, endT);

  },
  sticky: scheduleSticky,
  endcard: scheduleEndcard,
};

/**
 * Schedule all laid-out beats onto an existing paused GSAP timeline.
 */
export function scheduleKineticSpeechItems(
  tl: gsap.core.Timeline,
  q: GsapQ,
  setStageBg: (bg: StageBg, at?: number) => void,
  options?: ScheduleKineticSpeechOptions,
): void {
  let lastLineSel: string | null = null;
  const { items } = layoutKineticSpeech();

  const ctx: ScheduleContext = {
    tl,
    q,
    getLastLineSel: () => lastLineSel,
    setLastLineSel: (s) => {
      lastLineSel = s;
    },
    setStageBg,
    onJoinReady: options?.onJoinReady,
  };

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]!;
    const next = items[i + 1];
    const startT = atBeat(item.startBeat);
    const endT = atBeat(item.endBeat);
    SCHEDULE_KIND_HANDLERS[item.beat.kind](ctx, item, next, startT, endT);
  }
}

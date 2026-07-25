/**
 * Wait until the trailer has enough buffer to start play() without an eternal spinner.
 * Cold CF loads of multi-MB audio need headroom beyond a few hundred ms.
 */

export async function waitForAudioData(
  audio: HTMLAudioElement,
  maxMs = 8000,
): Promise<boolean> {
  if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    return true;
  }
  // Kick the network if preload has not started.
  try {
    audio.load();
  } catch {
    /* ignore */
  }
  return await new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      audio.removeEventListener('canplay', onReady);
      audio.removeEventListener('canplaythrough', onReady);
      audio.removeEventListener('loadeddata', onReady);
      audio.removeEventListener('error', onError);
      window.clearTimeout(timer);
      resolve(ok);
    };
    const onReady = () => finish(true);
    const onError = () => finish(false);
    const timer = window.setTimeout(() => {
      // Proceed with whatever we have so a gesture play still attempts.
      finish(audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA);
    }, maxMs);
    audio.addEventListener('canplay', onReady, { once: true });
    audio.addEventListener('canplaythrough', onReady, { once: true });
    audio.addEventListener('loadeddata', onReady, { once: true });
    audio.addEventListener('error', onError, { once: true });
  });
}

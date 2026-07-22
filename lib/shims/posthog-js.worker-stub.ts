type PostHogClient = {
  init: (...args: unknown[]) => void;
  capture: (...args: unknown[]) => void;
  identify: (...args: unknown[]) => void;
  reset: (...args: unknown[]) => void;
  opt_in_capturing: (...args: unknown[]) => void;
  opt_out_capturing: (...args: unknown[]) => void;
  captureException: (...args: unknown[]) => void;
  startSessionRecording: (...args: unknown[]) => void;
  stopSessionRecording: (...args: unknown[]) => void;
};

const posthogStub: PostHogClient = {
  init: () => undefined,
  capture: () => undefined,
  identify: () => undefined,
  reset: () => undefined,
  opt_in_capturing: () => undefined,
  opt_out_capturing: () => undefined,
  captureException: () => undefined,
  startSessionRecording: () => undefined,
  stopSessionRecording: () => undefined,
};

export default posthogStub;

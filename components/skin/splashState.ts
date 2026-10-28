// Whether this load will open on the splash. The splash plays the first load of
// a page, never again, and never for people who asked for less motion. The
// loading screen reads this too, so it only sets the splash's ring down early
// when the splash is actually coming.

let played = false;

export const markSplashed = () => {
  played = true;
};

export const willSplash = () =>
  typeof window !== "undefined" && !played && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

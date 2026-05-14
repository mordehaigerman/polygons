// Golden angle in degrees. Multiplying a hash by this before mod 360 gives
// sequential ids maximally-distinct hues — the same trick nature uses for
// leaf arrangement on a stem.
const HUE_STEP = 137.508;

const hueForId = (id: number | string): number => {
  const key = String(id);
  let h = 0;
  for (let i = 0; i < key.length; i += 1) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0;
  }
  return (h * HUE_STEP) % 360;
};

/** Stable, well-spread HSL color from a polygon id (string or number). */
export const colorForId = (id: number | string): string =>
  `hsl(${hueForId(id)} 70% 55%)`;

/** Semi-transparent variant of {@link colorForId}, suitable for fills. */
export const fillColorForId = (id: number | string, alpha = 0.25): string =>
  `hsl(${hueForId(id)} 70% 55% / ${alpha})`;

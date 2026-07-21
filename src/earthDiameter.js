// Mean radius of the Earth in kilometers (IUGG value).
export const EARTH_RADIUS_KM = 6371;

/**
 * Calculates the diameter of a circle/sphere given its radius.
 * @param {number} radius
 * @returns {number} diameter
 */
export function diameterFromRadius(radius) {
  if (typeof radius !== "number" || Number.isNaN(radius)) {
    throw new TypeError("radius must be a number");
  }
  if (radius < 0) {
    throw new RangeError("radius must be non-negative");
  }
  return radius * 2;
}

/**
 * Calculates the diameter of the Earth in kilometers.
 * @returns {number} Earth's diameter in kilometers.
 */
export function earthDiameterKm() {
  return diameterFromRadius(EARTH_RADIUS_KM);
}

/** Analytic design geometry. This is not a gravitational simulation. */
export function heightAt(x: number, z: number, phase: number): number {
  const ridge = 1.4 * Math.exp(-((x - 2.4) ** 2 / 8 + (z + 0.45) ** 2 / 5));
  const hollow = 0.9 * Math.exp(-((x + 0.4) ** 2 / 5 + (z - 0.25) ** 2 / 3));
  return (
    0.58 * Math.sin(0.6 * x + 0.58 * z + phase) * Math.cos(0.22 * z) + ridge - hollow + 0.105 * x
  );
}

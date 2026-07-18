export const FALLBACK_FIXTURE_IDS = new Set([998, 999]);

export function isFallbackFixtureId(id: number | string) {
  return FALLBACK_FIXTURE_IDS.has(Number(id));
}

// src/utils/time.ts
export function nowMs(): number {
  return Date.now();
}

export function secondsToMs(sec: number): number {
  return sec * 1000;
}

export function yyyymmddToIso(date?: string): string | undefined {
  if (!date || date.length !== 8) return undefined;
  const yyyy = date.slice(0, 4);
  const mm = date.slice(4, 6);
  const dd = date.slice(6, 8);
  return `${yyyy}-${mm}-${dd}`;
}

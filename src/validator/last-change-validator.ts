export class InvalidLastChangeError extends Error {
  constructor() {
    super('lastChange must be epoch milliseconds or an ISO date string');
  }
}

export function parseLastChange(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim() === '') throw new InvalidLastChangeError();
  if (/^\d+$/.test(value)) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed) && parsed >= 0) return parsed;
    throw new InvalidLastChangeError();
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed) || parsed < 0) throw new InvalidLastChangeError();
  return parsed;
}

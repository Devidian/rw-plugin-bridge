import { InvalidLastChangeError, parseLastChange } from '../src/validator/last-change-validator.js';

describe('parseLastChange', () => {
  it('accepts epoch milliseconds', () => {
    expect(parseLastChange('1700000000000')).toBe(1700000000000);
  });

  it('accepts ISO dates', () => {
    expect(parseLastChange('2026-06-29T00:00:00.000Z')).toBe(Date.parse('2026-06-29T00:00:00.000Z'));
  });

  it('rejects invalid input', () => {
    expect(() => parseLastChange('later')).toThrow(InvalidLastChangeError);
  });
});

import { describe, it, expect } from 'vitest';
import {
  formatPrice, sqmToPyeong, formatSizeWithPyeong,
  formatPriceShort, formatPriceAxis, formatNullable, formatArea, formatDateKo,
} from '@/lib/format';
import { makeSlug } from '@/lib/apt-url';

// ──────────────────────────────────────────────
// formatPriceShort
// ──────────────────────────────────────────────
describe('formatPriceShort', () => {
  it('32000 => "3.2억"', () => {
    expect(formatPriceShort(32000)).toBe('3.2억');
  });

  it('10000 => "1억"', () => {
    expect(formatPriceShort(10000)).toBe('1억');
  });

  it('15000 => "1.5억"', () => {
    expect(formatPriceShort(15000)).toBe('1.5억');
  });

  it('8500 => "8,500만"', () => {
    expect(formatPriceShort(8500)).toBe('8,500만');
  });

  it('500 => "500만"', () => {
    expect(formatPriceShort(500)).toBe('500만');
  });
});

// ──────────────────────────────────────────────
// formatPriceAxis
// ──────────────────────────────────────────────
describe('formatPriceAxis', () => {
  it('32000 => "3.2억"', () => {
    expect(formatPriceAxis(32000)).toBe('3.2억');
  });

  it('10000 => "1억"', () => {
    expect(formatPriceAxis(10000)).toBe('1억');
  });

  it('8500 => "8,500만"', () => {
    expect(formatPriceAxis(8500)).toBe('8,500만');
  });
});

// ──────────────────────────────────────────────
// formatNullable
// ──────────────────────────────────────────────
describe('formatNullable', () => {
  it('null => "-"', () => {
    expect(formatNullable(null)).toBe('-');
  });

  it('undefined => "-"', () => {
    expect(formatNullable(undefined)).toBe('-');
  });

  it('"" => "-"', () => {
    expect(formatNullable('')).toBe('-');
  });

  it('0 => "-"', () => {
    expect(formatNullable(0)).toBe('-');
  });

  it('"value" => "value"', () => {
    expect(formatNullable('value')).toBe('value');
  });

  it('123 => "123"', () => {
    expect(formatNullable(123)).toBe('123');
  });

  it('null with custom fallback => "N/A"', () => {
    expect(formatNullable(null, 'N/A')).toBe('N/A');
  });
});

// ──────────────────────────────────────────────
// formatArea
// ──────────────────────────────────────────────
describe('formatArea', () => {
  it('84.93 => "84.93㎡ (25.7평)"', () => {
    expect(formatArea(84.93)).toBe('84.93㎡ (25.7평)');
  });

  it('59.98 => "59.98㎡ (18.1평)"', () => {
    expect(formatArea(59.98)).toBe('59.98㎡ (18.1평)');
  });
});

// ──────────────────────────────────────────────
// formatDateKo
// ──────────────────────────────────────────────
describe('formatDateKo', () => {
  it('"2026-03-31T00:00:00Z" => "2026-03-31"', () => {
    expect(formatDateKo('2026-03-31T00:00:00Z')).toBe('2026-03-31');
  });

  it('"invalid" => "invalid"', () => {
    expect(formatDateKo('invalid')).toBe('invalid');
  });
});

// ──────────────────────────────────────────────
// makeSlug
// ──────────────────────────────────────────────
describe('makeSlug', () => {
  it('"11680", "래미안 아파트" => "11680-래미안-아파트"', () => {
    expect(makeSlug('11680', '래미안 아파트')).toBe('11680-래미안-아파트');
  });

  it('"11680", "래미안" => "11680-래미안"', () => {
    expect(makeSlug('11680', '래미안')).toBe('11680-래미안');
  });

  it('special chars stripped and collapsed', () => {
    expect(makeSlug('100', '서울 e-편한세상')).toBe('100-서울-e-편한세상');
  });
});

// ──────────────────────────────────────────────
// existing functions (regression)
// ──────────────────────────────────────────────
describe('existing functions', () => {
  it('formatPrice(32000) => "3억 2,000만"', () => {
    expect(formatPrice(32000)).toBe('3억 2,000만');
  });

  it('formatPrice(8500) => "8,500만"', () => {
    expect(formatPrice(8500)).toBe('8,500만');
  });

  it('sqmToPyeong(84.93) => 25.7', () => {
    expect(sqmToPyeong(84.93)).toBe(25.7);
  });

  it('formatSizeWithPyeong(84.93) => "84.93㎡ (25.7평)"', () => {
    expect(formatSizeWithPyeong(84.93)).toBe('84.93㎡ (25.7평)');
  });
});

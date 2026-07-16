import { describe, it, expect } from 'vitest';
import { linearScore, parseHumanBytes, clamp } from '../utils.js';

describe('linearScore', () => {
  it('returns 100 at best value', () => {
    expect(linearScore(100, 20, 100)).toBe(100);
  });
  it('returns 0 at worst value', () => {
    expect(linearScore(20, 20, 100)).toBe(0);
  });
  it('returns 50 at midpoint', () => {
    expect(linearScore(60, 20, 100)).toBe(50);
  });
  it('clamps below 0', () => {
    expect(linearScore(0, 20, 100)).toBe(0);
  });
  it('clamps above 100', () => {
    expect(linearScore(200, 20, 100)).toBe(100);
  });
});

describe('parseHumanBytes', () => {
  it('parses GB', () => expect(parseHumanBytes('1.5G')).toBe(1_610_612_736));
  it('parses MB', () => expect(parseHumanBytes('512M')).toBe(536_870_912));
  it('parses KB', () => expect(parseHumanBytes('100K')).toBe(102_400));
  it('returns 0 for invalid', () => expect(parseHumanBytes('??')).toBe(0));
});

describe('clamp', () => {
  it('clamps below min', () => expect(clamp(-5, 0, 100)).toBe(0));
  it('clamps above max', () => expect(clamp(150, 0, 100)).toBe(100));
  it('passes through in-range value', () => expect(clamp(50, 0, 100)).toBe(50));
});

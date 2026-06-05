// src/__tests__/smoke.test.js
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('environment runs', () => {
    expect(1 + 1).toBe(2);
  });
});

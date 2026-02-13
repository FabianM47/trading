/**
 * Unit Tests for Price Provider Interface Helpers
 */

import { describe, expect, it } from 'vitest';
import { isISIN, isSymbol } from '../price-provider.interface';

describe('Price Provider Helpers', () => {
  describe('isISIN', () => {
    it('should validate correct ISIN formats', () => {
      expect(isISIN('US0378331005')).toBe(true); // Apple
      expect(isISIN('DE0005140008')).toBe(true); // Deutsche Bank
      expect(isISIN('GB0005405286')).toBe(true); // HSBC
      expect(isISIN('FR0000120271')).toBe(true); // Total
    });

    it('should reject invalid ISIN formats', () => {
      expect(isISIN('AAPL')).toBe(false);          // Symbol
      expect(isISIN('US037833100')).toBe(false);   // Too short
      expect(isISIN('US03783310055')).toBe(false); // Too long
      expect(isISIN('us0378331005')).toBe(false);  // Lowercase
      expect(isISIN('12345678901')).toBe(false);   // Numbers only
      expect(isISIN('')).toBe(false);              // Empty
    });
  });

  describe('isSymbol', () => {
    it('should validate correct symbol formats', () => {
      expect(isSymbol('AAPL')).toBe(true);
      expect(isSymbol('MSFT')).toBe(true);
      expect(isSymbol('TSLA')).toBe(true);
      expect(isSymbol('BRK.B')).toBe(true); // Berkshire Hathaway Class B
      expect(isSymbol('A')).toBe(true);     // Single letter
    });

    it('should reject invalid symbol formats', () => {
      expect(isSymbol('US0378331005')).toBe(false); // ISIN
      expect(isSymbol('aapl')).toBe(false);         // Lowercase
      expect(isSymbol('TOOLONG')).toBe(false);      // Too long
      expect(isSymbol('123')).toBe(false);          // Numbers
      expect(isSymbol('AAPL-US')).toBe(false);      // Invalid separator
      expect(isSymbol('')).toBe(false);             // Empty
    });
  });
});

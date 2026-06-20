import {
  formatXLM,
  shortenAddress,
  isValidStellarAddress,
  stroopsToXLM,
  xlmToStroops,
} from '@/lib/stellar'

describe('stellar.ts utilities', () => {
  // ── Test 1 ───────────────────────────────────────────────────────────────
  describe('formatXLM', () => {
    it('formats 10_000_000 stroops as 1.00 XLM', () => {
      expect(formatXLM(10_000_000)).toContain('1.00')
      expect(formatXLM(10_000_000)).toContain('XLM')
    })

    it('formats 0 stroops as 0.00 XLM', () => {
      expect(formatXLM(0)).toContain('0.00')
    })

    it('handles bigint input', () => {
      expect(formatXLM(100_000_000n)).toContain('10.00')
    })
  })

  // ── Test 2 ───────────────────────────────────────────────────────────────
  describe('shortenAddress', () => {
    it('shortens a full Stellar address', () => {
      const addr = 'GABC1234567890ABCDE12345678901234567890ABCDE12345678901234'
      const short = shortenAddress(addr)
      expect(short).toContain('...')
      expect(short.length).toBeLessThan(addr.length)
    })

    it('returns original if too short', () => {
      const short = 'GABC'
      expect(shortenAddress(short)).toBe(short)
    })
  })

  // ── Test 3 ───────────────────────────────────────────────────────────────
  describe('isValidStellarAddress', () => {
    it('validates a correct 56-char G-address', () => {
      // Valid Stellar public key length: G + 55 chars = 56 total
      const valid = 'G' + 'A'.repeat(55)
      expect(isValidStellarAddress(valid)).toBe(true)
    })

    it('rejects addresses not starting with G', () => {
      const invalid = 'S' + 'A'.repeat(55)
      expect(isValidStellarAddress(invalid)).toBe(false)
    })

    it('rejects too-short addresses', () => {
      expect(isValidStellarAddress('GABCD')).toBe(false)
    })

    it('rejects lowercase characters', () => {
      const lower = 'G' + 'a'.repeat(55)
      expect(isValidStellarAddress(lower)).toBe(false)
    })
  })

  // ── Test 4 ───────────────────────────────────────────────────────────────
  describe('stroopsToXLM / xlmToStroops round-trip', () => {
    it('converts 100 XLM to stroops and back', () => {
      const stroops = xlmToStroops(100)
      expect(stroops).toBe(1_000_000_000n)
      expect(stroopsToXLM(stroops)).toBe(100)
    })

    it('converts 0.01 XLM correctly', () => {
      const stroops = xlmToStroops(0.01)
      expect(stroops).toBe(100_000n)
      expect(stroopsToXLM(100_000)).toBeCloseTo(0.01)
    })
  })
})

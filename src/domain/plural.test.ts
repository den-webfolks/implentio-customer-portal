import { describe, expect, it } from 'vitest'
import { plural } from './plural'

describe('plural', () => {
  it('uses the singular for exactly one', () => {
    expect(plural(1, 'invoice')).toBe('1 invoice')
  })
  it('uses the plural otherwise, with grouped digits', () => {
    expect(plural(0, 'finding')).toBe('0 findings')
    expect(plural(1204, 'package')).toBe('1,204 packages')
  })
  it('accepts an irregular plural', () => {
    expect(plural(2, 'variance group summary', 'variance group summaries')).toBe('2 variance group summaries')
  })
})

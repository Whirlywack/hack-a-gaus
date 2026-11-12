import { describe, expect, it } from 'vitest'
import { COPY } from '../src/copy/register'

// The copy register holds every interface string. These checks hold the
// spec's copy rules ("Interface copy") for every entry.

const entries = Object.entries(COPY)

describe('copy register', () => {
  it('is not empty', () => {
    expect(entries.length).toBeGreaterThan(0)
  })

  describe.each(entries)('%s', (_key, e) => {
    it('has an English intent and a Lithuanian text', () => {
      expect(e.en.trim()).not.toBe('')
      expect(e.lt.trim()).not.toBe('')
    })

    it('has no dash', () => {
      expect(e.lt).not.toMatch(/[‒-―−]| - /)
    })

    it('quotes with „…“, never straight quotes', () => {
      expect(e.lt).not.toContain('"')
    })

    it('writes "jūs" in lowercase inside a sentence', () => {
      expect(e.lt).not.toMatch(/.\bJūs/u)
    })

    it('is a boolean approval flag', () => {
      expect(typeof e.approved).toBe('boolean')
    })
  })

  it('no string is approved until the operator approves it (ticket #23)', () => {
    expect(entries.filter(([, e]) => e.approved)).toEqual([])
  })
})

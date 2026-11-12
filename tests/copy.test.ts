import { describe, expect, it } from 'vitest'
import { COPY, type CopyText } from '../src/copy/register'
import { copyRuleBreaks } from '../src/copy/rules'

// The copy register holds every interface string. Every entry, and every form
// of a counted entry, keeps the spec's copy rules ("Interface copy").

const entries = Object.entries(COPY)
const forms = (lt: CopyText): string[] => (typeof lt === 'string' ? [lt] : [lt.one, lt.few, lt.other])

describe('copy register', () => {
  it('is not empty', () => {
    expect(entries.length).toBeGreaterThan(0)
  })

  describe.each(entries)('%s', (_key, e) => {
    it('has an English intent and a Lithuanian text', () => {
      expect(e.en.trim()).not.toBe('')
      for (const form of forms(e.lt)) expect(form.trim()).not.toBe('')
    })

    it('keeps the copy rules', () => {
      for (const form of forms(e.lt)) expect(copyRuleBreaks(form), form).toEqual([])
    })

    it('holds the number as {n} in every form of a counted text', () => {
      if (typeof e.lt === 'string') return
      for (const form of forms(e.lt)) expect(form).toContain('{n}')
    })

    it('says whether the operator has approved it', () => {
      expect(typeof e.approved).toBe('boolean')
    })
  })
})

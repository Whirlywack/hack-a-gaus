import { describe, expect, it } from 'vitest'
import { copyRuleBreaks } from '../src/copy/rules'

// The spec's copy rules ("Interface copy"): the User is a lowercase "jūs",
// quotes are „…“, and interface text has no dashes.

describe('copy rules', () => {
  it.each([
    'Čia matysite naujus pirkimus.',
    'Jūs gausite laišką.',
    'Kodą išsiuntėme. Jums jis galioja valandą.',
    'Ar jums tinka „Keliai ir gatvės“?',
    'Įveskite kodą iš laiško, kurį jums atsiuntėme.',
  ])('passes "%s"', (text) => {
    expect(copyRuleBreaks(text)).toEqual([])
  })

  it.each([
    ['Parodysime, kas Jums tinka.', 'jūs'],
    ['Kodą siuntėme Jūsų adresu.', 'jūs'],
    ['Ar Jus tai domina?', 'jūs'],
    ['Su Jumis susisieksime.', 'jūs'],
  ])('flags a capitalised "jūs" inside a sentence: "%s"', (text, rule) => {
    expect(copyRuleBreaks(text)).toEqual([rule])
  })

  it.each([
    'Sritis "Keliai ir gatvės".',
    'Sritis “Keliai ir gatvės”.',
    "Sritis 'Keliai ir gatvės'.",
    'Sritis ‘Keliai ir gatvės’.',
    'Sritis „Keliai ir gatvės.',
    'Sritis Keliai ir gatvės“.',
    'Sritis „Keliai „ir“ gatvės“.',
  ])('flags quotes other than „…“: %s', (text) => {
    expect(copyRuleBreaks(text)).toEqual(['quotes'])
  })

  it.each([
    'Keliai – ir gatvės',
    'Keliai — ir gatvės',
    'Keliai - ir gatvės',
    '5–10 d.',
    '−5',
  ])('flags a dash: %s', (text) => {
    expect(copyRuleBreaks(text)).toEqual(['dash'])
  })

  it('lets a hyphen join a word', () => {
    expect(copyRuleBreaks('Žvyro-skaldos danga')).toEqual([])
  })
})

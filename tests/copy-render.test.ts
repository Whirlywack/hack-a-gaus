import { describe, expect, it } from 'vitest'
import { render } from '../src/copy/register'

// How a register text becomes what the screen shows: values go into {name}
// slots, and a counted text picks its Lithuanian form by the number n.

describe('render', () => {
  it('fills a {name} slot with its value', () => {
    expect(render('Baigiasi {date}', { date: 'lapkričio 18 d., 14:00' })).toBe('Baigiasi lapkričio 18 d., 14:00')
  })

  it('writes a number the Lithuanian way, with a non-breaking space between thousands', () => {
    expect(render('{n} sutarčių', { n: 1468 })).toBe('1 468 sutarčių')
  })

  // Spec, "Interface copy": 1 sritis, 2 sritys, 10 sričių.
  const trades = { one: '{n} sritis', few: '{n} sritys', other: '{n} sričių' }

  it.each([
    [1, '1 sritis'],
    [2, '2 sritys'],
    [9, '9 sritys'],
    [10, '10 sričių'],
    [11, '11 sričių'],
    [19, '19 sričių'],
    [21, '21 sritis'],
    [22, '22 sritys'],
    [0, '0 sričių'],
  ])('counts %i as "%s"', (n, expected) => {
    expect(render(trades, { n })).toBe(expected)
  })

  it.each([
    ['no n', {}],
    ['n as text', { n: '3' }],
    ['a fraction', { n: 1.5 }],
  ])('refuses a counted text given %s', (_, values) => {
    expect(() => render(trades, values)).toThrow(/whole number/)
  })

  it('refuses a text whose slot has no value, instead of showing "undefined"', () => {
    expect(() => render('Baigiasi {date}', {})).toThrow(/\{date\}/)
  })
})

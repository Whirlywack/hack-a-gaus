import { describe, expect, it } from 'vitest'
import { assertPageShape, feedFetcher } from '../loader/notices.ts'

const KEY = 'key-that-must-never-show-9f3a'

// A stand-in for fetch that answers from a script, and a sleep that only records.
function stand(script: Array<Response | Error>) {
  const calls: { url: string; init: RequestInit }[] = []
  const waits: number[] = []
  const fetchPage = feedFetcher({
    key: KEY,
    fetch: async (url, init) => {
      calls.push({ url: String(url), init: init ?? {} })
      const next = script.shift()
      if (!next) throw new Error('script ran out')
      if (next instanceof Error) throw next
      return next
    },
    sleep: async (ms) => {
      waits.push(ms)
    },
  })
  return { fetchPage, calls, waits }
}

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })
const status = (n: number) => new Response('{}', { status: n })

describe('fetching a page of the feed', () => {
  it('posts the page size and number, with the key in the apiKey header', async () => {
    const { fetchPage, calls } = stand([ok([{ id: 1 }])])
    expect(await fetchPage(1000, 3)).toEqual([{ id: 1 }])
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('https://viesiejipirkimai.lt/epps-integration/api/cft-details-export')
    expect(calls[0].init.method).toBe('POST')
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ pageSize: 1000, pageNum: 3 })
    expect(new Headers(calls[0].init.headers).get('apiKey')).toBe(KEY)
  })

  it('retries a server error, a rate limit, a network failure and unreadable JSON, waiting longer each time', async () => {
    const { fetchPage, waits } = stand([
      status(502),
      status(429),
      new TypeError('fetch failed'),
      new Response('not json', { status: 200 }),
      ok([]),
    ])
    expect(await fetchPage(1000, 1)).toEqual([])
    expect(waits).toEqual([1000, 2000, 4000, 8000])
  })

  it('gives up after 5 attempts, without the key in the error', async () => {
    const { fetchPage, calls } = stand([status(503), status(503), status(503), status(503), status(503)])
    const error = await fetchPage(1000, 7).catch((e: Error) => e)
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toMatch(/page 7.*after 5 attempts.*HTTP 503/)
    expect((error as Error).message).not.toContain(KEY)
    expect(calls).toHaveLength(5)
  })

  it('fails at once when the key is refused', async () => {
    const { fetchPage, calls } = stand([status(401)])
    const error = (await fetchPage(1000, 1).catch((e: Error) => e)) as Error
    expect(error.message).toMatch(/HTTP 401.*key was refused/)
    expect(error.message).not.toContain(KEY)
    expect(calls).toHaveLength(1)
  })

  it('fails at once on any other client error', async () => {
    const { fetchPage, calls } = stand([status(400)])
    await expect(fetchPage(5000, 1)).rejects.toThrow(/HTTP 400/)
    expect(calls).toHaveLength(1)
  })

  it('fails loudly, without retrying, when the answer is not a list of records', async () => {
    const { fetchPage, calls } = stand([ok({ title: 'Unauthorized', status: 401 })])
    await expect(fetchPage(1000, 4)).rejects.toThrow(/page 4.*not a list/)
    expect(calls).toHaveLength(1)
  })

  it('refuses to start without a key', () => {
    expect(() => feedFetcher({ key: '' })).toThrow(/key is not set/)
  })
})

// An envelope or error object read as a page would look empty and end the walk early.
describe('the shape of a page', () => {
  it('may be a list, empty or not', () => {
    expect(() => assertPageShape([], 1)).not.toThrow()
    expect(() => assertPageShape([{ id: 1 }], 2)).not.toThrow()
  })

  it('may not be anything else', () => {
    for (const bad of [{}, null, undefined, 'x', 42, { items: [] }]) {
      expect(() => assertPageShape(bad, 7)).toThrow(/page 7.*not a list/)
    }
  })
})

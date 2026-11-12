import { readFileSync } from 'node:fs'

// The Jurbarkas fixture from the handoff: 230 Contracts of one Buyer, with
// titles and CPV codes (spec, "Seam 1: matching"). Contracts carry no
// main-code flag, so the first listed code is the main one.

export type Contract = {
  id: string
  title: string
  /** Every CPV code as the file lists it, check digit included ("45233252-0"). */
  codes: string[]
}

type Row = { dok_id: string; title: string; cpv: string }

const file = new URL('../../handoff-from-claude/data/jurbarkas.json', import.meta.url)
const rows: Row[] = JSON.parse(readFileSync(file, 'utf8')).contracts

export const contracts: Contract[] = rows.map((r) => ({
  id: r.dok_id,
  title: r.title,
  codes: r.cpv
    .split(';')
    .map((code) => code.trim())
    .filter(Boolean),
}))

export function contract(id: string): Contract {
  const found = contracts.find((c) => c.id === id)
  if (!found) throw new Error(`Contract ${id} is not in the Jurbarkas file`)
  return found
}

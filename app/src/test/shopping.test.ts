import { describe, it, expect } from 'vitest'
import { groupByCat, recommendations, shopBaseName, shopInfo, suggest } from '../lib/shopping'
import type { Task } from '../lib/model'

const t = (text: string, done = false): Task => ({ id: text, text, done })

describe('Einkaufsliste', () => {
  it('erkennt Artikel exakt und per Teilstring, sonst Sonstiges', () => {
    expect(shopInfo('Apfel')).toEqual({ emoji: '🍎', cat: 'obst' })
    expect(shopInfo('Bio-Hafermilch (2x)')).toEqual({ emoji: '🥛', cat: 'milch' })
    expect(shopInfo('Kabelbinder')).toEqual({ emoji: '🛒', cat: 'sonst' })
    expect(shopBaseName('Milch (1 L)')).toBe('milch')
  })

  it('gruppiert nach Kategorie in Katalog-Reihenfolge', () => {
    const g = groupByCat([t('Klopapier'), t('Banane'), t('Käse'), t('Apfel')])
    expect(g.map((x) => x.cat.id)).toEqual(['obst', 'milch', 'haushalt'])
    expect(g[0].items.map((x) => x.text)).toEqual(['Banane', 'Apfel'])
  })

  it('schlägt Katalog-Einträge vor, Präfix zuerst', () => {
    expect(suggest('ka', new Set())).toEqual(expect.arrayContaining(['kaffee', 'kartoffel', 'karotte']))
    expect(suggest('ka', new Set())[0].startsWith('ka')).toBe(true)
    expect(suggest('', new Set())).toEqual([])
    expect(suggest('kaffee', new Set(['kaffee']))).not.toContain('kaffee')
  })

  it('empfiehlt Essensplan-Zutaten vor Verlauf und nichts von der Liste', () => {
    const extra = { mealPlan: { days: [{ tag: 'Mo', abend: { name: 'Pasta', zutaten: ['Nudeln', 'Parmesan'] } }] } }
    const hist = { milch: { n: 5, ts: 1 }, brot: { n: 2, ts: 2 }, nudeln: { n: 9, ts: 3 } }
    const r = recommendations([t('Milch')], hist, extra)
    expect(r).toEqual(['nudeln', 'parmesan', 'brot'])
  })
})

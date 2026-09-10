import { describe, it, expect } from 'vitest'
import { groupByCat, parseQuantity, recentItems, recommendations, seasonalItems, shopBaseName, shopInfo, suggest } from '../lib/shopping'
import type { Task } from '../lib/model'

const t = (text: string, done = false): Task => ({ id: text, text, done })

describe('Einkaufsliste', () => {
  it('erkennt Artikel exakt und per Teilstring, sonst Sonstiges', () => {
    expect(shopInfo('Apfel')).toEqual({ emoji: '🍎', cat: 'obst' })
    expect(shopInfo('Bio-Hafermilch (2x)')).toEqual({ emoji: '🥛', cat: 'milch' })
    expect(shopInfo('Kabelbinder')).toEqual({ emoji: '🛒', cat: 'sonst' })
    // Längster Treffer statt Katalogreihenfolge: kein Ei mehr für alles mit „ei", keine Butter für Erdnussbutter
    expect(shopInfo('Basmatireis').emoji).toBe('🍚')
    expect(shopInfo('Jasminreis').emoji).toBe('🍚')
    expect(shopInfo('Reisnudeln').emoji).toBe('🍜')
    expect(shopInfo('Soja-Ei').emoji).toBe('🥚')
    expect(shopInfo('Spiegelei').emoji).toBe('🥚')
    expect(shopInfo('Erdnussbutter').emoji).toBe('🥜')
    expect(shopInfo('Kokosmilch')).toEqual({ emoji: '🥥', cat: 'vorrat' })
    expect(shopInfo('Naturtofu')).toEqual({ emoji: '🫘', cat: 'milch' })
    expect(shopInfo('Mandelmilch').emoji).toBe('🥛')
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

  it('liefert zuletzt gekaufte Artikel nach Zeit, ohne Listen-Einträge', () => {
    const hist = { milch: { n: 1, ts: 10 }, brot: { n: 9, ts: 30 }, eier: { n: 2, ts: 20 } }
    expect(recentItems([t('Eier')], hist)).toEqual(['brot', 'milch'])
  })

  it('liest Mengen aus der Eingabe', () => {
    expect(parseQuantity('2 kg Kartoffeln')).toEqual({ name: 'Kartoffeln', qty: '2 kg' })
    expect(parseQuantity('Milch 3x')).toEqual({ name: 'Milch', qty: '3 Stk.' })
    expect(parseQuantity('500g Hack')).toEqual({ name: 'Hack', qty: '500 g' })
    expect(parseQuantity('1,5 l Wasser')).toEqual({ name: 'Wasser', qty: '1,5 L' })
    expect(parseQuantity('Eier')).toEqual({ name: 'Eier' })
    expect(parseQuantity('2 Bund Petersilie')).toEqual({ name: 'Petersilie', qty: '2 Bund' })
  })
})

describe('Saison', () => {
  it('schlägt Saisonware vor, die nicht auf der Liste steht', () => {
    expect(seasonalItems(9, [{ id: '1', text: 'Apfel', done: false }])).toEqual(['Pflaume', 'Kürbis', 'Trauben', 'Birne', 'Pilze', 'Brokkoli'])
    expect(seasonalItems(13, [])).toEqual([])
  })
})

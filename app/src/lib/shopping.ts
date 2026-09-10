import type { Task } from './model'

/** Bring-Stil: Kategorien und Artikel-Katalog (aus v7 übernommen) */
export const SHOP_CATS = [
  { id: 'obst', name: 'Obst & Gemüse', emoji: '🥦' },
  { id: 'brot', name: 'Brot & Backwaren', emoji: '🍞' },
  { id: 'milch', name: 'Milchprodukte & Eier', emoji: '🧀' },
  { id: 'fleisch', name: 'Fleisch & Fisch', emoji: '🍗' },
  { id: 'vorrat', name: 'Vorrat, Nudeln & Gewürze', emoji: '🥫' },
  { id: 'tk', name: 'Tiefkühl', emoji: '🧊' },
  { id: 'getraenke', name: 'Getränke', emoji: '🧃' },
  { id: 'suess', name: 'Süßes & Snacks', emoji: '🍫' },
  { id: 'haushalt', name: 'Haushalt & Pflege', emoji: '🧻' },
  { id: 'sonst', name: 'Sonstiges', emoji: '🛒' },
] as const

export type ShopCat = (typeof SHOP_CATS)[number]['id']

const C = (emoji: string, cat: ShopCat): [string, ShopCat] => [emoji, cat]

export const SHOP_CATALOG: Record<string, [string, ShopCat]> = {
  apfel: C('🍎', 'obst'), banane: C('🍌', 'obst'), birne: C('🍐', 'obst'), orange: C('🍊', 'obst'), zitrone: C('🍋', 'obst'), traube: C('🍇', 'obst'), erdbeere: C('🍓', 'obst'), blaubeere: C('🫐', 'obst'), himbeere: C('🍓', 'obst'), melone: C('🍉', 'obst'), kiwi: C('🥝', 'obst'), mango: C('🥭', 'obst'), avocado: C('🥑', 'obst'),
  tomate: C('🍅', 'obst'), gurke: C('🥒', 'obst'), paprika: C('🫑', 'obst'), salat: C('🥬', 'obst'), spinat: C('🥬', 'obst'), karotte: C('🥕', 'obst'), möhre: C('🥕', 'obst'), kartoffel: C('🥔', 'obst'), zwiebel: C('🧅', 'obst'), knoblauch: C('🧄', 'obst'), brokkoli: C('🥦', 'obst'), blumenkohl: C('🥦', 'obst'), zucchini: C('🥒', 'obst'), aubergine: C('🍆', 'obst'), pilze: C('🍄', 'obst'), champignon: C('🍄', 'obst'), ingwer: C('🫚', 'obst'), mais: C('🌽', 'obst'), kürbis: C('🎃', 'obst'), lauch: C('🥬', 'obst'), porree: C('🥬', 'obst'), kohl: C('🥬', 'obst'), radieschen: C('🥕', 'obst'), rucola: C('🥬', 'obst'), basilikum: C('🌿', 'obst'), petersilie: C('🌿', 'obst'), koriander: C('🌿', 'obst'), schnittlauch: C('🌿', 'obst'), kräuter: C('🌿', 'obst'),
  brot: C('🍞', 'brot'), brötchen: C('🥐', 'brot'), toast: C('🍞', 'brot'), baguette: C('🥖', 'brot'), croissant: C('🥐', 'brot'), wrap: C('🌯', 'brot'), tortilla: C('🌯', 'brot'), vollkorn: C('🍞', 'brot'),
  milch: C('🥛', 'milch'), butter: C('🧈', 'milch'), käse: C('🧀', 'milch'), gouda: C('🧀', 'milch'), mozzarella: C('🧀', 'milch'), parmesan: C('🧀', 'milch'), feta: C('🧀', 'milch'), joghurt: C('🥛', 'milch'), quark: C('🥛', 'milch'), sahne: C('🥛', 'milch'), schmand: C('🥛', 'milch'), frischkäse: C('🧀', 'milch'), ei: C('🥚', 'milch'), eier: C('🥚', 'milch'), hafermilch: C('🥛', 'milch'), sojamilch: C('🥛', 'milch'),
  hähnchen: C('🍗', 'fleisch'), huhn: C('🍗', 'fleisch'), hühnchen: C('🍗', 'fleisch'), pute: C('🍗', 'fleisch'), rind: C('🥩', 'fleisch'), hack: C('🥩', 'fleisch'), schwein: C('🥩', 'fleisch'), steak: C('🥩', 'fleisch'), wurst: C('🌭', 'fleisch'), schinken: C('🥓', 'fleisch'), speck: C('🥓', 'fleisch'), salami: C('🍕', 'fleisch'), lachs: C('🐟', 'fleisch'), fisch: C('🐟', 'fleisch'), thunfisch: C('🐟', 'fleisch'), garnele: C('🦐', 'fleisch'), tofu: C('🧊', 'fleisch'),
  nudel: C('🍝', 'vorrat'), pasta: C('🍝', 'vorrat'), spaghetti: C('🍝', 'vorrat'), reis: C('🍚', 'vorrat'), couscous: C('🍚', 'vorrat'), quinoa: C('🍚', 'vorrat'), mehl: C('🌾', 'vorrat'), zucker: C('🍬', 'vorrat'), salz: C('🧂', 'vorrat'), pfeffer: C('🧂', 'vorrat'), öl: C('🫒', 'vorrat'), olivenöl: C('🫒', 'vorrat'), essig: C('🫒', 'vorrat'), honig: C('🍯', 'vorrat'), marmelade: C('🍯', 'vorrat'), müsli: C('🥣', 'vorrat'), haferflocken: C('🥣', 'vorrat'), cornflakes: C('🥣', 'vorrat'), linsen: C('🥫', 'vorrat'), bohnen: C('🥫', 'vorrat'), kichererbsen: C('🥫', 'vorrat'), tomatenmark: C('🥫', 'vorrat'), passierte: C('🥫', 'vorrat'), kokosmilch: C('🥥', 'vorrat'), sojasauce: C('🥢', 'vorrat'), curry: C('🍛', 'vorrat'), gewürz: C('🧂', 'vorrat'), brühe: C('🥣', 'vorrat'), nüsse: C('🥜', 'vorrat'), erdnuss: C('🥜', 'vorrat'), mandel: C('🥜', 'vorrat'),
  pizza: C('🍕', 'tk'), pommes: C('🍟', 'tk'), tiefkühl: C('🧊', 'tk'), eis: C('🍨', 'tk'),
  wasser: C('💧', 'getraenke'), saft: C('🧃', 'getraenke'), apfelsaft: C('🧃', 'getraenke'), orangensaft: C('🧃', 'getraenke'), cola: C('🥤', 'getraenke'), limo: C('🥤', 'getraenke'), bier: C('🍺', 'getraenke'), wein: C('🍷', 'getraenke'), kaffee: C('☕', 'getraenke'), tee: C('🍵', 'getraenke'),
  schokolade: C('🍫', 'suess'), schoko: C('🍫', 'suess'), keks: C('🍪', 'suess'), chips: C('🥨', 'suess'), gummibär: C('🍬', 'suess'), bonbon: C('🍬', 'suess'), kuchen: C('🍰', 'suess'),
  klopapier: C('🧻', 'haushalt'), toilettenpapier: C('🧻', 'haushalt'), küchenrolle: C('🧻', 'haushalt'), spülmittel: C('🧴', 'haushalt'), waschmittel: C('🧴', 'haushalt'), putzmittel: C('🧴', 'haushalt'), müllbeutel: C('🗑️', 'haushalt'), zahnpasta: C('🪥', 'haushalt'), shampoo: C('🧴', 'haushalt'), seife: C('🧼', 'haushalt'), deo: C('🧴', 'haushalt'), alufolie: C('🧻', 'haushalt'), frischhaltefolie: C('🧻', 'haushalt'), backpapier: C('🧻', 'haushalt'), batterie: C('🔋', 'haushalt'),
}

/** Basisname ohne Mengenangabe in Klammern, klein geschrieben */
export function shopBaseName(text: string): string {
  return (text || '').toLowerCase().replace(/\(.*?\)/g, '').trim()
}

export function shopInfo(text: string): { emoji: string; cat: ShopCat } {
  const n = shopBaseName(text)
  if (SHOP_CATALOG[n]) return { emoji: SHOP_CATALOG[n][0], cat: SHOP_CATALOG[n][1] }
  for (const k of Object.keys(SHOP_CATALOG)) if (n.includes(k)) return { emoji: SHOP_CATALOG[k][0], cat: SHOP_CATALOG[k][1] }
  return { emoji: '🛒', cat: 'sonst' }
}

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Katalog-Vorschläge zur Eingabe (Präfix zuerst, dann Teilstring) */
export function suggest(query: string, exclude: Set<string>, limit = 8): string[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const keys = Object.keys(SHOP_CATALOG).filter((k) => !exclude.has(k))
  const pre = keys.filter((k) => k.startsWith(q))
  const sub = keys.filter((k) => !k.startsWith(q) && k.includes(q))
  return [...pre, ...sub].slice(0, limit)
}

/** Zutaten aus dem v7-Essensplan (liegt in extra.mealPlan), falls vorhanden */
export function mealPlanIngredients(extra: Record<string, unknown>): string[] {
  const mp = extra.mealPlan as { days?: Record<string, unknown>[] } | undefined
  const out: string[] = []
  for (const day of mp?.days ?? []) {
    for (const slot of ['fruehstueck', 'mittag', 'abend']) {
      const meal = day[slot] as { zutaten?: unknown } | undefined
      if (Array.isArray(meal?.zutaten)) for (const z of meal.zutaten) if (typeof z === 'string') out.push(z)
    }
  }
  return out
}

/** Empfehlungen: Essensplan-Zutaten zuerst, dann Kaufverlauf nach Häufigkeit; nichts, was schon auf der Liste steht */
export function recommendations(items: Task[], history: Record<string, { n: number; ts: number }>, extra: Record<string, unknown>, limit = 8): string[] {
  const onList = new Set(items.map((t) => shopBaseName(t.text)))
  const hist = Object.entries(history).sort((a, b) => b[1].n - a[1].n || b[1].ts - a[1].ts).map((e) => e[0])
  const plan = mealPlanIngredients(extra).map(shopBaseName)
  const out: string[] = []
  const seen = new Set<string>()
  for (const src of [...plan, ...hist]) {
    if (out.length >= limit) break
    if (!src || onList.has(src) || seen.has(src)) continue
    seen.add(src)
    out.push(src)
  }
  return out
}

/** Einheiten für die Mengenauswahl (Bring-Stil); Vorschlag je Kategorie */
export const UNITS = ['Stk.', 'g', 'kg', 'ml', 'L', 'Pck.', 'Bund', 'Dose', 'Glas', 'Fl.'] as const
export type Unit = (typeof UNITS)[number]

export function defaultUnit(cat: ShopCat): Unit {
  if (cat === 'obst') return 'Stk.'
  if (cat === 'fleisch') return 'g'
  if (cat === 'getraenke') return 'Fl.'
  if (cat === 'vorrat' || cat === 'suess' || cat === 'tk') return 'Pck.'
  return 'Stk.'
}

/** "2 kg Kartoffeln", "Milch 3x", "3 Stk Eier" → Name + Menge */
export function parseQuantity(input: string): { name: string; qty?: string } {
  const s = input.trim().replace(/\s+/g, ' ')
  const unitRe = '(stk\\.?|st\\.?|x|g|kg|ml|l|pck\\.?|packung|bund|dose|dosen|glas|fl\\.?|flasche|flaschen)'
  const lead = new RegExp('^(\\d+(?:[.,]\\d+)?)\\s*' + unitRe + '?\\s+(.+)$', 'i').exec(s)
  if (lead) return { name: lead[3], qty: normalizeQty(lead[1], lead[2]) }
  const trail = new RegExp('^(.+?)\\s+(\\d+(?:[.,]\\d+)?)\\s*' + unitRe + '?$', 'i').exec(s)
  if (trail) return { name: trail[1], qty: normalizeQty(trail[2], trail[3]) }
  return { name: s }
}

function normalizeQty(num: string, unit?: string): string {
  const u = (unit ?? '').toLowerCase().replace('.', '')
  const map: Record<string, Unit> = { stk: 'Stk.', st: 'Stk.', x: 'Stk.', g: 'g', kg: 'kg', ml: 'ml', l: 'L', pck: 'Pck.', packung: 'Pck.', bund: 'Bund', dose: 'Dose', dosen: 'Dose', glas: 'Glas', fl: 'Fl.', flasche: 'Fl.', flaschen: 'Fl.' }
  return num.replace('.', ',') + ' ' + (map[u] ?? 'Stk.')
}

/** Zuletzt gekaufte Artikel (neueste zuerst), die nicht auf der Liste stehen */
export function recentItems(items: Task[], history: Record<string, { n: number; ts: number }>, limit = 8): string[] {
  const onList = new Set(items.map((t) => shopBaseName(t.text)))
  return Object.entries(history)
    .sort((a, b) => b[1].ts - a[1].ts)
    .map((e) => e[0])
    .filter((n) => n && !onList.has(n))
    .slice(0, limit)
}

export function groupByCat(items: Task[]): { cat: (typeof SHOP_CATS)[number]; items: Task[] }[] {
  const by = new Map<ShopCat, Task[]>()
  for (const t of items) {
    const c = shopInfo(t.text).cat
    by.set(c, [...(by.get(c) ?? []), t])
  }
  return SHOP_CATS.filter((c) => by.has(c.id)).map((c) => ({ cat: c, items: by.get(c.id)! }))
}

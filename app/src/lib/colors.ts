import type { ColorKey } from './model'

/** CSS-Variable zur Terminfarbe (Tokens in index.css) */
export const colorVar = (k: ColorKey) => 'var(--' + k + ')'

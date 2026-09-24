/**
 * Count + noun with the right number: plural(1, 'invoice') → "1 invoice",
 * plural(1204, 'package') → "1,204 packages". Pass `many` for irregular nouns.
 */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`
}

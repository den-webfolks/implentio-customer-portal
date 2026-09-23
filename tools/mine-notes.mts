/**
 * Mines the prototype's 309 embedded requirement notes (the DCLogic
 * callouts() method) into PRODUCT.md, grouped by scope with original note
 * numbers preserved for traceability.
 *
 * Usage: node tools/decode-template.mts && node tools/mine-notes.mts
 */
import { readFileSync, writeFileSync } from 'node:fs'

interface Note {
  n: number
  scope: string
  title: string
  requirement?: string
  behavior?: string
  dependency?: string
  constraint?: string
  acceptance?: string
}

const html = readFileSync('.local/template-decoded.html', 'utf8')
const start = html.indexOf('callouts() {')
if (start < 0) throw new Error('callouts() not found — run tools/decode-template.mts first')
const retIdx = html.indexOf('return [', start)
// Find the matching closing bracket of the returned array.
let depth = 0
let end = -1
for (let i = html.indexOf('[', retIdx); i < html.length; i++) {
  const ch = html[i]
  if (ch === '[') depth++
  else if (ch === ']') {
    depth--
    if (depth === 0) {
      end = i + 1
      break
    }
  }
}
if (end < 0) throw new Error('could not find end of callouts array')

const constsSrc = html.slice(start + 'callouts() {'.length, retIdx)
const arraySrc = html.slice(html.indexOf('[', retIdx), end)

// The array is plain object literals referencing the style consts above.
// Evaluate it in isolation (our own committed prototype source).
const notes = new Function(`${constsSrc}; return ${arraySrc};`)() as Note[]
console.log(`mined ${notes.length} notes`)

const byScope = new Map<string, Note[]>()
for (const note of notes) {
  const list = byScope.get(note.scope) ?? []
  list.push(note)
  byScope.set(note.scope, list)
}

const field = (label: string, value?: string) =>
  value && value !== 'None.' ? `  - **${label}:** ${value}\n` : ''

let md = `# Implentio — Product Requirements (mined from the prototype)

The Phase-1 prototype embedded ${notes.length} numbered requirement notes
("product notes") written for engineers. This file preserves them verbatim,
grouped by scope, with original note numbers for traceability. They describe
the *intended* product behavior; the parity build implements the shipped
subset, and scopes such as "Deferred to 3.0" and "Illustrative Only" mark
work that is explicitly out of Phase 1 scope.

Regenerate with: \`node tools/decode-template.mts && node tools/mine-notes.mts\`

`

const scopeOrder = [...byScope.keys()].sort((a, b) => {
  const diff = (byScope.get(b)?.length ?? 0) - (byScope.get(a)?.length ?? 0)
  return diff !== 0 ? diff : a.localeCompare(b)
})

md += '## Contents\n\n'
for (const scope of scopeOrder) {
  md += `- ${scope} (${byScope.get(scope)?.length} notes)\n`
}
md += '\n'

for (const scope of scopeOrder) {
  md += `## ${scope}\n\n`
  const list = (byScope.get(scope) ?? []).slice().sort((a, b) => a.n - b.n)
  for (const note of list) {
    md += `### Note ${note.n}: ${note.title}\n\n`
    md += field('Requirement', note.requirement)
    md += field('Behavior', note.behavior)
    md += field('Dependency', note.dependency)
    md += field('Constraint', note.constraint)
    md += field('Acceptance', note.acceptance)
    md += '\n'
  }
}

writeFileSync('PRODUCT.md', md)
console.log(`wrote PRODUCT.md (${md.length} chars)`)

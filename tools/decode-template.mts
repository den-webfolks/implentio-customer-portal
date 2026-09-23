/**
 * Regenerates the decoded prototype app HTML (the JSON-escaped template that
 * holds the markup, CSS and the DCLogic component source) for inspection.
 *
 * Usage: node tools/decode-template.mts [out-path]   (default .local/template-decoded.html)
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

const TEMPLATE_DIR = 'prototype/data/special/004-__bundler-template'
const out = process.argv[2] ?? '.local/template-decoded.html'

const raw = readdirSync(TEMPLATE_DIR)
  .filter((f) => f.startsWith('chunk-'))
  .sort()
  .map((f) => readFileSync(join(TEMPLATE_DIR, f), 'utf8'))
  .join('')

const html: string = JSON.parse(raw)
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, html)
console.log(`decoded ${html.length} chars -> ${out}`)

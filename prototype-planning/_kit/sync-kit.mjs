// Inline the shared planning kit into every prototype-planning/*.html file so
// each one stays self-contained. Idempotent: it replaces the contents of
// <style id="kit"> and <script id="kit"> (empty on a new file).
//   node prototype-planning/_kit/sync-kit.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const kitDir = dirname(fileURLToPath(import.meta.url))
const root = dirname(kitDir)
const css = readFileSync(join(kitDir, 'kit.css'), 'utf8')
const js = readFileSync(join(kitDir, 'kit.js'), 'utf8')
// A closing tag inside the kit would end the inlined block early.
if (/<\/style/i.test(css) || /<\/script/i.test(js)) throw new Error('kit source contains a closing style/script tag')

// Anchor on text only the kit has, so an earlier broken inline is repaired too.
const STYLE = /<style id="kit">(?:<\/style>|[\s\S]*?--ds-purple-700[\s\S]*?<\/style>)/
const SCRIPT = /<script id="kit">(?:<\/script>|[\s\S]*?window\.kit = [\s\S]*?<\/script>)/

for (const name of readdirSync(root).filter((f) => f.endsWith('.html'))) {
  const file = join(root, name)
  const src = readFileSync(file, 'utf8')
  const out = src
    .replace(STYLE, () => `<style id="kit">\n${css}</style>`)
    .replace(SCRIPT, () => `<script id="kit">\n${js}</script>`)
  if (out !== src) writeFileSync(file, out)
  console.log(`${out !== src ? 'synced   ' : 'unchanged'} ${name}`)
}

/**
 * Extracts the prototype's structured demo data (window.CM_DATA and
 * window.CM_PKG — the golden credit memo and its package-level breakdown)
 * from the bundler manifest into committed JSON fixtures.
 *
 * The emitted JSON is validated at load time by src/demo/fixtures/schema.ts;
 * this script only checks the payloads parse and carry the expected roots.
 *
 * Usage: node tools/extract-fixtures.mts
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'

const MANIFEST_DIR = 'prototype/data/manifests/001-__bundler-manifest'
const OUT_DIR = 'src/demo/fixtures'

const SOURCES = [
  { uuid: '747ac2c9-00f9-492b-aae0-18f29313e5dc', global: 'CM_DATA', out: 'cm-data.json' },
  { uuid: '226fdf52-27d6-48d6-8c4d-04475992fd60', global: 'CM_PKG', out: 'cm-pkg.json' },
] as const

const manifest: Record<string, { mime: string; data: string; compressed?: boolean }> = JSON.parse(
  readdirSync(MANIFEST_DIR)
    .filter((f) => f.startsWith('chunk-'))
    .sort()
    .map((f) => readFileSync(join(MANIFEST_DIR, f), 'utf8'))
    .join(''),
)

for (const src of SOURCES) {
  const entry = manifest[src.uuid]
  if (!entry) throw new Error(`uuid not found in manifest: ${src.uuid}`)
  let buf = Buffer.from(entry.data, 'base64')
  if (entry.compressed) buf = gunzipSync(buf)
  const js = buf.toString('utf8').trim()
  const prefix = `window.${src.global} = `
  if (!js.startsWith(prefix)) throw new Error(`${src.global}: unexpected payload prefix`)
  const json = js.slice(prefix.length).replace(/;\s*$/, '')
  const parsed: unknown = JSON.parse(json)
  if (typeof parsed !== 'object' || parsed === null || !('memoId' in parsed))
    throw new Error(`${src.global}: parsed payload missing memoId`)
  const outPath = join(OUT_DIR, src.out)
  writeFileSync(outPath, JSON.stringify(parsed, null, 1) + '\n')
  console.log(`${src.global} -> ${outPath}`)
}

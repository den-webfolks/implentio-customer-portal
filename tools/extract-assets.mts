/**
 * Extracts binary assets (fonts, logos, report files, data scripts) from the
 * prototype's bundler manifest into the working tree.
 *
 * The manifest is a JSON object {uuid: {mime, data(base64), compressed}} split
 * across prototype/data/manifests/001-__bundler-manifest/chunk-*.txt.
 *
 * Usage: node tools/extract-assets.mts <uuid> <out-path> [<uuid> <out-path> ...]
 *        node tools/extract-assets.mts --list
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { gunzipSync } from 'node:zlib'

const MANIFEST_DIR = 'prototype/data/manifests/001-__bundler-manifest'

function loadManifest(): Record<string, { mime: string; data: string; compressed?: boolean }> {
  const chunks = readdirSync(MANIFEST_DIR)
    .filter((f) => f.startsWith('chunk-'))
    .sort()
    .map((f) => readFileSync(join(MANIFEST_DIR, f), 'utf8'))
  return JSON.parse(chunks.join(''))
}

const args = process.argv.slice(2)
const manifest = loadManifest()

if (args[0] === '--list') {
  for (const [uuid, entry] of Object.entries(manifest)) {
    const bytes = Buffer.from(entry.data, 'base64')
    console.log(`${uuid}  ${entry.mime}  ${bytes.length}b  compressed=${!!entry.compressed}`)
  }
  process.exit(0)
}

if (args.length === 0 || args.length % 2 !== 0) {
  console.error('Usage: node tools/extract-assets.mts <uuid> <out-path> [...] | --list')
  process.exit(1)
}

for (let i = 0; i < args.length; i += 2) {
  const uuid = args[i]
  const outPath = args[i + 1]
  if (uuid === undefined || outPath === undefined) break
  const entry = manifest[uuid]
  if (!entry) {
    console.error(`uuid not found in manifest: ${uuid}`)
    process.exit(1)
  }
  let bytes = Buffer.from(entry.data, 'base64')
  if (entry.compressed) bytes = gunzipSync(bytes)
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, bytes)
  console.log(`${uuid} (${entry.mime}) -> ${outPath} (${bytes.length} bytes)`)
}

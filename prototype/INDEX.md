# Prototype Extraction Index

## Source

- Original file: `Implentio App End to End (standalone).html`
- Original size: 4.5 MB
- Claude-friendly HTML: 2.1 KB
- HTML size reduction: 100.0%

## Important

- `original/Implentio App End to End (standalone).html` is the untouched reference source.
- `source-for-claude/index.html` is optimized for AI inspection and may not be runnable.
- Large manifests and state payloads are extracted and chunked so Claude can inspect them selectively.
- Search extracted files instead of loading all chunks into context.

## Extraction summary

- Style blocks extracted: 2
- Executable inline scripts extracted: 1
- Special script/data blocks extracted: 4
- Manifest-like blocks: 1
- JSON blocks: 0
- Base64 assets extracted: 0
- Oversized data attributes extracted: 0

## Suggested Claude research order

1. `source-for-claude/index.html`
2. `styles/styles.css`
3. `scripts/app.js`
4. Search `data/manifests/`, `data/json/`, and `data/special/` only when needed
5. Use `original/Implentio App End to End (standalone).html` only as a runtime/reference source

## Generated files

- `original/Implentio App End to End (standalone).html` — original, 4.5 MB
- `styles/styles.css` — css, 906 B
- `data/manifests/001-__bundler-manifest/chunk-001.txt` — script:__bundler/manifest, 750.0 KB
- `data/manifests/001-__bundler-manifest/chunk-002.txt` — script:__bundler/manifest, 750.0 KB
- `data/manifests/001-__bundler-manifest/chunk-003.txt` — script:__bundler/manifest, 750.0 KB
- `data/manifests/001-__bundler-manifest/chunk-004.txt` — script:__bundler/manifest, 717.5 KB
- `data/manifests/001-__bundler-manifest/INDEX.md` — index, 120 B
- `data/special/002-__bundler-ext_resources.txt` — script:__bundler/ext_resources, 551 B
- `data/special/003-__bundler-page_order.txt` — script:__bundler/page_order, 2 B
- `data/special/004-__bundler-template/chunk-001.txt` — script:__bundler/template, 750.4 KB
- `data/special/004-__bundler-template/chunk-002.txt` — script:__bundler/template, 750.1 KB
- `data/special/004-__bundler-template/chunk-003.txt` — script:__bundler/template, 124.9 KB
- `data/special/004-__bundler-template/INDEX.md` — index, 104 B
- `scripts/app.js` — javascript, 16.5 KB
- `source-for-claude/index.html` — claude-html, 2.1 KB

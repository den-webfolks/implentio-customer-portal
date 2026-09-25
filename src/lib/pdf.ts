/**
 * A minimal one-page, text-only PDF writer for the dispute email's summary
 * attachment. Enough for a real file the Biller can open; the backend will
 * produce the designed summary later (Review & send plan, slice C).
 */

const PAGE_W = 612
const PAGE_H = 792
const MARGIN = 56
const LINE_H = 16
const FONT_SIZE = 11

/** PDF strings use WinAnsi; keep to characters it has, escape the rest. */
function pdfString(text: string): string {
  const ascii = text
    .replace(/[—–]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/·/g, '-')
    .replace(/[^\x20-\x7e]/g, '?')
  return ascii.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

export function simplePdf(lines: readonly string[]): Blob {
  const maxLines = Math.floor((PAGE_H - 2 * MARGIN) / LINE_H)
  const shown = lines.slice(0, maxLines)
  const content = [
    'BT',
    `/F1 ${FONT_SIZE} Tf`,
    `${LINE_H} TL`,
    `${MARGIN} ${PAGE_H - MARGIN} Td`,
    ...shown.map((l, i) => `${i === 0 ? '' : 'T* '}(${pdfString(l)}) Tj`),
    'ET',
  ].join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ]
  let out = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((body, i) => {
    offsets.push(out.length)
    out += `${i + 1} 0 obj\n${body}\nendobj\n`
  })
  const xref = out.length
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const o of offsets) out += `${String(o).padStart(10, '0')} 00000 n \n`
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return new Blob([out], { type: 'application/pdf' })
}

/**
 * Builds a ready-to-send email file (.eml, RFC 822 / MIME) with the evidence
 * files attached, for customers who send disputes from their own mail client.
 * `X-Unsent: 1` makes Outlook open it as an editable draft; Apple Mail opens
 * it too. Web Gmail can't open .eml files.
 */

export interface EmlAttachment {
  name: string
  mimeType: string
  /** File contents, base64-encoded. */
  base64: string
}

export interface EmlInput {
  to: string
  cc?: string
  subject: string
  body: string
  attachments?: EmlAttachment[]
}

const CRLF = '\r\n'

function utf8Base64(text: string): string {
  let bin = ''
  for (const byte of new TextEncoder().encode(text)) bin += String.fromCharCode(byte)
  return btoa(bin)
}

/** RFC 2047 encoded-word for headers with non-ASCII text (e.g. an em dash). */
function header(value: string): string {
  return /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${utf8Base64(value)}?=`
}

const wrap76 = (b64: string) => b64.replace(/.{1,76}/g, (line) => line + CRLF).trimEnd()

export function buildEml(input: EmlInput, boundary = 'implentio-dispute-part'): string {
  const lines = [
    'X-Unsent: 1',
    `To: ${input.to}`,
    ...(input.cc ? [`Cc: ${input.cc}`] : []),
    `Subject: ${header(input.subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76(utf8Base64(input.body)),
  ]
  for (const attachment of input.attachments ?? []) {
    const name = header(attachment.name)
    lines.push(
      `--${boundary}`,
      `Content-Type: ${attachment.mimeType}; name="${name}"`,
      `Content-Disposition: attachment; filename="${name}"`,
      'Content-Transfer-Encoding: base64',
      '',
      wrap76(attachment.base64),
    )
  }
  lines.push(`--${boundary}--`, '')
  return lines.join(CRLF)
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

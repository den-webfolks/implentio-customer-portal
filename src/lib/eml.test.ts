import { describe, expect, it } from 'vitest'
import { buildEml } from './eml'

describe('buildEml', () => {
  it('builds an unsent draft with an encoded subject, body, and attachments', () => {
    const eml = buildEml({
      to: 'billing@quickbox.com',
      cc: 'ops@quickbox.com',
      subject: 'Parcel invoices — CM-2026-0630',
      body: 'Hi QuickBox,\n\n• Base freight billed above the contracted rate',
      attachments: [
        { name: 'evidence.xlsx', mimeType: 'application/vnd.ms-excel', base64: 'QUJD' },
        { name: 'Summary.pdf', mimeType: 'application/pdf', base64: 'REVG' },
      ],
    })
    const [head] = eml.split('\r\n\r\n')
    expect(head).toContain('X-Unsent: 1')
    expect(head).toContain('To: billing@quickbox.com')
    expect(head).toContain('Cc: ops@quickbox.com')
    expect(head).toMatch(/Subject: =\?UTF-8\?B\?.+\?=/)
    expect(eml).toContain('Content-Disposition: attachment; filename="evidence.xlsx"')
    expect(eml).toContain('\r\nQUJD\r\n')
    expect(eml).toContain('Content-Disposition: attachment; filename="Summary.pdf"')
    expect(eml).toContain('\r\nREVG\r\n')
    expect(eml.trimEnd().endsWith('--implentio-dispute-part--')).toBe(true)
    const body = eml.split('Content-Transfer-Encoding: base64\r\n\r\n')[1]?.split('\r\n--')[0] ?? ''
    expect(new TextDecoder().decode(Uint8Array.from(atob(body.replace(/\r\n/g, '')), (c) => c.charCodeAt(0)))).toContain('• Base freight')
  })
})

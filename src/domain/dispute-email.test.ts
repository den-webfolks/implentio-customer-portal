import { describe, expect, it } from 'vitest'
import type { FindingGroup, PackageRecord } from './types'
import {
  attachmentNames,
  buildEmailBlocks,
  claimCsv,
  claimFileName,
  claimFileRows,
  claimFromFinding,
  composeLink,
  copyIsHandoff,
  emailText,
  positionSentence,
  COMPOSE_URL_MAX,
} from './dispute-email'

const pkg = (t: string, b: [number, number], f: [number, number] = [0, 0]): PackageRecord =>
  ({ t, so: 'SO1', inv: 'INV1', mo: 'April', car: 'UPS', sv: 'GROUND', wh: 'Denver', zip: null, ld: 46000, az: '5', ez: '5', wt: 16, cu: 0, ti: b[0] + f[0], te: b[1] + f[1], tv: b[0] + f[0] - b[1] - f[1], b, f, r: [0, 0], d: [0, 0], o: [0, 0] }) as PackageRecord

const finding = (over: Partial<FindingGroup>): FindingGroup =>
  ({
    id: 'eg-base',
    chargeKey: 'base',
    packages: 2,
    invoices: 1,
    varN: 199.51,
    carriers: ['UPS'],
    services: [{ key: 'ups-ground', carrier: 'UPS', service: 'GROUND', label: 'UPS Ground', packages: 2, invoices: 1, invoicedN: 0, expectedN: 0, varN: 0, pkgs: [pkg('1Z1', [223.5, 117.39]), pkg('1Z2', [198.2, 104.8])] }],
    ...over,
  }) as FindingGroup

const base = claimFromFinding(finding({}), 'Base-Freight.csv')
const fuel = claimFromFinding(finding({ id: 'eg-fuel', chargeKey: 'fuel', packages: 1, varN: 2.3, services: [{ key: 'k', carrier: 'DHL', service: 'X', label: 'X', packages: 1, invoices: 1, invoicedN: 0, expectedN: 0, varN: 0, pkgs: [pkg('9261', [10, 10], [3.4, 1.1])] }] }), 'Fuel-Surcharge.csv')
const input = { provider: 'QuickBox', greetingName: 'QuickBox billing team', memoId: 'CM-1', period: 'April – June 2026', claims: [base, fuel], amountN: 201.81, summaryFile: 'Summary.pdf', completeFile: null, sender: 'Tori Matthews' }

describe('dispute email', () => {
  it('writes each claim in one plain pattern with a real example and its file', () => {
    const blocks = buildEmailBlocks(input)
    expect(blocks.claims[0]).toMatchObject({
      heading: '1) Shipping price higher than our contract rate — $199.51',
      body: '2 packages were charged more for shipping than our contract allows. For example, tracking 1Z1 was charged $223.50; our contract says $117.39.',
      fileSentence: 'Every package is listed in the attached Base-Freight.csv.',
    })
    expect(blocks.claims[1]?.body).toBe('1 package was charged more for fuel than our contract allows. For example, tracking 9261 was charged $3.40 for fuel; our contract says $1.10.')
    expect(blocks.attachmentLines).toEqual(['A one-page summary is attached as Summary.pdf.'])
    expect(attachmentNames(input)).toEqual(['Base-Freight.csv', 'Fuel-Surcharge.csv', 'Summary.pdf'])
  })

  it('names every attachment in the text, and keeps the edits to the opening and closing', () => {
    const blocks = buildEmailBlocks({ ...input, completeFile: 'CM-1-Complete.xlsx' })
    const text = emailText(blocks, { opening: 'Hello,', closing: 'Thanks' })
    for (const name of attachmentNames({ ...input, completeFile: 'CM-1-Complete.xlsx' })) expect(text).toContain(name)
    expect(text.startsWith("Hello,\n\nWe're requesting a credit of $201.81 for the 2 overcharges below.\n\n1) Shipping price")).toBe(true)
    expect(text.endsWith('\n\nThanks')).toBe(true)
    expect(text).not.toMatch(/[📎①]/u)
  })

  it('uses edited evidence in place of the calculated one, and only then', () => {
    const blocks = buildEmailBlocks(input)
    expect(emailText(blocks)).toBe(emailText(blocks, { evidence: undefined }))
    const text = emailText(blocks, { evidence: 'Our own summary of the overcharges.' })
    expect(text).toContain('Our own summary of the overcharges.')
    expect(text).not.toContain('1) Shipping price')
    expect(text.startsWith('Hi QuickBox billing team,')).toBe(true)
    // The file lines always follow the attachments, edited or not.
    expect(text).toContain('Our own summary of the overcharges.\n\nA one-page summary is attached as Summary.pdf.')
  })

  it('sums up the position in one sentence', () => {
    expect(positionSentence({ provider: 'QuickBox', amountN: 9357.3, claims: [base, fuel] })).toBe(
      'You’re asking QuickBox for $9,357.30 back for 2 overcharges. Each file lists the packages that prove it. Click one to look.'.replace('’', "'"),
    )
  })

  it('builds the per-finding file from the charge that was overbilled', () => {
    const rows = claimFileRows(finding({}))
    expect(rows[0]).toEqual({ tracking: '1Z1', invoice: 'INV1', billedN: 223.5, contractN: 117.39, differenceN: 106.11 })
    expect(claimCsv(rows).split('\r\n')[0]).toBe('Tracking,Invoice,Billed,Contract,Difference')
    expect(claimFileName(finding({ chargeKey: 'das' }), 'csv')).toBe('Delivery-Area-Surcharge.csv')
    expect(claimFileName(finding({ chargeKey: 'multi' }), 'csv')).toBe('Base-Freight-and-Fuel.csv')
  })

  it('opens web mail with the text, or with the text on the clipboard when the link would be too long', () => {
    const fields = { to: 'billing@quickbox.com', cc: 'ops@quickbox.com', subject: 'Parcel review', body: 'Hi' }
    const gmail = composeLink('gmail', fields)
    expect(gmail).toMatchObject({ bodyIncluded: true })
    expect(gmail.url).toContain('https://mail.google.com/mail/?view=cm&fs=1&to=billing%40quickbox.com&cc=ops%40quickbox.com&su=Parcel%20review&body=Hi')
    expect(composeLink('outlook', fields).url.startsWith('https://outlook.office.com/mail/deeplink/compose?')).toBe(true)
    expect(composeLink('outlook_com', fields).url.startsWith('https://outlook.live.com/')).toBe(true)
    const long = composeLink('gmail', { ...fields, body: 'x'.repeat(COMPOSE_URL_MAX) })
    expect(long.bodyIncluded).toBe(false)
    expect(long.url).not.toContain('body=')
  })

  it('treats copying more than one line as taking the email out of the app', () => {
    expect(copyIsHandoff('1Z3760WA0328719516')).toBe(false)
    expect(copyIsHandoff('$223.50\n')).toBe(false)
    expect(copyIsHandoff('1) Shipping price — $9,322.20\n510 packages were charged more')).toBe(true)
  })
})

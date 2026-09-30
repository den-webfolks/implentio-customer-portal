import { describe, expect, it } from 'vitest'
import { buildZip, crc32 } from './zip'

describe('buildZip', () => {
  it('computes the standard CRC-32', () => {
    expect(crc32(new TextEncoder().encode('hello'))).toBe(0x3610a686)
  })

  it('stores every file with its name and bytes, and a central directory that lists them', async () => {
    const files = [
      { name: 'Base-Freight.csv', data: new TextEncoder().encode('Tracking,Billed\r\n1Z1,223.50\r\n') },
      { name: 'Summary.pdf', data: new Uint8Array([37, 80, 68, 70]) },
    ]
    const bytes = new Uint8Array(await buildZip(files).arrayBuffer())
    const view = new DataView(bytes.buffer)
    const end = bytes.length - 22
    expect(view.getUint32(end, true)).toBe(0x06054b50)
    expect(view.getUint16(end + 10, true)).toBe(2)

    // Walk the local headers and read each file back.
    let at = 0
    const read: { name: string; text: string }[] = []
    for (let i = 0; i < 2; i++) {
      expect(view.getUint32(at, true)).toBe(0x04034b50)
      const size = view.getUint32(at + 18, true)
      const nameLen = view.getUint16(at + 26, true)
      const name = new TextDecoder().decode(bytes.subarray(at + 30, at + 30 + nameLen))
      const data = bytes.subarray(at + 30 + nameLen, at + 30 + nameLen + size)
      expect(view.getUint32(at + 14, true)).toBe(crc32(data))
      read.push({ name, text: new TextDecoder().decode(data) })
      at += 30 + nameLen + size
    }
    expect(read.map((r) => r.name)).toEqual(['Base-Freight.csv', 'Summary.pdf'])
    expect(read[0]?.text).toContain('1Z1,223.50')
    expect(view.getUint32(end + 16, true)).toBe(at)
  })
})

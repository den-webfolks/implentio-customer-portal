/** File-download helpers — port of the prototype's saveFile/saveBlob. */

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export async function saveFile(href: string, filename: string): Promise<void> {
  const res = await fetch(href)
  if (!res.ok) throw new Error(`download failed: ${res.status}`)
  saveBlob(await res.blob(), filename)
}

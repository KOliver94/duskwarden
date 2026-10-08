import { toBlob } from 'html-to-image'

export async function exportPng(node: HTMLElement, fileName: string): Promise<void> {
  const blob = await toBlob(node, {
    pixelRatio: 2,
    backgroundColor: getComputedStyle(document.body).backgroundColor,
  })
  if (!blob) throw new Error('Rendering failed')
  const file = new File([blob], fileName, { type: 'image/png' })
  // Desktop Chrome can share files too, but its share sheet has no "save" target.
  const touch = matchMedia('(pointer: coarse)').matches
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Duskwarden' })
      return
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      // A slow render can outlive the tap's user activation; fall back to a download.
    }
  }
  const url = URL.createObjectURL(blob)
  Object.assign(document.createElement('a'), { href: url, download: fileName }).click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

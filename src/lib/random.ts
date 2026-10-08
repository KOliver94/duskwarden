// crypto.randomUUID needs a secure context; a phone testing the dev server over the LAN is plain http.
export const newId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('')

export const random = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32

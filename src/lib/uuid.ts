// crypto.randomUUID only exists on HTTPS and localhost; a phone opening the laptop's
// http://192.168.x.x address would crash. getRandomValues works everywhere (RFC 4122 v4).
export const randomUuid = () =>
  "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (+c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))).toString(16));

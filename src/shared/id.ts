type IdCrypto = {
  randomUUID?: () => string;
  getRandomValues?: (array: Uint8Array) => Uint8Array;
};

function uuidFromRandomValues(cryptoApi: IdCrypto): string | null {
  if (typeof cryptoApi.getRandomValues !== "function") return null;
  const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

export function createId(
  prefix = "",
  cryptoApi: IdCrypto | undefined = (globalThis as typeof globalThis & {
    crypto?: IdCrypto;
  }).crypto
): string {
  const id =
    (typeof cryptoApi?.randomUUID === "function" && cryptoApi.randomUUID()) ||
    (cryptoApi && uuidFromRandomValues(cryptoApi)) ||
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return prefix ? `${prefix}-${id}` : id;
}

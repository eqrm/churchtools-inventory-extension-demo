import type { Html5Qrcode } from 'html5-qrcode';

let cachedConstructor: typeof Html5Qrcode | null = null;

/**
 * Dynamically import html5-qrcode only when camera scanning is requested.
 * The constructor is cached to avoid reloading the heavy library multiple times.
 */
export async function loadHtml5Qrcode(): Promise<typeof Html5Qrcode> {
  if (cachedConstructor) {
    return cachedConstructor;
  }

  const module = await import('html5-qrcode');
  cachedConstructor = module.Html5Qrcode;
  return cachedConstructor;
}

/**
 * Test helper to reset the cached constructor between test cases.
 */
export function resetHtml5QrcodeCache(): void {
  cachedConstructor = null;
}

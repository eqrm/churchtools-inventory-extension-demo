import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('html5-qrcode', () => {
  class MockHtml5Qrcode {}
  return {
    Html5Qrcode: MockHtml5Qrcode,
  };
});

import { loadHtml5Qrcode, resetHtml5QrcodeCache } from '../../../src/utils/scannerLoader';

describe('scannerLoader', () => {
  beforeEach(() => {
    resetHtml5QrcodeCache();
  });

  it('returns cached constructor on subsequent calls', async () => {
    const first = await loadHtml5Qrcode();
    const second = await loadHtml5Qrcode();
    expect(second).toBe(first);
  });

  it('reuses updated module export after resetting cache', async () => {
    const first = await loadHtml5Qrcode();
    resetHtml5QrcodeCache();

    const mockedModule = await import('html5-qrcode');
    const ReplacementHtml5Qrcode = class {} as typeof first;
    (mockedModule as { Html5Qrcode: typeof first }).Html5Qrcode = ReplacementHtml5Qrcode;

    const second = await loadHtml5Qrcode();
    expect(second).not.toBe(first);
    expect(second).toBe(ReplacementHtml5Qrcode);
  });
});

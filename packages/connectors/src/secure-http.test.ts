import { describe, expect, it, vi } from 'vitest';
import { assertPublicAddress, createPinnedLookup, resolveAndValidate } from './secure-http.js';

describe('secure HTTP transport address policy', () => {
  it('accepts public IPv4 and IPv6 addresses', () => {
    expect(() => assertPublicAddress('93.184.216.34')).not.toThrow();
    expect(() => assertPublicAddress('2606:4700:4700::1111')).not.toThrow();
  });

  it('rejects private, link-local, reserved, and mapped private addresses', () => {
    for (const address of [
      '10.0.0.1', '127.0.0.1', '169.254.169.254', '192.168.1.1',
      '224.0.0.1', '::1', 'fc00::1', 'fe80::1', 'ff02::1',
      '::ffff:127.0.0.1', '2001:db8::1', '2002::1',
    ]) {
      expect(() => assertPublicAddress(address), address).toThrow();
    }
  });

  it('fails closed when any DNS answer is non-public', async () => {
    await expect(resolveAndValidate('example.test', async () => [
      '93.184.216.34',
      '127.0.0.1',
    ])).rejects.toThrow(/private/);
  });

  it('pins Node socket lookup to the validated address', () => {
    const callback = vi.fn();
    const lookup = createPinnedLookup('93.184.216.34');
    (lookup as unknown as (hostname: string, options: unknown, callback: (...args: unknown[]) => void) => void)(
      'example.com',
      {},
      callback,
    );
    expect(callback).toHaveBeenCalledWith(null, '93.184.216.34', 4);
  });

  it('supports Node lookup callbacks requesting all addresses', () => {
    const callback = vi.fn();
    const lookup = createPinnedLookup('2606:4700:4700::1111');
    (lookup as unknown as (hostname: string, options: unknown, callback: (...args: unknown[]) => void) => void)(
      'example.com',
      { all: true },
      callback,
    );
    expect(callback).toHaveBeenCalledWith(null, [{ address: '2606:4700:4700::1111', family: 6 }]);
  });
});

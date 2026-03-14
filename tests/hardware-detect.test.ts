import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkWebGPUSupport,
  isMobileDevice,
  estimateCapability,
} from '../src/lib/hardware-detect';

describe('hardware-detect', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkWebGPUSupport', () => {
    it('returns false when navigator.gpu is absent', () => {
      const orig = (globalThis.navigator as any).gpu;
      delete (globalThis.navigator as any).gpu;
      expect(checkWebGPUSupport()).toBe(false);
      if (orig) (globalThis.navigator as any).gpu = orig;
    });
  });

  describe('isMobileDevice', () => {
    it('returns false for desktop user agents', () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      );
      expect(isMobileDevice()).toBe(false);
    });

    it('returns true for iPhone user agents', () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      );
      expect(isMobileDevice()).toBe(true);
    });

    it('returns true for Android user agents', () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
        'Mozilla/5.0 (Linux; Android 13; Pixel 7)',
      );
      expect(isMobileDevice()).toBe(true);
    });
  });

  describe('estimateCapability', () => {
    it('returns unsupported when WebGPU is not available', async () => {
      const orig = (globalThis.navigator as any).gpu;
      delete (globalThis.navigator as any).gpu;
      const result = await estimateCapability();
      expect(result.estimatedTier).toBe('unsupported');
      expect(result.webgpuSupported).toBe(false);
      expect(result.recommendation).toContain('Connect OpenRouter');
      if (orig) (globalThis.navigator as any).gpu = orig;
    });
  });
});

export interface HardwareCapability {
  webgpuSupported: boolean;
  isMobile: boolean;
  estimatedTier: 'high' | 'medium' | 'low' | 'unsupported';
  recommendation: string;
}

/**
 * Check if WebGPU is available.
 */
export function checkWebGPUSupport(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

/**
 * Detect if the user is on a mobile device.
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * Estimate the device's capability for running in-browser models.
 */
export async function estimateCapability(): Promise<HardwareCapability> {
  if (!checkWebGPUSupport()) {
    return {
      webgpuSupported: false,
      isMobile: isMobileDevice(),
      estimatedTier: 'unsupported',
      recommendation:
        "Your browser doesn't support local AI yet. Connect OpenRouter to use cloud models instead.",
    };
  }

  const mobile = isMobileDevice();

  if (mobile) {
    return {
      webgpuSupported: true,
      isMobile: true,
      estimatedTier: 'low',
      recommendation:
        'Local AI works on your device but may be slow and use significant battery. Cloud models are recommended for the best experience.',
    };
  }

  // Try to get GPU adapter info for capability estimation
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return {
        webgpuSupported: true,
        isMobile: false,
        estimatedTier: 'low',
        recommendation:
          'WebGPU is available but no suitable GPU adapter found. Performance may be limited.',
      };
    }

    // Check for high-performance features
    const features = adapter.features;
    const hasFloat16 = features.has('shader-f16');

    return {
      webgpuSupported: true,
      isMobile: false,
      estimatedTier: hasFloat16 ? 'high' : 'medium',
      recommendation: hasFloat16
        ? 'Your device is well-suited for local AI. Model will run smoothly.'
        : 'Your device supports local AI. Performance should be reasonable.',
    };
  } catch {
    return {
      webgpuSupported: true,
      isMobile: false,
      estimatedTier: 'medium',
      recommendation: 'Your device supports local AI.',
    };
  }
}

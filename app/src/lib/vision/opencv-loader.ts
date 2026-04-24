/**
 * OpenCV.js lazy loader.
 *
 * Loads opencv.js from the official CDN once, memoized. Only loaded on pages
 * that need homography (calibrate/stream). ~1.5MB gzipped.
 */

declare global {
  interface Window {
    cv?: unknown;
    Module?: { onRuntimeInitialized?: () => void };
  }
}

let loadPromise: Promise<typeof window.cv> | null = null;

export function loadOpenCV(): Promise<typeof window.cv> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('OpenCV can only load in the browser'));
  }
  if (window.cv && typeof window.cv === 'object') {
    return Promise.resolve(window.cv);
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('opencv-js') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(window.cv));
      existing.addEventListener('error', () => reject(new Error('OpenCV load failed')));
      return;
    }
    const script = document.createElement('script');
    script.id = 'opencv-js';
    script.src = 'https://docs.opencv.org/4.10.0/opencv.js';
    script.async = true;
    script.onload = () => {
      // opencv.js fires onRuntimeInitialized when WASM is ready
      const check = () => {
        const cv = window.cv as { Mat?: unknown } | undefined;
        if (cv && cv.Mat) {
          resolve(cv);
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    };
    script.onerror = () => reject(new Error('Failed to load OpenCV.js'));
    document.head.appendChild(script);
  });

  return loadPromise;
}

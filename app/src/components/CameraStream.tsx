'use client';

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';

export type CameraStreamHandle = {
  captureFrame: () => Promise<string | null>;
  getVideo: () => HTMLVideoElement | null;
};

type Props = {
  facingMode?: 'user' | 'environment';
  className?: string;
  onReady?: () => void;
};

/**
 * A mobile-friendly camera component.
 * - Uses native getUserMedia (no library)
 * - Captures full-quality JPEG data URLs via canvas
 * - Requests wake-lock to keep the screen awake during streaming
 * - Exposes a captureFrame() imperative method
 */
export const CameraStream = forwardRef<CameraStreamHandle, Props>(function CameraStream(
  { facingMode = 'environment', className, onReady },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useImperativeHandle(ref, () => ({
    getVideo: () => videoRef.current,
    captureFrame: async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return null;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.85);
    },
  }));

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
          onReady?.();
        }

        // Best-effort wake-lock
        if ('wakeLock' in navigator) {
          try {
            wakeLockRef.current = await (navigator as Navigator & {
              wakeLock: { request: (type: 'screen') => Promise<WakeLockSentinel> };
            }).wakeLock.request('screen');
          } catch {
            // wake-lock unavailable, proceed without
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Camera access denied');
      }
    }

    start();

    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [facingMode, onReady]);

  return (
    <div className={className}>
      {error && <div className="p-4 text-red-400 text-sm">Camera error: {error}</div>}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="w-full h-full object-cover rounded-lg bg-black"
        style={{ aspectRatio: '16/9' }}
      />
      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm">
          Starting camera…
        </div>
      )}
    </div>
  );
});

type WakeLockSentinel = { release(): Promise<void> };

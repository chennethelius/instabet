'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { CameraStream, type CameraStreamHandle } from '@/components/CameraStream';
import { BboxOverlay } from '@/components/BboxOverlay';
import type { CalibrationResult } from '@/lib/types/schema';

export default function CalibratePage() {
  const cameraRef = useRef<CameraStreamHandle>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CalibrationResult | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);
  const [imageDims, setImageDims] = useState({ w: 0, h: 0 });
  const [containerDims, setContainerDims] = useState({ w: 0, h: 0 });

  async function handleCapture() {
    const video = cameraRef.current?.getVideo();
    if (!video) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const dataUrl = await cameraRef.current?.captureFrame();
      if (!dataUrl) throw new Error('Failed to capture frame');

      setCapturedImage(dataUrl);
      setImageDims({ w: video.videoWidth, h: video.videoHeight });
      setContainerDims({ w: video.clientWidth, h: video.clientHeight });

      const res = await fetch('/api/calibrate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Calibration failed');
      setResult(data.calibration);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="text-violet-300 text-sm hover:underline mb-8 inline-block">
          ← Back
        </Link>

        <h1 className="text-3xl font-bold mb-2">Camera calibration</h1>
        <p className="text-white/60 mb-8">
          Point your phone at a scoreboard. Gemini 2.5 Pro Vision will identify regions and label them.
        </p>

        <div className="space-y-4">
          {!capturedImage ? (
            <div className="relative rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
              <CameraStream ref={cameraRef} className="absolute inset-0" />
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden bg-black">
              <img src={capturedImage} alt="Captured" className="w-full h-auto" />
              {result && containerDims.w > 0 && (
                <BboxOverlay
                  regions={result.regions}
                  imageWidth={imageDims.w}
                  imageHeight={imageDims.h}
                  containerWidth={containerDims.w}
                  containerHeight={containerDims.h}
                  onRegionClick={setSelectedRegion}
                  selectedIndex={selectedRegion}
                />
              )}
            </div>
          )}

          <div className="flex gap-3">
            {!capturedImage ? (
              <button
                onClick={handleCapture}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-violet-500 hover:bg-violet-400 disabled:bg-white/10 text-black font-semibold transition"
              >
                {loading ? 'Analyzing…' : 'Capture & analyze'}
              </button>
            ) : (
              <button
                onClick={() => {
                  setCapturedImage(null);
                  setResult(null);
                  setSelectedRegion(null);
                }}
                className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold transition"
              >
                Reset & re-capture
              </button>
            )}
          </div>

          {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">{error}</div>}

          {result && (
            <div className="space-y-4 p-6 bg-white/5 border border-white/10 rounded-2xl">
              <div className="flex justify-between items-baseline">
                <div>
                  <div className="text-xs text-white/40 uppercase tracking-wide">Scoreboard</div>
                  <div className="text-lg font-semibold">{result.scoreboardType}</div>
                </div>
                <div>
                  <div className="text-xs text-white/40 uppercase tracking-wide">Sport</div>
                  <div className="text-lg font-semibold">{result.sport}</div>
                </div>
                <div>
                  <div className="text-xs text-white/40 uppercase tracking-wide">Confidence</div>
                  <div className="text-lg font-semibold text-violet-300">{result.overallConfidence}%</div>
                </div>
              </div>

              <div>
                <div className="text-xs text-white/40 uppercase tracking-wide mb-2">Regions detected ({result.regions.length})</div>
                <div className="space-y-2">
                  {result.regions.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedRegion(i)}
                      className={`block w-full text-left p-3 rounded-lg border transition ${
                        selectedRegion === i
                          ? 'bg-violet-500/20 border-violet-400'
                          : 'bg-white/5 border-white/10 hover:border-white/30'
                      }`}
                    >
                      <div className="flex justify-between items-baseline">
                        <div>
                          <div className="font-semibold">{r.label}</div>
                          <div className="text-xs text-white/50">{r.type}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono">{r.currentValue ?? '—'}</div>
                          <div className="text-xs text-white/50">{r.confidence}%</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {result.concerns.length > 0 && (
                <div>
                  <div className="text-xs text-white/40 uppercase tracking-wide mb-2">Concerns</div>
                  <ul className="space-y-1">
                    {result.concerns.map((c, i) => (
                      <li key={i} className="text-sm text-yellow-300/80">
                        ⚠ {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

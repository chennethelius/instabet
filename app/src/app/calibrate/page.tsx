'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { CameraStream, type CameraStreamHandle } from '@/components/CameraStream';
import { BboxOverlay } from '@/components/BboxOverlay';
import { CornerDragger } from '@/components/CornerDragger';
import { computeHomography, warpImage, defaultCorners, type Corners } from '@/lib/vision/homography';
import { loadOpenCV } from '@/lib/vision/opencv-loader';
import type { CalibrationResult } from '@/lib/types/schema';

type Step = 'camera' | 'align' | 'warped' | 'detected';

export default function CalibratePage() {
  const cameraRef = useRef<CameraStreamHandle>(null);
  const [step, setStep] = useState<Step>('camera');
  const [loading, setLoading] = useState(false);
  const [opencvReady, setOpencvReady] = useState(false);

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedDims, setCapturedDims] = useState({ w: 0, h: 0 });
  const [corners, setCorners] = useState<Corners | null>(null);
  const [homographyMatrix, setHomographyMatrix] = useState<number[] | null>(null);
  const [warpedImage, setWarpedImage] = useState<string | null>(null);
  const [warpedDims] = useState({ w: 1280, h: 360 });

  const [result, setResult] = useState<CalibrationResult | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOpenCV()
      .then(() => setOpencvReady(true))
      .catch(e => setError(`OpenCV failed to load: ${e.message}`));
  }, []);

  async function handleCapture() {
    const video = cameraRef.current?.getVideo();
    if (!video) return;
    const dataUrl = await cameraRef.current?.captureFrame();
    if (!dataUrl) return setError('Could not capture frame');
    setCapturedImage(dataUrl);
    setCapturedDims({ w: video.videoWidth, h: video.videoHeight });
    setCorners(defaultCorners(video.videoWidth, video.videoHeight));
    setStep('align');
  }

  async function handleConfirmCorners() {
    if (!capturedImage || !corners) return;
    setLoading(true);
    setError(null);
    try {
      // Load the captured image into a canvas for OpenCV to read
      const img = new Image();
      img.src = capturedImage;
      await new Promise<void>((ok, fail) => {
        img.onload = () => ok();
        img.onerror = () => fail(new Error('Failed to decode captured frame'));
      });
      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = capturedDims.w;
      srcCanvas.height = capturedDims.h;
      srcCanvas.getContext('2d')!.drawImage(img, 0, 0);

      const matrix = await computeHomography(corners, warpedDims.w, warpedDims.h);
      const warped = await warpImage(srcCanvas, matrix, warpedDims.w, warpedDims.h);
      setHomographyMatrix(matrix);
      setWarpedImage(warped);
      setStep('warped');

      // Auto-detect regions on the warped image
      const res = await fetch('/api/calibrate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: warped }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Calibration failed');
      setResult(data.calibration);
      setStep('detected');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setStep('camera');
    setCapturedImage(null);
    setCorners(null);
    setHomographyMatrix(null);
    setWarpedImage(null);
    setResult(null);
    setSelectedRegion(null);
    setError(null);
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link href="/" className="text-violet-300 text-sm hover:underline mb-8 inline-block">
          ← Back
        </Link>

        <h1 className="text-3xl font-bold mb-2">Calibrate camera oracle</h1>
        <p className="text-white/60 mb-8">
          Capture → align 4 corners → AI detects regions. Like a scanner, but for scoreboards.
        </p>

        <div className="flex items-center gap-2 mb-6 text-xs">
          <StepPill active={step === 'camera'} done={step !== 'camera'} label="1 Capture" />
          <StepPill active={step === 'align'} done={step === 'warped' || step === 'detected'} label="2 Align corners" />
          <StepPill active={step === 'warped'} done={step === 'detected'} label="3 AI analyze" />
          <StepPill active={step === 'detected'} done={false} label="4 Confirm regions" />
        </div>

        {error && (
          <div className="p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {step === 'camera' && (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
              <CameraStream ref={cameraRef} className="absolute inset-0" />
            </div>
            <button
              onClick={handleCapture}
              disabled={!opencvReady}
              className="w-full py-3 rounded-xl bg-violet-500 hover:bg-violet-400 disabled:bg-white/10 text-black font-semibold transition"
            >
              {opencvReady ? 'Capture frame' : 'Loading OpenCV…'}
            </button>
          </div>
        )}

        {step === 'align' && capturedImage && corners && (
          <div className="space-y-4">
            <div className="text-sm text-white/60">
              Drag the 4 corners to match the scoreboard boundaries. This lets us rectify
              perspective before OCR.
            </div>
            <div
              className="relative rounded-xl overflow-hidden bg-black"
              style={{ aspectRatio: `${capturedDims.w} / ${capturedDims.h}` }}
            >
              <img src={capturedImage} alt="" className="absolute inset-0 w-full h-full" />
              <CornerDragger
                corners={corners}
                onChange={setCorners}
                width={capturedDims.w}
                height={capturedDims.h}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={handleReset} className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold">
                Retake
              </button>
              <button
                onClick={handleConfirmCorners}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-violet-500 hover:bg-violet-400 disabled:bg-white/10 text-black font-semibold"
              >
                {loading ? 'Rectifying + detecting…' : 'Confirm corners'}
              </button>
            </div>
          </div>
        )}

        {(step === 'warped' || step === 'detected') && warpedImage && (
          <div className="space-y-4">
            <div className="text-sm text-white/60">
              Rectified scoreboard (post-homography). {result ? `${result.regions.length} regions detected.` : 'Detecting…'}
            </div>
            <div
              className="relative rounded-xl overflow-hidden bg-black"
              style={{ aspectRatio: `${warpedDims.w} / ${warpedDims.h}` }}
            >
              <img src={warpedImage} alt="" className="absolute inset-0 w-full h-full" />
              {result && (
                <BboxOverlay
                  regions={result.regions}
                  imageWidth={warpedDims.w}
                  imageHeight={warpedDims.h}
                  containerWidth={warpedDims.w}
                  containerHeight={warpedDims.h}
                  onRegionClick={setSelectedRegion}
                  selectedIndex={selectedRegion}
                />
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={handleReset} className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold">
                Restart
              </button>
            </div>

            {result && (
              <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                <div className="flex justify-between items-baseline">
                  <StatBlock label="Type" value={result.scoreboardType} />
                  <StatBlock label="Sport" value={result.sport} />
                  <StatBlock label="Confidence" value={`${result.overallConfidence}%`} color="text-violet-300" />
                </div>

                <div>
                  <div className="text-xs text-white/40 uppercase tracking-wide mb-2">
                    Regions ({result.regions.length})
                  </div>
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
                        <li key={i} className="text-sm text-yellow-300/80">⚠ {c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {homographyMatrix && (
                  <details className="text-xs text-white/40">
                    <summary className="cursor-pointer">Homography matrix</summary>
                    <pre className="mt-2 font-mono text-[10px] bg-black/40 p-2 rounded">
                      {JSON.stringify(homographyMatrix, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function StepPill({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div
      className={`px-3 py-1 rounded-full border text-xs font-medium ${
        active
          ? 'bg-violet-500/20 border-violet-400 text-violet-200'
          : done
          ? 'bg-white/5 border-white/20 text-white/70'
          : 'bg-transparent border-white/10 text-white/30'
      }`}
    >
      {label}
    </div>
  );
}

function StatBlock({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-xs text-white/40 uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-semibold ${color ?? ''}`}>{value}</div>
    </div>
  );
}

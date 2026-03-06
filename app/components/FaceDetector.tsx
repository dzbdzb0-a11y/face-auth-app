"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ── 공개 타입 ─────────────────────────────────────────────────────
export interface DetectionInfo {
  detected: boolean;
  confidence: number;   // 0-100
  landmarkCount: number;
  fps: number;
  faceArea: number;     // 프레임 대비 얼굴 면적 %
}

interface FaceDetectorProps {
  active: boolean;
  onDetectionChange?: (info: DetectionInfo) => void;
  /** N 프레임 연속 감지 시 한 번 호출 */
  onStableDetection?: () => void;
  stableFrames?: number; // 기본 45 ≈ 1.5초
  /**
   * true 이면 faceRecognitionNet 도 로드해서
   * 매 descriptorInterval 프레임마다 128차원 descriptor 를 추출한다.
   */
  withDescriptor?: boolean;
  /** descriptor 추출 주기(프레임). 기본 20 ≈ 0.6초 */
  descriptorInterval?: number;
  onDescriptor?: (descriptor: Float32Array) => void;
  className?: string;
}

// ── 내부 상태 ─────────────────────────────────────────────────────
type LoadState = "idle" | "loading" | "ready" | "error";
type FaceApiModule = typeof import("face-api.js");

// ── 랜드마크 그룹 폴리라인 ────────────────────────────────────────
function drawPolyline(
  ctx: CanvasRenderingContext2D,
  pts: { x: number; y: number }[],
  close = false,
  color = "rgba(96,165,250,0.55)",
  lw = 1,
) {
  if (pts.length < 2) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  if (close) ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.shadowColor = "#60A5FA";
  ctx.shadowBlur = 3;
  ctx.stroke();
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────
export default function FaceDetector({
  active,
  onDetectionChange,
  onStableDetection,
  stableFrames = 45,
  withDescriptor = false,
  descriptorInterval = 20,
  onDescriptor,
  className = "",
}: FaceDetectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const faceapiRef = useRef<FaceApiModule | null>(null);

  // 프레임 카운터 & FPS
  const frameRef = useRef(0);
  const lastTimeRef = useRef(0);
  const fpsRef = useRef(0);

  // 안정적 감지 카운터
  const stableCountRef = useRef(0);
  const stableFiredRef = useRef(false);

  // descriptor 중복 요청 방지
  const extractingRef = useRef(false);

  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [camError, setCamError] = useState<string | null>(null);
  const [info, setInfo] = useState<DetectionInfo>({
    detected: false, confidence: 0, landmarkCount: 0, fps: 0, faceArea: 0,
  });

  // ── 1. face-api 모델 로드 ─────────────────────────────────────
  useEffect(() => {
    setLoadState("loading");
    import("face-api.js")
      .then(async (faceapi) => {
        faceapiRef.current = faceapi;

        const loads = [
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri("/models"),
        ];
        // withDescriptor=true 일 때만 recognition net 추가 로드
        if (withDescriptor) {
          loads.push(faceapi.nets.faceRecognitionNet.loadFromUri("/models"));
        }
        await Promise.all(loads);
        setLoadState("ready");
      })
      .catch(() => setLoadState("error"));
  // withDescriptor 는 mount 시점에 고정되므로 의존성에 포함해도 재실행 없음
  }, [withDescriptor]);

  // ── 2. 카메라 스트림 ─────────────────────────────────────────
  useEffect(() => {
    if (!active || loadState !== "ready") return;

    let cancelled = false;
    setCamError(null);

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch((err) => {
        if (!cancelled) {
          setCamError(
            err.name === "NotAllowedError" ? "카메라 권한이 거부되었습니다." :
            err.name === "NotFoundError"   ? "카메라를 찾을 수 없습니다." :
            `카메라 오류: ${err.message}`,
          );
        }
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [active, loadState]);

  // ── 3. 캔버스 드로잉 ─────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drawResult = useCallback((ctx: CanvasRenderingContext2D, result: any) => {
    const { box } = result.detection;
    const { x, y, width: w, height: h } = box;

    // 반투명 배경
    ctx.save();
    ctx.fillStyle = "rgba(59,130,246,0.06)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "rgba(59,130,246,0.30)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();

    // 코너 브래킷
    const cs = Math.max(12, Math.min(w, h) * 0.14);
    const corners: [number, number, number, number, number, number][] = [
      [x, y + cs, x, y, x + cs, y],
      [x + w - cs, y, x + w, y, x + w, y + cs],
      [x, y + h - cs, x, y + h, x + cs, y + h],
      [x + w - cs, y + h, x + w, y + h, x + w, y + h - cs],
    ];
    ctx.save();
    ctx.strokeStyle = "#3B82F6";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.shadowColor = "#3B82F6";
    ctx.shadowBlur = 10;
    for (const [x1, y1, cx, cy, x2, y2] of corners) {
      ctx.beginPath();
      ctx.moveTo(x1, y1); ctx.lineTo(cx, cy); ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();

    // 스캔 라인
    const sy = y + h * 0.5;
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, "transparent");
    g.addColorStop(0.45, "rgba(59,130,246,0.6)");
    g.addColorStop(0.55, "rgba(96,165,250,0.9)");
    g.addColorStop(1, "transparent");
    ctx.save();
    ctx.strokeStyle = g; ctx.lineWidth = 1.5;
    ctx.shadowColor = "#60A5FA"; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.moveTo(x, sy); ctx.lineTo(x + w, sy); ctx.stroke();
    ctx.restore();

    // 랜드마크 68개 점
    if (result.landmarks) {
      const pts = result.landmarks.positions as { x: number; y: number }[];
      ctx.save();
      ctx.fillStyle = "#60A5FA";
      ctx.shadowColor = "#60A5FA"; ctx.shadowBlur = 5;
      for (const p of pts) {
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      drawPolyline(ctx, result.landmarks.getJawOutline());
      drawPolyline(ctx, result.landmarks.getLeftEyeBrow());
      drawPolyline(ctx, result.landmarks.getRightEyeBrow());
      drawPolyline(ctx, result.landmarks.getNose());
      drawPolyline(ctx, result.landmarks.getLeftEye(),  true, "rgba(96,165,250,0.7)");
      drawPolyline(ctx, result.landmarks.getRightEye(), true, "rgba(96,165,250,0.7)");
      drawPolyline(ctx, result.landmarks.getMouth(),    true, "rgba(167,139,250,0.55)");
    }

    // 신뢰도 라벨
    const score = Math.round(result.detection.score * 100);
    const label = `FACE  ${score}%`;
    ctx.save();
    ctx.font = "bold 11px monospace";
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = "#3B82F6";
    ctx.fillRect(x, y - 17, tw + 10, 16);
    ctx.fillStyle = "#fff";
    ctx.fillText(label, x + 5, y - 4);
    ctx.restore();
  }, []);

  // ── 4. 감지 루프 ─────────────────────────────────────────────
  useEffect(() => {
    if (!active || loadState !== "ready") return;
    let cancelled = false;

    const detectorOpts = () =>
      new faceapiRef.current!.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });

    const loop = async (ts: number) => {
      if (cancelled) return;

      const video  = videoRef.current;
      const canvas = canvasRef.current;
      const faceapi = faceapiRef.current;

      if (!video || !canvas || !faceapi || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // 캔버스 크기 동기화
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // FPS
      const delta = ts - lastTimeRef.current;
      lastTimeRef.current = ts;
      if (delta > 0) fpsRef.current = Math.round(1000 / delta);

      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      try {
        // 실시간 감지 + 랜드마크 (tiny, 빠름)
        const result = await faceapi
          .detectSingleFace(video, detectorOpts())
          .withFaceLandmarks(true);

        if (!cancelled) {
          if (result) {
            drawResult(ctx, result);

            const { box } = result.detection;
            const area = ((box.width * box.height) / (canvas.width * canvas.height)) * 100;
            const newInfo: DetectionInfo = {
              detected: true,
              confidence: Math.round(result.detection.score * 100),
              landmarkCount: result.landmarks.positions.length,
              fps: fpsRef.current,
              faceArea: Math.round(area),
            };
            setInfo(newInfo);
            onDetectionChange?.(newInfo);

            // 안정적 감지
            stableCountRef.current++;
            if (stableCountRef.current >= stableFrames && !stableFiredRef.current) {
              stableFiredRef.current = true;
              onStableDetection?.();
            }

            // ── descriptor 추출 (withDescriptor=true, 매 N 프레임) ──
            if (
              withDescriptor &&
              !extractingRef.current &&
              frameRef.current % descriptorInterval === 0
            ) {
              extractingRef.current = true;
              // async IIFE 로 감싸 Promise 타입 충돌 회피
              void (async () => {
                try {
                  const r = await faceapi
                    .detectSingleFace(video, detectorOpts())
                    .withFaceLandmarks(true)
                    .withFaceDescriptor();
                  if (r && !cancelled) onDescriptor?.(r.descriptor);
                } catch { /* ignore */ } finally {
                  extractingRef.current = false;
                }
              })();
            }
          } else {
            // 얼굴 없음
            stableCountRef.current = 0;
            stableFiredRef.current = false;
            const noFace: DetectionInfo = {
              detected: false, confidence: 0, landmarkCount: 0,
              fps: fpsRef.current, faceArea: 0,
            };
            setInfo(noFace);
            onDetectionChange?.(noFace);
          }
        }
      } catch { /* 언마운트 중 무시 */ }

      frameRef.current++;
      if (!cancelled) rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, [active, loadState, drawResult, onDetectionChange, onStableDetection,
      stableFrames, withDescriptor, descriptorInterval, onDescriptor]);

  // ── 렌더링 ────────────────────────────────────────────────────
  return (
    <div className={`relative overflow-hidden bg-[#0a0d1a] ${className}`}>
      {/* 셀피 카메라 (좌우 반전) */}
      <video
        ref={videoRef}
        autoPlay playsInline muted
        className="w-full h-full object-cover [transform:scaleX(-1)]"
      />
      {/* 감지 오버레이 (동일 반전) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full [transform:scaleX(-1)]"
      />

      {/* 모델 로딩 중 */}
      {loadState === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0a0d1a]/90">
          <div className="w-10 h-10 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
          <div className="text-center">
            <p className="text-xs text-slate-400 font-medium">AI 모델 로딩 중…</p>
            {withDescriptor && (
              <p className="text-[10px] text-slate-600 mt-0.5">얼굴 인식 모델 포함 (~6MB)</p>
            )}
          </div>
        </div>
      )}

      {/* 모델 에러 */}
      {loadState === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0a0d1a]/90 px-6 text-center">
          <span className="text-2xl">⚠️</span>
          <p className="text-sm text-red-400 font-semibold">모델 로드 실패</p>
          <p className="text-xs text-slate-500">public/models 폴더를 확인하세요.</p>
        </div>
      )}

      {/* 카메라 에러 */}
      {camError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0a0d1a]/90 px-6 text-center">
          <span className="text-2xl">📷</span>
          <p className="text-sm text-amber-400 font-semibold">카메라 접근 불가</p>
          <p className="text-xs text-slate-500">{camError}</p>
        </div>
      )}

      {/* HUD */}
      {active && loadState === "ready" && !camError && (
        <>
          <div className="absolute bottom-3 left-3">
            <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 backdrop-blur-md border text-[10px] font-semibold transition-all
              ${info.detected
                ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                : "bg-black/40 border-white/10 text-slate-500"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${info.detected ? "bg-blue-400 animate-pulse" : "bg-slate-600"}`} />
              {info.detected ? `감지됨 ${info.confidence}%` : "얼굴 없음"}
            </div>
          </div>

          {info.detected && (
            <div className="absolute bottom-3 right-3">
              <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-full px-2.5 py-1 backdrop-blur-md">
                <span className="text-[10px] text-indigo-300 font-mono">{info.landmarkCount}pts</span>
                <span className="w-px h-3 bg-white/15" />
                <span className="text-[10px] text-slate-400 font-mono">{info.fps}fps</span>
              </div>
            </div>
          )}

          {info.detected && info.faceArea < 8 && (
            <div className="absolute top-3 inset-x-3">
              <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl px-3 py-2 text-center backdrop-blur-sm">
                <p className="text-[11px] text-amber-300 font-medium">카메라에 가까이 다가와 주세요</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

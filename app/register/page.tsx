"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, CheckCircle2, ScanFace, Info,
  User, AlertCircle, Loader2,
} from "lucide-react";
import FaceDetector, { type DetectionInfo } from "../components/FaceDetector";
import { saveFaceProfile } from "../../lib/faceDb";
import { isSupabaseConfigured } from "../../lib/supabase";

type Step = "name" | "guide" | "scanning" | "saving" | "done";

const STEP_LABELS = ["이름", "안내", "스캔", "저장", "완료"];
const STEP_KEYS: Step[] = ["name", "guide", "scanning", "saving", "done"];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [savedProfile, setSavedProfile] = useState<{ name: string; landmarkCount: number } | null>(null);

  // 최신 detectionInfo 를 ref 로 보관 (descriptor 콜백에서 참조)
  const detectionInfoRef = useRef<DetectionInfo | null>(null);
  // 저장 중복 방지
  const savingRef = useRef(false);

  // ── 이름 유효성 검사 ──────────────────────────────────────────
  const validateName = (v: string) => {
    if (!v.trim()) return "이름을 입력해주세요.";
    if (v.trim().length < 2) return "이름은 2자 이상 입력해주세요.";
    return "";
  };

  // ── descriptor 수신 → Supabase 저장 ─────────────────────────
  const handleDescriptor = useCallback(
    async (descriptor: Float32Array) => {
      if (step !== "scanning" || savingRef.current) return;
      savingRef.current = true;
      setStep("saving");
      setSaveError("");

      try {
        await saveFaceProfile(name.trim(), descriptor);
        setSavedProfile({
          name: name.trim(),
          landmarkCount: detectionInfoRef.current?.landmarkCount ?? 68,
        });
        setStep("done");
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.");
        setStep("scanning");
        savingRef.current = false;
      }
    },
    [step, name],
  );

  const handleDetectionChange = useCallback((info: DetectionInfo) => {
    detectionInfoRef.current = info;
  }, []);

  const currentStepIndex = STEP_KEYS.indexOf(step);

  // ── Supabase 미설정 안내 ───────────────────────────────────────
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-dvh bg-[#0B0E1A] flex flex-col items-center justify-center px-6 gap-5">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-amber-400" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-white">Supabase 설정 필요</h2>
          <p className="text-sm text-slate-400 mt-1 leading-relaxed">
            .env.local 파일에 Supabase URL과<br />Anon Key를 설정해주세요.
          </p>
        </div>
        <div className="glass-card rounded-xl p-4 w-full text-left">
          <p className="text-xs text-slate-500 font-mono whitespace-pre">{
`# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key`
          }</p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="text-sm text-blue-400 underline underline-offset-2"
        >
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0B0E1A] flex flex-col relative overflow-hidden">
      {/* 배경 */}
      <div className="absolute top-[-80px] left-[-60px] w-[260px] h-[260px] rounded-full bg-blue-600/10 blur-[70px] pointer-events-none" />
      <div className="absolute bottom-[80px] right-[-60px] w-[200px] h-[200px] rounded-full bg-indigo-600/8 blur-[70px] pointer-events-none" />

      {/* 헤더 */}
      <div className="flex items-center gap-3 px-5 pt-14 pb-4 flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-white/5 border border-white/8 flex items-center justify-center active:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-slate-300" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">얼굴 등록</h1>
          <p className="text-xs text-slate-500">Face Registration</p>
        </div>
      </div>

      {/* 단계 인디케이터 */}
      <div className="px-5 pb-4 flex-shrink-0">
        <div className="flex items-center">
          {STEP_LABELS.map((label, i) => {
            const isActive = i === currentStepIndex;
            const isDone   = i < currentStepIndex;
            return (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-0.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300
                    ${isDone ? "bg-blue-500 text-white" : isActive ? "bg-blue-500/20 border-2 border-blue-500 text-blue-400" : "bg-white/5 text-slate-600"}`}>
                    {isDone ? "✓" : i + 1}
                  </div>
                  <span className={`text-[9px] font-medium transition-colors ${isActive ? "text-blue-400" : isDone ? "text-blue-300" : "text-slate-600"}`}>
                    {label}
                  </span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div className={`flex-1 h-[2px] rounded-full mx-1 mb-4 transition-all duration-500 ${isDone ? "bg-blue-500" : "bg-white/8"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="px-5 flex-1 flex flex-col">

        {/* ── Step 1: 이름 입력 ── */}
        {step === "name" && (
          <div className="flex flex-col gap-5 animate-fade-up" style={{ opacity: 0 }}>
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">사용자 이름</p>
                  <p className="text-xs text-slate-500">얼굴과 함께 저장됩니다</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">이름 *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setNameError(""); }}
                  placeholder="홍길동"
                  maxLength={20}
                  className={`w-full bg-white/5 border rounded-xl px-4 py-3.5 text-white text-sm placeholder-slate-600
                    outline-none focus:border-blue-500/60 focus:bg-white/8 transition-all
                    ${nameError ? "border-red-500/50" : "border-white/10"}`}
                />
                {nameError && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{nameError}
                  </p>
                )}
              </div>
            </div>

            <div className="glass-card rounded-xl p-4 flex gap-3">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400 leading-relaxed">
                입력한 이름과 얼굴 특징점 128개 벡터가 Supabase에 암호화되어 저장됩니다.
              </p>
            </div>

            <button
              onClick={() => {
                const err = validateName(name);
                if (err) { setNameError(err); return; }
                setStep("guide");
              }}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-base active:scale-[0.98] transition-transform"
            >
              다음 단계
            </button>
          </div>
        )}

        {/* ── Step 2: 안내 ── */}
        {step === "guide" && (
          <div className="flex flex-col gap-4 animate-fade-up" style={{ opacity: 0 }}>
            <div className="relative rounded-3xl overflow-hidden border border-white/8 aspect-[3/4] max-h-[320px] bg-[#0D1020] flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-full bg-blue-500/10 border-2 border-dashed border-blue-500/30 flex items-center justify-center animate-pulse">
                  <ScanFace className="w-9 h-9 text-blue-400/60" strokeWidth={1.5} />
                </div>
                <p className="text-sm text-slate-500">카메라 준비 중</p>
              </div>
            </div>

            <div className="glass-card rounded-xl p-4 flex gap-3">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                {[
                  "밝은 조명 아래, 정면을 바라보세요",
                  "마스크·선글라스를 착용하지 마세요",
                  "얼굴이 감지되면 자동으로 저장됩니다",
                ].map((t, i) => <p key={i} className="text-xs text-slate-400">{t}</p>)}
              </div>
            </div>

            <button
              onClick={() => setStep("scanning")}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-base active:scale-[0.98] transition-transform relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0" />
              <div className="relative flex items-center justify-center gap-2">
                <ScanFace className="w-5 h-5" />
                <span>얼굴 스캔 시작</span>
              </div>
            </button>
          </div>
        )}

        {/* ── Step 3: 스캔 (실제 카메라) ── */}
        {step === "scanning" && (
          <div className="flex flex-col gap-4">
            <div className="relative rounded-3xl overflow-hidden border border-white/8 aspect-[3/4] max-h-[380px]">
              <FaceDetector
                active={true}
                withDescriptor={true}
                descriptorInterval={15}
                onDetectionChange={handleDetectionChange}
                onDescriptor={handleDescriptor}
                className="absolute inset-0 w-full h-full"
              />
            </div>

            {saveError && (
              <div className="glass-card rounded-xl p-3 border border-red-500/20 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-300">{saveError}</p>
              </div>
            )}

            <div className="glass-card rounded-xl p-3.5 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                얼굴이 감지되면 자동으로 등록됩니다
              </p>
              <button
                onClick={() => setStep("guide")}
                className="text-[11px] text-slate-500 border border-white/10 rounded-lg px-2.5 py-1.5 flex-shrink-0 ml-2"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: 저장 중 ── */}
        {step === "saving" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Loader2 className="w-9 h-9 text-blue-400 animate-spin" />
              </div>
              <div className="absolute inset-0 rounded-full border-t-2 border-blue-500 animate-spin" style={{ animationDuration: "0.8s" }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-white">Supabase에 저장 중…</p>
              <p className="text-xs text-slate-500 mt-1">이름: {name}</p>
            </div>
          </div>
        )}

        {/* ── Step 5: 완료 ── */}
        {step === "done" && savedProfile && (
          <div className="flex flex-col gap-4 animate-fade-up" style={{ opacity: 0 }}>
            {/* 성공 배지 */}
            <div className="flex flex-col items-center py-6 gap-3">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center">
                <CheckCircle2 className="w-11 h-11 text-emerald-400" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-white">등록 완료!</p>
                <p className="text-sm text-slate-400 mt-0.5">
                  <span className="text-white font-medium">{savedProfile.name}</span> 님의 얼굴이 저장되었습니다
                </p>
              </div>
            </div>

            {/* 저장 정보 카드 */}
            <div className="glass-card rounded-xl p-4 border border-emerald-500/15">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400">저장된 정보</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "이름", value: savedProfile.name },
                  { label: "특징점", value: `${savedProfile.landmarkCount}pts` },
                  { label: "벡터 차원", value: "128-dim" },
                  { label: "저장소", value: "Supabase" },
                ].map((item, i) => (
                  <div key={i} className="bg-white/3 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-slate-500">{item.label}</p>
                    <p className="text-xs font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => router.push("/auth")}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-base active:scale-[0.98] transition-transform"
            >
              인증 시작하기
            </button>
            <button
              onClick={() => { setStep("name"); setSavedProfile(null); savingRef.current = false; }}
              className="w-full py-3.5 rounded-2xl bg-white/5 border border-white/8 text-slate-300 font-medium text-sm"
            >
              추가 등록
            </button>
          </div>
        )}
      </div>

      <div className="pb-10 flex-shrink-0" />
    </div>
  );
}

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Shield, CheckCircle2, XCircle, AlertCircle, Users } from "lucide-react";
import FaceDetector from "../components/FaceDetector";
import {
  getAllFaceProfiles, findBestMatch, AUTH_THRESHOLD,
  type FaceProfile, type MatchResult,
} from "../../lib/faceDb";
import { isSupabaseConfigured } from "../../lib/supabase";

type Step = "ready" | "detecting" | "success" | "fail";

export default function AuthPage() {
  const router = useRouter();
  const [step, setStep]           = useState<Step>("ready");
  const [profiles, setProfiles]   = useState<FaceProfile[]>([]);
  const [loadingDB, setLoadingDB] = useState(false);
  const [dbError, setDbError]     = useState("");

  // 실시간 비교 상태
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [matchHistory, setMatchHistory] = useState<number[]>([]); // 최근 N개 matchRate 이력

  // 성공 트리거 중복 방지
  const successFiredRef = useRef(false);

  // ── DB에서 프로필 로드 ─────────────────────────────────────────
  const loadProfiles = useCallback(async () => {
    setLoadingDB(true);
    setDbError("");
    try {
      const data = await getAllFaceProfiles();
      setProfiles(data);
      if (data.length === 0) setDbError("등록된 얼굴 프로필이 없습니다. 먼저 등록해주세요.");
    } catch (e) {
      setDbError(e instanceof Error ? e.message : "DB 조회 실패");
    } finally {
      setLoadingDB(false);
    }
  }, []);

  useEffect(() => {
    if (isSupabaseConfigured) loadProfiles();
  }, [loadProfiles]);

  // ── descriptor 수신 → 실시간 비교 ────────────────────────────
  const handleDescriptor = useCallback(
    (descriptor: Float32Array) => {
      if (step !== "detecting" || profiles.length === 0) return;

      const result = findBestMatch(descriptor, profiles);
      setMatchResult(result);

      // 이력 갱신 (최근 5개)
      setMatchHistory((prev) => {
        const next = [...prev.slice(-4), result.matchRate];
        return next;
      });

      // 연속 3회 이상 90% 초과 시 인증 성공
      setMatchHistory((prev) => {
        const recent = [...prev.slice(-4), result.matchRate];
        const above = recent.filter((r) => r >= AUTH_THRESHOLD).length;
        if (above >= 3 && !successFiredRef.current) {
          successFiredRef.current = true;
          setStep("success");
          setTimeout(() => {
            sessionStorage.setItem(
              "authResult",
              JSON.stringify({
                name: result.profile?.name ?? "사용자",
                matchRate: result.matchRate,
                distance: result.distance.toFixed(4),
              }),
            );
            router.push("/auth-result");
          }, 1800);
        }
        return recent;
      });
    },
    [step, profiles, router],
  );

  const reset = () => {
    setStep("ready");
    setMatchResult(null);
    setMatchHistory([]);
    successFiredRef.current = false;
  };

  // 최근 이력 평균 일치율
  const avgRate = matchHistory.length > 0
    ? Math.round(matchHistory.reduce((a, b) => a + b, 0) / matchHistory.length)
    : 0;

  // Supabase 미설정
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-dvh bg-[#0B0E1A] flex flex-col items-center justify-center px-6 gap-5">
        <AlertCircle className="w-10 h-10 text-amber-400" />
        <div className="text-center">
          <h2 className="text-lg font-bold text-white">Supabase 설정 필요</h2>
          <p className="text-sm text-slate-400 mt-1">.env.local 파일을 설정해주세요.</p>
        </div>
        <button onClick={() => router.push("/")} className="text-sm text-blue-400 underline">홈으로</button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0B0E1A] flex flex-col relative overflow-hidden">
      <div className="absolute top-[-100px] right-[-80px] w-[280px] h-[280px] rounded-full bg-indigo-600/10 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[60px] left-[-60px] w-[220px] h-[220px] rounded-full bg-violet-600/8 blur-[70px] pointer-events-none" />

      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 pt-14 pb-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { reset(); router.back(); }}
            className="w-9 h-9 rounded-full bg-white/5 border border-white/8 flex items-center justify-center active:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-300" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">얼굴 인증</h1>
            <p className="text-xs text-slate-500">Face Authentication</p>
          </div>
        </div>

        {/* 등록된 프로필 수 */}
        {profiles.length > 0 && (
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/8 rounded-full px-3 py-1.5">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] text-slate-400">{profiles.length}명 등록</span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col px-5">

        {/* ── 카메라 영역 ── */}
        <div className="relative rounded-3xl overflow-hidden border border-white/8 aspect-[3/4] max-h-[380px]">

          {/* Ready 상태 */}
          {step === "ready" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-[#0D1020]">
              <div className="relative">
                <div className="absolute w-44 h-44 rounded-full border border-indigo-500/10 scale-[1.4] top-[-16px] left-[-16px]" />
                <div className="absolute w-44 h-44 rounded-full border border-indigo-500/15 scale-[1.2] top-[-8px] left-[-8px]" />
                <div className="w-36 h-36 rounded-full bg-indigo-950/60 border border-indigo-500/25 flex items-center justify-center">
                  <Shield className="w-14 h-14 text-indigo-400/60" strokeWidth={1} />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-300">인증 준비됨</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {profiles.length > 0 ? `${profiles.length}명의 등록 얼굴과 비교합니다` : "등록된 얼굴 없음"}
                </p>
              </div>
            </div>
          )}

          {/* 실제 카메라 + 감지 */}
          {step === "detecting" && (
            <FaceDetector
              active={true}
              withDescriptor={true}
              descriptorInterval={12}
              onDescriptor={handleDescriptor}
              className="absolute inset-0 w-full h-full"
            />
          )}

          {/* 성공 */}
          {step === "success" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0D1020]">
              <div className="w-24 h-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500/50 flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-white">인증 성공</p>
                <p className="text-sm text-emerald-400 font-semibold mt-0.5">{matchResult?.profile?.name} 님</p>
                <p className="text-xs text-slate-500 mt-0.5">결과 화면으로 이동합니다…</p>
              </div>
            </div>
          )}

          {/* 실패 */}
          {step === "fail" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0D1020]">
              <div className="w-24 h-24 rounded-full bg-red-500/10 border-2 border-red-500/40 flex items-center justify-center">
                <XCircle className="w-12 h-12 text-red-400" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-white">인증 실패</p>
                <p className="text-xs text-slate-400 mt-0.5">일치율이 90% 미만입니다</p>
              </div>
            </div>
          )}

          {/* 감지 중 일치율 오버레이 */}
          {step === "detecting" && matchResult && (
            <div className="absolute bottom-3 inset-x-3 pointer-events-none">
              <div className={`glass-card rounded-xl p-3 border transition-all
                ${matchResult.matchRate >= AUTH_THRESHOLD
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : matchResult.matchRate >= 70
                    ? "border-blue-500/25"
                    : "border-white/8"}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {matchResult.profile ? `✦ ${matchResult.profile.name}` : "비교 중…"}
                  </span>
                  <span className={`text-sm font-bold font-mono transition-colors
                    ${matchResult.matchRate >= AUTH_THRESHOLD ? "text-emerald-400"
                      : matchResult.matchRate >= 70 ? "text-blue-400" : "text-slate-400"}`}>
                    {matchResult.matchRate}%
                  </span>
                </div>
                {/* 일치율 바 */}
                <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300
                      ${matchResult.matchRate >= AUTH_THRESHOLD
                        ? "bg-gradient-to-r from-emerald-500 to-green-400"
                        : matchResult.matchRate >= 70
                          ? "bg-gradient-to-r from-blue-500 to-indigo-400"
                          : "bg-slate-600"}`}
                    style={{ width: `${matchResult.matchRate}%` }}
                  />
                </div>
                {/* 90% 임계선 표시 */}
                <div
                  className="absolute bottom-[18px] w-[1px] h-[6px] bg-white/30"
                  style={{ left: `calc(${AUTH_THRESHOLD}% + 12px)` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── 상태 텍스트 + 평균 일치율 ── */}
        <div className="text-center mt-5 space-y-1">
          <h2 className="text-xl font-bold text-white tracking-tight">
            {step === "ready"     && "얼굴 인증 준비"}
            {step === "detecting" && (matchResult !== null ? "얼굴 비교 중" : "얼굴 감지 중")}
            {step === "success"   && "인증 완료"}
            {step === "fail"      && "인증 실패"}
          </h2>
          <p className="text-sm text-slate-400">
            {step === "ready"     && "버튼을 눌러 얼굴 인증을 시작하세요"}
            {step === "detecting" && (
              matchResult
                ? `일치율 ${matchResult.matchRate}% (임계값 ${AUTH_THRESHOLD}%)`
                : "카메라를 정면으로 바라봐 주세요"
            )}
            {step === "success" && "잠시 후 자동으로 이동합니다"}
            {step === "fail"    && "조건을 개선 후 다시 시도하세요"}
          </p>

          {/* 평균 일치율 히스토리 도트 */}
          {step === "detecting" && matchHistory.length > 0 && (
            <div className="flex items-center justify-center gap-1.5 pt-1">
              {matchHistory.map((r, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors
                    ${r >= AUTH_THRESHOLD ? "bg-emerald-400" : r >= 70 ? "bg-blue-400" : "bg-slate-600"}`}
                  title={`${r}%`}
                />
              ))}
              {matchHistory.length >= 2 && (
                <span className="text-[10px] text-slate-500 ml-1">평균 {avgRate}%</span>
              )}
            </div>
          )}
        </div>

        {/* 보안 칩 */}
        <div className="flex justify-center gap-2 mt-3">
          {[
            { label: `임계값 ${AUTH_THRESHOLD}%`, color: "text-emerald-400 bg-emerald-500/10" },
            { label: "128-dim 벡터", color: "text-blue-400 bg-blue-500/10" },
            { label: "실시간 비교", color: "text-indigo-400 bg-indigo-500/10" },
          ].map((c, i) => (
            <span key={i} className={`text-[10px] font-medium px-2.5 py-1 rounded-full ${c.color}`}>
              {c.label}
            </span>
          ))}
        </div>

        {/* ── 에러 메시지 ── */}
        {dbError && (
          <div className="mt-4 glass-card rounded-xl p-3.5 border border-amber-500/20 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-amber-300">{dbError}</p>
              {dbError.includes("등록된") && (
                <button
                  onClick={() => router.push("/register")}
                  className="text-[11px] text-blue-400 underline mt-1"
                >
                  얼굴 등록하러 가기
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── 액션 버튼 ── */}
        <div className="mt-5 space-y-3">
          {step === "ready" && (
            <button
              onClick={() => {
                if (profiles.length === 0) return;
                reset();
                setStep("detecting");
              }}
              disabled={loadingDB || profiles.length === 0}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-base active:scale-[0.98] transition-transform relative overflow-hidden animate-pulse-glow disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0" />
              <div className="relative flex items-center justify-center gap-2">
                <Shield className="w-5 h-5" />
                <span>{loadingDB ? "프로필 로딩 중…" : "인증 시작"}</span>
              </div>
            </button>
          )}

          {step === "detecting" && (
            <button
              onClick={reset}
              className="w-full py-3.5 rounded-2xl bg-white/5 border border-white/8 text-slate-300 font-medium text-sm"
            >
              취소
            </button>
          )}

          {(step === "fail") && (
            <>
              <button
                onClick={reset}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-base active:scale-[0.98] transition-transform"
              >
                다시 시도
              </button>
              <button
                onClick={() => router.push("/")}
                className="w-full py-3.5 rounded-2xl bg-white/5 border border-white/8 text-slate-300 font-medium text-sm"
              >
                홈으로
              </button>
            </>
          )}
        </div>
      </div>

      <div className="pb-12 flex-shrink-0" />
    </div>
  );
}

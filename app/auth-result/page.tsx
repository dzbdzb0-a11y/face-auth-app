"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, CheckCircle2, ChevronRight, Home, Clock, User } from "lucide-react";
import { AUTH_THRESHOLD } from "../../lib/faceDb";

interface AuthResult {
  name: string;
  matchRate: number;
  distance: string;
}

export default function AuthResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<AuthResult | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("authResult");
      if (raw) {
        setResult(JSON.parse(raw));
        sessionStorage.removeItem("authResult"); // 1회용
      } else {
        // 직접 접근 시 홈으로
        router.replace("/");
      }
    } catch {
      router.replace("/");
    }
  }, [router]);

  if (!result) {
    return (
      <div className="min-h-dvh bg-[#0B0E1A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  const dateStr = now.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });

  // 일치율 색상
  const rateColor =
    result.matchRate >= 95 ? "text-emerald-400" :
    result.matchRate >= 90 ? "text-green-400" : "text-blue-400";

  return (
    <div className="min-h-dvh bg-[#0B0E1A] flex flex-col relative overflow-hidden">
      {/* 배경 */}
      <div className="absolute top-0 inset-x-0 h-[45%] bg-gradient-to-b from-emerald-950/20 to-transparent pointer-events-none" />
      <div className="absolute top-[-80px] left-[50%] -translate-x-1/2 w-[300px] h-[300px] rounded-full bg-emerald-600/10 blur-[80px] pointer-events-none" />

      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 pt-14 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[15px] font-semibold text-white tracking-tight">FaceSecure</span>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-semibold text-emerald-400">인증됨</span>
        </div>
      </div>

      {/* 성공 배지 */}
      <div className="flex flex-col items-center px-5 pt-6 animate-fade-up" style={{ opacity: 0 }}>
        <div className="relative mb-5">
          <div className="w-24 h-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400" strokeWidth={1.5} />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-blue-500 border-2 border-[#0B0E1A] flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" strokeWidth={2} />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white tracking-tight text-center">
          인증 완료
        </h1>
        <p className="text-sm text-slate-400 mt-1">신원이 확인되었습니다</p>

        {/* 인증 시각 */}
        <div className="flex items-center gap-2 mt-3 bg-white/5 rounded-full px-4 py-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-400">{dateStr} {timeStr}</span>
        </div>
      </div>

      {/* 인증된 사용자 카드 */}
      <div className="px-5 mt-6 animate-fade-up" style={{ animationDelay: "0.08s", opacity: 0 }}>
        <div className="glass-card rounded-2xl p-5 border border-emerald-500/12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
              <User className="w-7 h-7 text-blue-300" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 font-medium">인증된 사용자</p>
              <p className="text-xl font-bold text-white mt-0.5 truncate">{result.name}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-slate-500">일치율</p>
              <p className={`text-2xl font-bold font-mono ${rateColor}`}>
                {result.matchRate}%
              </p>
            </div>
          </div>

          {/* 일치율 바 */}
          <div className="mt-4">
            <div className="flex justify-between text-[10px] text-slate-500 mb-1.5">
              <span>일치율</span>
              <span className="font-mono">임계값 {AUTH_THRESHOLD}%</span>
            </div>
            <div className="h-2 bg-white/8 rounded-full overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-700
                  ${result.matchRate >= 95 ? "bg-gradient-to-r from-emerald-500 to-green-400"
                    : "bg-gradient-to-r from-blue-500 to-indigo-400"}`}
                style={{ width: `${result.matchRate}%` }}
              />
              {/* 90% 기준선 */}
              <div
                className="absolute top-0 bottom-0 w-[1.5px] bg-white/25"
                style={{ left: `${AUTH_THRESHOLD}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 인증 상세 정보 */}
      <div className="px-5 mt-4 animate-fade-up" style={{ animationDelay: "0.14s", opacity: 0 }}>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">인증 상세</p>
          <div className="space-y-2.5">
            {[
              { label: "인증 방식", value: "얼굴 생체 인증 (ResNet-34)" },
              { label: "특징 벡터", value: "128-dim descriptor" },
              { label: "유클리드 거리", value: result.distance },
              { label: "인증 임계값", value: `${AUTH_THRESHOLD}% 이상`, highlight: true },
              { label: "세션 유효", value: "30분" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-sm text-slate-400">{item.label}</span>
                <span className={`text-sm font-semibold ${item.highlight ? rateColor : "text-white"}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 인증 후 서비스 */}
      <div className="px-5 mt-4 animate-fade-up" style={{ animationDelay: "0.2s", opacity: 0 }}>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">인증 후 서비스</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "계좌 이체", desc: "즉시 이체 가능", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/15" },
            { label: "결제 승인", desc: "간편 결제", color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/15" },
            { label: "대출 조회", desc: "한도 확인", color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/15" },
            { label: "보안 설정", desc: "설정 변경", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/15" },
          ].map((item, i) => (
            <button
              key={i}
              className={`glass-card border rounded-xl p-4 text-left ${item.bg} active:scale-[0.97] transition-transform`}
            >
              <p className={`text-sm font-semibold ${item.color}`}>{item.label}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
              <ChevronRight className={`w-4 h-4 ${item.color} mt-2`} />
            </button>
          ))}
        </div>
      </div>

      {/* 홈 버튼 */}
      <div className="px-5 mt-5 pb-12 animate-fade-up" style={{ animationDelay: "0.26s", opacity: 0 }}>
        <button
          onClick={() => router.push("/")}
          className="w-full py-4 rounded-2xl bg-white/5 border border-white/8 text-slate-300 font-semibold text-sm active:bg-white/8 transition-colors flex items-center justify-center gap-2"
        >
          <Home className="w-4 h-4" />
          <span>홈으로 돌아가기</span>
        </button>
      </div>
    </div>
  );
}

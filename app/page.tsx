"use client";

import Link from "next/link";
import { Shield, ScanFace, ChevronRight, Bell, Fingerprint, TrendingUp, Lock } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-[#0B0E1A] flex flex-col relative overflow-hidden">
      {/* 배경 그라디언트 orbs */}
      <div className="absolute top-[-120px] left-[-80px] w-[320px] h-[320px] rounded-full bg-blue-600/10 blur-[80px] pointer-events-none" />
      <div className="absolute top-[200px] right-[-100px] w-[260px] h-[260px] rounded-full bg-indigo-600/10 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[100px] left-[50%] translate-x-[-50%] w-[300px] h-[300px] rounded-full bg-violet-600/8 blur-[100px] pointer-events-none" />

      {/* 헤더 */}
      <div className="flex items-center justify-between px-6 pt-14 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[15px] font-semibold text-white tracking-tight">FaceSecure</span>
        </div>
        <div className="relative">
          <button className="w-8 h-8 rounded-full bg-white/5 border border-white/8 flex items-center justify-center">
            <Bell className="w-4 h-4 text-slate-400" />
          </button>
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-500" />
        </div>
      </div>

      {/* 인사 영역 */}
      <div className="px-6 pt-6 pb-2 animate-fade-up" style={{ animationDelay: "0.05s", opacity: 0 }}>
        <p className="text-sm text-slate-400 font-medium">안녕하세요 👋</p>
        <h1 className="text-2xl font-bold text-white mt-0.5 tracking-tight">
          얼굴로 시작하는<br />
          <span className="gradient-text">안전한 금융</span>
        </h1>
      </div>

      {/* 보안 상태 카드 */}
      <div className="px-5 pt-5 animate-fade-up" style={{ animationDelay: "0.1s", opacity: 0 }}>
        <div className="glass-card rounded-2xl p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-indigo-600/5 pointer-events-none" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">보안 상태</p>
              <p className="text-base font-semibold text-white mt-0.5">얼굴 인증 준비됨</p>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-400">보호중</span>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            {[
              { icon: <Fingerprint className="w-3.5 h-3.5" />, label: "생체 인증", color: "text-blue-400", bg: "bg-blue-500/10" },
              { icon: <Lock className="w-3.5 h-3.5" />, label: "암호화", color: "text-indigo-400", bg: "bg-indigo-500/10" },
              { icon: <TrendingUp className="w-3.5 h-3.5" />, label: "이상 탐지", color: "text-violet-400", bg: "bg-violet-500/10" },
            ].map((item, i) => (
              <div key={i} className={`flex items-center gap-1.5 ${item.bg} rounded-lg px-2.5 py-1.5`}>
                <span className={item.color}>{item.icon}</span>
                <span className={`text-[11px] font-medium ${item.color}`}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 메인 액션 버튼들 */}
      <div className="px-5 pt-5 flex flex-col gap-3 animate-fade-up" style={{ animationDelay: "0.18s", opacity: 0 }}>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-1">빠른 실행</p>

        {/* 얼굴 등록 버튼 */}
        <Link href="/register" className="block">
          <div className="relative rounded-2xl overflow-hidden active:scale-[0.98] transition-transform duration-150">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600" />
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl translate-x-8 -translate-y-8" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-400/10 rounded-full blur-xl -translate-x-4 translate-y-4" />
            <div className="relative flex items-center justify-between p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
                  <ScanFace className="w-6 h-6 text-white" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-blue-200 uppercase tracking-wider">Step 1</p>
                  <p className="text-lg font-bold text-white tracking-tight">얼굴 등록</p>
                  <p className="text-[12px] text-blue-200/80 mt-0.5">처음 사용 시 먼저 등록하세요</p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                <ChevronRight className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </Link>

        {/* 인증 시작 버튼 */}
        <Link href="/auth" className="block">
          <div className="relative rounded-2xl overflow-hidden active:scale-[0.98] transition-transform duration-150 glass-card">
            <div className="absolute inset-0 bg-gradient-to-br from-white/3 to-white/0 pointer-events-none" />
            <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/5 rounded-full blur-2xl translate-x-6 -translate-y-6" />
            <div className="relative flex items-center justify-between p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-indigo-400" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-indigo-400 uppercase tracking-wider">Step 2</p>
                  <p className="text-lg font-bold text-white tracking-tight">인증 시작</p>
                  <p className="text-[12px] text-slate-400 mt-0.5">등록된 얼굴로 인증하기</p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-indigo-500/15 border border-indigo-500/15 flex items-center justify-center">
                <ChevronRight className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* 최근 인증 내역 */}
      <div className="px-5 pt-5 animate-fade-up" style={{ animationDelay: "0.26s", opacity: 0 }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">최근 인증 내역</p>
          <button className="text-[11px] text-blue-400 font-medium">전체보기</button>
        </div>
        <div className="glass-card rounded-2xl divide-y divide-white/5 overflow-hidden">
          {[
            { time: "오늘 14:23", action: "얼굴 인증 성공", badge: "이체 승인" },
            { time: "오늘 09:11", action: "얼굴 인증 성공", badge: "로그인" },
            { time: "어제 18:47", action: "얼굴 인증 성공", badge: "결제 승인" },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-emerald-400" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-white">{item.action}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{item.time}</p>
                </div>
              </div>
              <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                {item.badge}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 하단 네비게이션 */}
      <div className="mt-auto pt-5">
        <nav className="glass-card border-t border-white/6 px-2 py-3 pb-8">
          <div className="flex justify-around">
            {[
              { label: "홈", active: true },
              { label: "내역", active: false },
              { label: "보안", active: false },
              { label: "설정", active: false },
            ].map((item, i) => (
              <button
                key={i}
                className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-colors
                  ${item.active ? "text-blue-400" : "text-slate-500"}`}
              >
                <span className="text-[10px] font-semibold tracking-wide">{item.label}</span>
                {item.active && <span className="w-1 h-1 rounded-full bg-blue-400 mt-0.5" />}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}

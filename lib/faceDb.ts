import { supabase } from "./supabase";

// ── 타입 ────────────────────────────────────────────────────────────
export interface FaceProfile {
  id: string;
  name: string;
  descriptor: number[]; // 128차원 float 벡터
  created_at: string;
}

export interface MatchResult {
  profile: FaceProfile | null;
  distance: number;
  matchRate: number; // 0-100
}

// ── 유클리드 거리 (face-api.js 의존 없이 직접 계산) ────────────────
export function euclideanDistance(
  a: Float32Array,
  b: number[] | Float32Array,
): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * 유클리드 거리 → 일치율(%) 변환
 *
 * face-api.js ResNet-34 descriptor 특성:
 *   - 같은 사람, 좋은 조건: 거리 0.1~0.3
 *   - 같은 사람, 다른 조건: 거리 0.3~0.5
 *   - 다른 사람: 거리 0.6 이상
 *
 * 매핑:  distance 0.0 → 100%
 *         distance 0.2 → 80%   ← 인증 임계값
 *         distance 0.5 → 50%
 *         distance 1.0 → 0%
 */
export function toMatchRate(distance: number): number {
  return Math.max(0, Math.min(100, Math.round((1 - distance) * 100)));
}

// 인증 성공 임계값
export const AUTH_THRESHOLD = 80;

// ── DB 저장 ─────────────────────────────────────────────────────────
export async function saveFaceProfile(
  name: string,
  descriptor: Float32Array,
): Promise<FaceProfile> {
  const { data, error } = await supabase
    .from("face_profiles")
    .insert({ name, descriptor: Array.from(descriptor) })
    .select()
    .single();

  if (error) throw new Error(`저장 실패: ${error.message}`);
  return data as FaceProfile;
}

// ── DB 조회 (전체) ───────────────────────────────────────────────────
export async function getAllFaceProfiles(): Promise<FaceProfile[]> {
  const { data, error } = await supabase
    .from("face_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`조회 실패: ${error.message}`);
  return (data ?? []) as FaceProfile[];
}

// ── 최적 매칭 탐색 (동기, DB 호출 없음) ────────────────────────────
export function findBestMatch(
  descriptor: Float32Array,
  profiles: FaceProfile[],
): MatchResult {
  if (profiles.length === 0) {
    return { profile: null, distance: Infinity, matchRate: 0 };
  }

  let bestProfile: FaceProfile | null = null;
  let bestDistance = Infinity;

  for (const profile of profiles) {
    const dist = euclideanDistance(descriptor, profile.descriptor);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestProfile = profile;
    }
  }

  return {
    profile: bestProfile,
    distance: bestDistance,
    matchRate: toMatchRate(bestDistance),
  };
}

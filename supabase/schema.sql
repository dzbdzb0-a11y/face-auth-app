-- ============================================================
-- FaceSecure - Supabase 테이블 설정
-- Supabase 대시보드 → SQL Editor 에서 실행하세요
-- ============================================================

-- 얼굴 프로필 테이블
CREATE TABLE IF NOT EXISTS face_profiles (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text        NOT NULL,
  descriptor  float8[]    NOT NULL,  -- 128차원 얼굴 특징 벡터 (ResNet-34)
  created_at  timestamptz DEFAULT now()
);

-- Row Level Security 활성화
ALTER TABLE face_profiles ENABLE ROW LEVEL SECURITY;

-- 공개 읽기/쓰기 허용 (데모용 — 프로덕션에서는 auth 기반 정책으로 교체)
CREATE POLICY "allow_all" ON face_profiles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 조회 성능용 인덱스
CREATE INDEX IF NOT EXISTS idx_face_profiles_created_at
  ON face_profiles (created_at DESC);

import type { SQLiteDatabase } from 'expo-sqlite';

export const DB_NAME = 'letters.db';

/**
 * 로컬 데이터베이스 초기화 — TSD.md 6.3 'expo-sqlite 스키마 초안' 기준.
 *
 * 테이블 세 개:
 * - letter: 편지 메타(애칭·날짜 등). 이미지 자체는 넣지 않는다(BLOB 회피).
 * - asset: 이미지 파일 경로(local_path). 편지 이미지·조각의 실제 저장처.
 * - segment: 2단계 세그멘테이션 확정 조각(줄/문장) — 보기 모드 '한 줄씩'/'한 문장씩'과
 *   위젯 랜덤 풀의 원소. 쓰는 쪽은 src/segmentation-store.ts.
 *
 * favorite(Phase 1 별표)는 그 단계에서 추가한다 — 미리 만들지 않음.
 *
 * segment의 REFERENCES 절은 TSD.md 6.3 그대로 두지만 PRAGMA foreign_keys를 켜지
 * 않으므로 강제되지 않는다 — 편지 삭제 시 segment·asset 정리는 명시 DELETE로 한다
 * (segmentation-store.ts deleteSegmentationRows, TSD.md 6.5 삭제 시맨틱).
 * CREATE TABLE IF NOT EXISTS라 기존 설치본도 다음 실행 때 segment 테이블을 얻는다.
 */
export async function initLetterDb(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS letter (
      id                  TEXT PRIMARY KEY,
      author_display_name TEXT NOT NULL,
      author_record_id    TEXT,
      title               TEXT,
      written_date        INTEGER,
      received_date       INTEGER,
      scanned_at          INTEGER NOT NULL,
      original_asset_id   TEXT,
      cleaned_asset_id    TEXT,
      segment_order       TEXT,
      page_count          INTEGER NOT NULL DEFAULT 1,
      processing_status   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS asset (
      id         TEXT PRIMARY KEY,
      kind       TEXT NOT NULL,
      local_path TEXT NOT NULL,
      byte_size  INTEGER,
      checksum   TEXT
    );

    CREATE TABLE IF NOT EXISTS segment (
      id            TEXT PRIMARY KEY,
      letter_id     TEXT NOT NULL REFERENCES letter(id) ON DELETE CASCADE,
      idx           INTEGER NOT NULL,
      granularity   TEXT NOT NULL,
      crop_asset_id TEXT,
      bbox          TEXT,
      ocr_text      TEXT,
      aspect_ratio  REAL
    );

    CREATE INDEX IF NOT EXISTS idx_segment_letter ON segment(letter_id);
  `);
}

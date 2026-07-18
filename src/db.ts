import type { SQLiteDatabase } from 'expo-sqlite';

export const DB_NAME = 'letters.db';

/**
 * 로컬 데이터베이스 초기화 — TSD.md 6.3 'expo-sqlite 스키마 초안' 기준.
 *
 * 1단계(앱 골격 + 이미지 획득)에 필요한 두 테이블만 만든다:
 * - letter: 편지 메타(애칭·날짜 등). 이미지 자체는 넣지 않는다(BLOB 회피).
 * - asset: 이미지 파일 경로(local_path). 편지 이미지의 실제 저장처.
 *
 * segment(2단계 세그멘테이션 산물)·favorite(Phase 1 별표)는 해당 단계에서 추가한다.
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
  `);
}

/**
 * 세그멘테이션 확정 산출물 영구화 — segment·asset 행 + 문서 폴더 파일.
 *
 * segmentLetterImage(src/segmentation.ts)의 산출물은 캐시 `segmentation/<임의 id>/`에
 * '후보'로 담긴다. 수동 보정 UI(TSD.md 4.5)에서 사용자가 확정하는 시점에 이 모듈이
 * ① 파일을 문서 폴더 `segments/<letterId>/`로 옮기고(캐시는 시스템이 지울 수 있다 —
 *    확정본은 문서 폴더가 맞는 자리, TSD.md 6.4)
 * ② asset(kind='cleanedFull'/'segmentCrop')·segment 행을 넣고
 * ③ letter의 cleaned_asset_id·segment_order·processing_status를 갱신한다 (TSD.md 6.3).
 *
 * processing_status 규칙 (DECISIONS_NEEDED.md 9 — 채택(자율)):
 * - 조각 1개 이상 확정 → 'ready' (보기 모드 '한 줄씩'·위젯 랜덤 풀에 나갈 준비 완료)
 * - 조각 0개(★통짜 후퇴, TSD.md 4.5) → 'cleaned' (cleanedFull만 — '통째로' 전용, 4.6 정합)
 *
 * 재확정 = 통째 교체: 같은 편지를 다시 세그멘테이션-확정하면 이전 확정본(행·파일)을
 * 지우고 새로 쓴다. 어긋남 창(파일은 새것·행은 옛것)이 생겨도 원본(letters/)이 불변이라
 * 세그멘테이션 재실행으로 복구된다(결정 8 — 디지털은 사본, 실물이 원본).
 *
 * ocr_text는 항상 NULL — 결정 2(OCR 없음): 손글씨 그 자체가 표시물이다.
 *
 * SDK 57 API 실측 (설치본 expo-file-system):
 * - File.move(destination): Promise<void> — build/internal/NativeFileSystem.types.d.ts.
 * - File.size: number (없으면 0), Directory.exists: boolean.
 * - Directory.delete(): void — 네이티브가 deleteRecursively()로 내용까지 지운다
 *   (android/.../FileSystemPath.kt 실측).
 */
import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { SegmentCandidate, SegmentationResult, SegmentGranularity } from './segmentation';

const SEGMENTS_DIR_NAME = 'segments';

// 편지 1통의 확정 산출물 폴더 — 문서 폴더 segments/<letterId>/
export function persistedSegmentationDir(letterId: string): Directory {
  return new Directory(Paths.document, SEGMENTS_DIR_NAME, letterId);
}

/**
 * 한 편지의 세그멘테이션 DB 행 정리 — segment 행 + cleanedFull/segmentCrop asset 행.
 *
 * 트랜잭션을 만들지 않는다 — 호출자가 withTransactionAsync로 감싼다.
 * 두 호출처: ① persistSegmentationResult의 재확정 교체 ② 편지 삭제(LetterDetailScreen).
 * cleaned_asset_id를 letter 행에서 되읽으므로 letter 행을 지우기 전에 불러야 한다.
 * letter의 포인터(cleaned_asset_id 등)는 건드리지 않는다 — 호출자가 곧바로
 * letter 행을 지우거나(삭제) 새 값으로 UPDATE한다(재확정).
 */
export async function deleteSegmentationRows(db: SQLiteDatabase, letterId: string): Promise<void> {
  await db.runAsync(
    'DELETE FROM asset WHERE id IN (SELECT crop_asset_id FROM segment WHERE letter_id = ?)',
    [letterId]
  );
  await db.runAsync('DELETE FROM asset WHERE id = (SELECT cleaned_asset_id FROM letter WHERE id = ?)', [
    letterId,
  ]);
  await db.runAsync('DELETE FROM segment WHERE letter_id = ?', [letterId]);
}

/**
 * 한 편지의 확정 산출물 파일 정리 — segments/<letterId>/ 통째 삭제.
 * DB 정리와 분리한 이유: 파일 삭제 실패는 고아 파일만 남긴다(치명 아님 —
 * LetterDetailScreen의 원본 사본 정리와 같은 태도). 호출자가 try/catch로 감싼다.
 */
export function deleteSegmentationDir(letterId: string): void {
  const dir = persistedSegmentationDir(letterId);
  if (dir.exists) dir.delete();
}

/** 영구화가 끝난 파일들의 위치 — 위젯 썸네일 동기화(letter-widget-thumbs)의 원천. */
export type PersistedSegmentationFiles = {
  /** 문서 폴더 segments/<letterId>/cleaned-full.jpg 의 file:// 경로 */
  cleanedFullUri: string;
  /** 확정 조각(빈 배열 = 통짜 후퇴). 배열 순서 = 받은 result.segments 순서 = segment_order 순서. */
  segments: { index: number; granularity: SegmentGranularity; uri: string }[];
};

/**
 * 보정 UI에서 확정된 세그멘테이션 결과를 영구화한다 (파일 머리 주석의 ①②③).
 *
 * @param result 확정된 산출물 — cleanedFullUri·segments의 파일은 캐시의 후보 파일이며
 *   이 함수가 문서 폴더로 옮긴다(move — 캐시에는 남지 않는다).
 *   segments가 빈 배열이면 '통짜 후퇴'(TSD.md 4.5): cleanedFull만 영구화한다.
 * @returns 영구화된 파일 위치 — 호출자가 위젯 풀 동기화(TSD.md 5.2)에 쓴다.
 */
export async function persistSegmentationResult(
  db: SQLiteDatabase,
  letterId: string,
  result: SegmentationResult
): Promise<PersistedSegmentationFiles> {
  // ① 파일 먼저 — 이전 확정본 폴더를 비우고(재확정 = 통째 교체) 후보 파일을 옮긴다.
  deleteSegmentationDir(letterId);
  const dir = persistedSegmentationDir(letterId);
  dir.create({ intermediates: true, idempotent: true });

  const cleanedFile = new File(dir, 'cleaned-full.jpg');
  await new File(result.cleanedFullUri).move(cleanedFile);

  const moved: { seg: SegmentCandidate; segmentId: string; cropAssetId: string; cropFile: File }[] =
    [];
  for (const seg of result.segments) {
    const cropFile = new File(dir, `${seg.granularity}-${seg.index}.jpg`);
    await new File(seg.cropUri).move(cropFile);
    moved.push({ seg, segmentId: Crypto.randomUUID(), cropAssetId: Crypto.randomUUID(), cropFile });
  }

  // ② + ③ DB 행 — 한 트랜잭션. segment_order = 받은 segments 배열 순서(보정 UI의 표시
  // 순서 — '순서 지정' 재정렬이 반영된 순서다. idx는 검출 번호일 뿐 순서의 원천이 아니다).
  const cleanedAssetId = Crypto.randomUUID();
  await db.withTransactionAsync(async () => {
    await deleteSegmentationRows(db, letterId);
    await db.runAsync('INSERT INTO asset (id, kind, local_path, byte_size) VALUES (?, ?, ?, ?)', [
      cleanedAssetId,
      'cleanedFull',
      cleanedFile.uri,
      cleanedFile.size,
    ]);
    for (const { seg, segmentId, cropAssetId, cropFile } of moved) {
      await db.runAsync('INSERT INTO asset (id, kind, local_path, byte_size) VALUES (?, ?, ?, ?)', [
        cropAssetId,
        'segmentCrop',
        cropFile.uri,
        cropFile.size,
      ]);
      await db.runAsync(
        `INSERT INTO segment (id, letter_id, idx, granularity, crop_asset_id, bbox, aspect_ratio)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          segmentId,
          letterId,
          seg.index,
          seg.granularity,
          cropAssetId,
          JSON.stringify(seg.boundingBox),
          seg.aspectRatio,
        ]
      );
    }
    await db.runAsync(
      'UPDATE letter SET cleaned_asset_id = ?, segment_order = ?, processing_status = ? WHERE id = ?',
      [
        cleanedAssetId,
        JSON.stringify(moved.map((m) => m.segmentId)),
        moved.length > 0 ? 'ready' : 'cleaned',
        letterId,
      ]
    );
  });

  return {
    cleanedFullUri: cleanedFile.uri,
    segments: moved.map(({ seg, cropFile }) => ({
      index: seg.index,
      granularity: seg.granularity,
      uri: cropFile.uri,
    })),
  };
}

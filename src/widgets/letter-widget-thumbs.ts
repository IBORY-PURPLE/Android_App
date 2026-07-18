import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * 앱 ↔ 위젯 썸네일 공유 저장소 (TSD.md 1.4 / 5.4).
 *
 * 위젯은 원본 고해상도를 로드하지 않는다(위젯 메모리 예산 — TSD.md 5.4).
 * 앱이 위젯 표시 크기로 다운스케일한 썸네일을 문서 폴더 widget-thumbs/ 에 만들어 두고,
 * 위젯 태스크 핸들러는 이 폴더의 파일 목록에서 랜덤 1개를 file:// 경로로 읽는다
 * (같은 앱 패키지 = 같은 내부 저장소 — 안드로이드에는 App Group이 필요 없다).
 *
 * 풀 구성(TSD.md 5.2 "전체 문장 풀 = 스캔해 확정한 모든 조각" — DECISIONS_NEEDED 13):
 * - 편지 저장 시: 통짜 썸네일 `<letterId>.jpg` (조각 확정 전의 근사 — 원칙 3 재발견).
 * - 세그멘테이션 확정 시: 그 편지의 풀 엔트리를 확정 줄 조각 썸네일
 *   `<letterId>__<granularity>-<idx>.jpg` 들로 교체 (통짜 썸네일은 제거 —
 *   위젯이 "편지 통째"가 아니라 "확정된 문장 조각"을 보여주는 순간, 기획서 결정 4).
 * - ★통짜 후퇴(조각 0개) 확정 시: 조각 썸네일을 지우고 cleanedFull로 통짜 썸네일 재생성.
 * 파일 이름의 `__` 앞부분이 letterId(UUID — `__`를 포함하지 않는다) → 위젯 탭 딥링크는
 * 여전히 "그 조각이 속한 편지 상세"(TSD.md 5.5)로 간다.
 *
 * 이 모듈은 순수 Expo API(expo-file-system·expo-image-manipulator)만 쓴다 —
 * Expo Go에서도 동작하므로 조건부 로드가 필요 없다.
 *
 * SDK 57 확인 (공식 문서 + 설치본 타입 정의):
 * - expo-image-manipulator(https://docs.expo.dev/versions/v57.0.0/sdk/imagemanipulator/):
 *   `ImageManipulator.manipulate(source)` → 컨텍스트, `.resize({ width })`(한 값만 주면
 *   비율 유지), `.renderAsync()` → ImageRef(width/height 보유),
 *   `ImageRef.saveAsync({ format, compress })` → 캐시 디렉터리에 저장된 { uri, ... }.
 *   레거시 manipulateAsync는 deprecated — 쓰지 않는다.
 * - expo-file-system: `Directory.list(): (Directory | File)[]`, `File.move(dest): Promise<void>`,
 *   `File.delete(): void`, `.exists: boolean`, `File.textSync(): string`(동기 읽기),
 *   `File.write(content: string): void`(동기 쓰기 — 파일이 없으면 만들어 줌을
 *   네이티브 소스 FileSystemFile.kt `write`의 `if (!exists) create()` 분기로 실측)
 *   (build/internal/NativeFileSystem.types.d.ts).
 */

// 위젯 3×2 셀(minWidth 180dp)이 고밀도 화면(~3x)에서 ~540px — 여유분 포함 720px면 충분하다.
// 원본 대신 이것만 위젯이 로드한다. 실기 확인 후 재조정 가능(DECISIONS_NEEDED 4).
const THUMB_MAX_WIDTH_PX = 720;
const THUMBS_DIR_NAME = 'widget-thumbs';

function thumbsDir(): Directory {
  return new Directory(Paths.document, THUMBS_DIR_NAME);
}

// 다운스케일 썸네일 1개를 풀 파일로 굳힌다. 원본이 이미 작으면 리사이즈 없이 저장만
// 한다(손글씨 업스케일 금지 — 원칙 1).
async function writeThumbFile(sourceImageUri: string, fileName: string): Promise<void> {
  const loaded = await ImageManipulator.manipulate(sourceImageUri).renderAsync();
  const finalRef =
    loaded.width > THUMB_MAX_WIDTH_PX
      ? await ImageManipulator.manipulate(loaded)
          .resize({ width: THUMB_MAX_WIDTH_PX })
          .renderAsync()
      : loaded;
  // saveAsync는 캐시 디렉터리에 저장한다 — 캐시는 시스템이 비울 수 있으므로 문서 폴더로 옮긴다.
  const saved = await finalRef.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });

  const dir = thumbsDir();
  dir.create({ intermediates: true, idempotent: true });
  const dest = new File(dir, fileName);
  if (dest.exists) dest.delete(); // 같은 이름 재생성 시 교체
  await new File(saved.uri).move(dest);
}

/** 편지 저장 시점에 위젯용 통짜 썸네일을 만든다 (조각 확정 전의 풀 엔트리). */
export async function createLetterWidgetThumbnail(
  letterId: string,
  sourceImageUri: string
): Promise<void> {
  await writeThumbFile(sourceImageUri, `${letterId}.jpg`);
}

/**
 * 한 편지의 풀 엔트리 전부(통짜 `<letterId>.jpg` + 조각 `<letterId>__*.jpg`)를 지운다.
 * 편지 삭제 시(지운 편지가 위젯에 남지 않게), 그리고 확정 시 교체의 앞 단계로 쓴다.
 */
export function deleteLetterWidgetThumbnails(letterId: string): void {
  const dir = thumbsDir();
  if (!dir.exists) return;
  for (const entry of dir.list()) {
    if (!(entry instanceof File)) continue;
    const baseName = entry.name.replace(/\.jpg$/, '');
    if (baseName === letterId || baseName.startsWith(`${letterId}__`)) entry.delete();
  }
}

/** persistSegmentationResult가 돌려주는 영구화 조각 — 위젯 썸네일의 원천. */
export type PersistedSegmentThumbSource = {
  index: number;
  granularity: string;
  /** 문서 폴더 segments/<letterId>/ 에 영구화된 크롭 파일의 file:// 경로 */
  uri: string;
};

/**
 * 세그멘테이션 확정 직후 위젯 풀을 그 편지의 확정 산출물로 맞춘다 (파일 머리 주석의
 * 풀 구성 규칙 — TSD.md 5.2, DECISIONS_NEEDED 13).
 * - 조각 1개 이상: 통짜 썸네일 제거 + 조각별 썸네일 생성 (풀 = 확정 조각).
 * - 조각 0개(★통짜 후퇴): 조각 썸네일 제거 + cleanedFull로 통짜 썸네일 재생성
 *   (재확정으로 조각 엔트리가 사라져도 편지가 풀에서 빠지지 않게).
 * 실패해도 확정 자체는 유효하다 — 호출자가 try/catch로 감싼다(다음 확정 때 다시 맞춰짐).
 */
export async function syncLetterWidgetThumbnailsAfterSegmentation(
  letterId: string,
  cleanedFullUri: string,
  segments: PersistedSegmentThumbSource[]
): Promise<void> {
  deleteLetterWidgetThumbnails(letterId); // 재확정 = 통째 교체 (segmentation-store와 같은 시맨틱)
  if (segments.length > 0) {
    for (const seg of segments) {
      await writeThumbFile(seg.uri, `${letterId}__${seg.granularity}-${seg.index}.jpg`);
    }
  } else {
    await writeThumbFile(cleanedFullUri, `${letterId}.jpg`);
  }
}

/** 위젯이 표시할 썸네일 1개 — 파일 경로와, 파일 이름에 담긴 편지 id(딥링크용). */
export type LetterWidgetThumbnail = {
  /** file:// 경로 */
  uri: string;
  /**
   * 이 썸네일이 속한 편지의 id — 위젯 탭 딥링크(TSD.md 5.5 "그 조각이 속한 편지
   * 상세")에 쓴다. 통짜 `<letterId>.jpg`든 조각 `<letterId>__…jpg`든 `__` 앞이 편지 id.
   */
  letterId: string;
  /** 풀 엔트리 키(파일 이름에서 .jpg 뺀 것) — 최근 표시 이력은 조각 단위(TSD.md 5.2). */
  poolKey: string;
};

/** 위젯이 표시할 썸네일 후보 전체 — 파일 목록이 곧 표시 풀이다(TSD.md 1.4). */
export function listLetterWidgetThumbnails(): LetterWidgetThumbnail[] {
  const dir = thumbsDir();
  if (!dir.exists) return [];
  return dir
    .list()
    .filter((entry): entry is File => entry instanceof File)
    .map((file) => {
      const poolKey = file.name.replace(/\.jpg$/, '');
      return {
        uri: file.uri,
        letterId: poolKey.split('__')[0],
        poolKey,
      };
    });
}

// ── 최근 표시 이력 (TSD.md 5.2 "최근 K개 제외 + 균등 랜덤") ──────────────────
//
// ★로컬 전용·동기화 금지(TSD.md 5.2): 이 이력은 순수하게 랜덤 품질 개선용이다.
// 절대 클라우드에 올리거나 상대에게 동기화하지 않는다 — 새어나가는 순간
// '읽음 확인'이 되어 원칙 4(관찰하지 않는다)를 위반한다.
//
// K=3 채택(자율) — 30분 갱신 기준 같은 편지가 ~2시간 안에 다시 안 뜨는 정도.
// 풀이 작으면 min(K, 풀 크기 - 1)로 자동 축소(TSD.md 5.3 — 편지 1~2장의 반복은
// 결함이 아니라 의도된 반복). 상수 하나라 실기 확인 후 재조정 쉽다.
const RECENT_EXCLUDE_K = 3;
const RECENT_HISTORY_FILE_NAME = 'widget-recent-letters.json';

// 주의: widget-thumbs/ 폴더 안에 두면 파일 목록(= 표시 풀)에 섞이므로 문서 폴더 루트에 둔다.
function recentHistoryFile(): File {
  return new File(Paths.document, RECENT_HISTORY_FILE_NAME);
}

/**
 * 최근 표시한 풀 엔트리 키 목록(최신이 앞). 파일이 없거나 깨졌으면 빈 목록.
 * TSD.md 5.2 "직전 표시 조각의 즉시 재노출만 막는다" — 조각 풀 편입 후 이력도
 * 편지 단위가 아니라 풀 엔트리(조각) 단위다. 이전 이력(letterId만 기록)은 통짜
 * 엔트리 키와 같아서 그대로 호환되고, 조각으로 교체된 편지의 옛 키는 풀에 없어
 * 자연히 걸러진다.
 */
function readRecentPoolKeys(): string[] {
  try {
    const file = recentHistoryFile();
    if (!file.exists) return [];
    const parsed: unknown = JSON.parse(file.textSync());
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    // 이력이 깨져도 위젯 표시는 계속돼야 한다 — 이력 없음으로 취급.
    return [];
  }
}

/**
 * 랜덤 썸네일 1개 — 기획서 결정 4(볼 때마다 랜덤)·2.5 표시 로직.
 * 편지 0장이면 null(→ 온보딩 카드, 기획서 2.5 빈 상태 규칙).
 *
 * TSD.md 5.2 "최근 K개 제외 + 균등 랜덤": 직전 표시 편지의 즉시 재노출을 막는다.
 * 뽑은 결과는 최근 표시 이력 파일에 기록한다(위 로컬 전용 계약 참조).
 */
export function pickRandomLetterWidgetThumbnail(): LetterWidgetThumbnail | null {
  const thumbs = listLetterWidgetThumbnails();
  if (thumbs.length === 0) return null;

  // 이력에서 지운 편지·교체된 조각 등 풀에 없는 키를 걸러낸 뒤, 풀 크기에 맞춰 K를 줄인다.
  const poolKeys = new Set(thumbs.map((thumb) => thumb.poolKey));
  const recentKeys = readRecentPoolKeys().filter((key) => poolKeys.has(key));
  const effectiveK = Math.min(RECENT_EXCLUDE_K, thumbs.length - 1);
  const excluded = new Set(recentKeys.slice(0, effectiveK));

  // excluded ⊆ 풀이고 크기 ≤ 풀 크기 - 1 이므로 후보는 항상 1개 이상 남는다.
  const candidates = thumbs.filter((thumb) => !excluded.has(thumb.poolKey));
  const picked = candidates[Math.floor(Math.random() * candidates.length)];

  try {
    const nextRecent = [
      picked.poolKey,
      ...recentKeys.filter((key) => key !== picked.poolKey),
    ].slice(0, RECENT_EXCLUDE_K);
    recentHistoryFile().write(JSON.stringify(nextRecent));
  } catch {
    // 이력 기록 실패는 표시를 막지 않는다 — 다음 갱신에서 다시 시도된다.
  }

  return picked;
}

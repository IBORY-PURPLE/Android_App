import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * 앱 ↔ 위젯 썸네일 공유 저장소 (TSD.md 1.4 / 5.4).
 *
 * 위젯은 원본 고해상도를 로드하지 않는다(위젯 메모리 예산 — TSD.md 5.4).
 * 앱이 편지 저장 시점에 위젯 표시 크기로 다운스케일한 썸네일을
 * 문서 폴더 widget-thumbs/<letterId>.jpg 로 만들어 두고,
 * 위젯 태스크 핸들러는 이 폴더의 파일 목록에서 랜덤 1개를 file:// 경로로 읽는다
 * (같은 앱 패키지 = 같은 내부 저장소 — 안드로이드에는 App Group이 필요 없다).
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
 *   `File.delete(): void`, `.exists: boolean` (build/internal/NativeFileSystem.types.d.ts).
 */

// 위젯 3×2 셀(minWidth 180dp)이 고밀도 화면(~3x)에서 ~540px — 여유분 포함 720px면 충분하다.
// 원본 대신 이것만 위젯이 로드한다. 실기 확인 후 재조정 가능(DECISIONS_NEEDED 4).
const THUMB_MAX_WIDTH_PX = 720;
const THUMBS_DIR_NAME = 'widget-thumbs';

function thumbsDir(): Directory {
  return new Directory(Paths.document, THUMBS_DIR_NAME);
}

/**
 * 편지 저장 시점에 위젯용 다운스케일 썸네일을 만든다.
 * 원본이 이미 작으면 리사이즈 없이 저장만 한다(손글씨 업스케일 금지 — 원칙 1).
 */
export async function createLetterWidgetThumbnail(
  letterId: string,
  sourceImageUri: string
): Promise<void> {
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
  const dest = new File(dir, `${letterId}.jpg`);
  if (dest.exists) dest.delete(); // 같은 편지 재생성 시 교체
  await new File(saved.uri).move(dest);
}

/** 편지 삭제 시 위젯 썸네일도 함께 지운다(지운 편지가 위젯에 남지 않게). */
export function deleteLetterWidgetThumbnail(letterId: string): void {
  const file = new File(thumbsDir(), `${letterId}.jpg`);
  if (file.exists) file.delete();
}

/** 위젯이 표시할 썸네일 후보 전체 (file:// 경로 목록). */
export function listLetterWidgetThumbnailUris(): string[] {
  const dir = thumbsDir();
  if (!dir.exists) return [];
  return dir
    .list()
    .filter((entry): entry is File => entry instanceof File)
    .map((file) => file.uri);
}

/**
 * 랜덤 썸네일 1개 — 기획서 결정 4(볼 때마다 랜덤)·2.5 표시 로직.
 * 지금은 균등 랜덤. 편지 0장이면 null(→ 온보딩 카드, 기획서 2.5 빈 상태 규칙).
 *
 * TODO(다음 증분, TSD.md 5.2): "직전 표시 즉시 재노출 방지(최근 K개 제외)" —
 * 최근 표시 이력을 로컬 키-값 저장소에 남겨야 한다. 이 이력은 로컬 전용·동기화 금지
 * (새어나가면 읽음 확인이 된다 — 원칙 4 '관찰하지 않는다').
 */
export function pickRandomLetterWidgetThumbnailUri(): string | null {
  const uris = listLetterWidgetThumbnailUris();
  if (uris.length === 0) return null;
  return uris[Math.floor(Math.random() * uris.length)];
}

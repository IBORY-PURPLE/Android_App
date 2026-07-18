/**
 * 세그멘테이션 인터페이스 뼈대 — 2단계(OpenCV) 스캐폴드. ★타입·시그니처만.
 *
 * 실제 구현은 여기 없다. 이유: 이진화 blockSize·C, dilate 커널 같은 파라미터는
 * 실물 손편지 20~30장으로 0단계(Windows Python) 검증을 돌려야 확정된다
 * (TSD.md 4.3, DECISIONS_NEEDED.md 1 ★차단). 확정값이 나오면 이 시그니처 뒤에
 * react-native-fast-opencv(네이티브 개발 빌드 필요 — Expo Go 밖)로 구현을 채운다.
 *
 * TODO(2단계 구현 — TSD.md 4.1 파이프라인 단계 그대로):
 *   1. cvtColor            컬러 → 그레이스케일
 *   2. adaptiveThreshold   적응형 이진화 (종이 배경·그림자·조명 불균일을 여기서 흡수
 *                          — 별도 배경 제거 단계 없음, TSD.md 4.2) → cleanedFull 이미지
 *   3. 수평 투영 프로파일 + 수평 dilate → findContours → boundingRect  줄 경계 상자
 *   4. 경계 상자 크롭      줄 조각 이미지 (granularity='line')
 *   5. (선택) 문장 승격    기하 규칙만으로 줄 조각 병합 (OCR 없음 — 결정 2)
 *   6. 다운스케일 저장     위젯 표시 크기 썸네일 (widgetThumb)
 *   메모리: 각 단계 후 clearBuffers 수동 해제 (TSD.md 4.4 — 자동 해제 안 됨)
 *
 * 산출물 사용처: 결과를 segment·asset 테이블(src/db.ts에 2단계에서 추가)에 저장하고,
 * 보기 모드 '한 줄씩'/'한 문장씩'(LetterDetailScreen)이 조각 이미지를 그린다 (TSD.md 4.6).
 */

// TSD.md 6.3 segment.granularity — line(줄) | sentence(문장)
export type SegmentGranularity = 'line' | 'sentence';

// TSD.md 6.3 segment.bbox — 원본 이미지 기준 0~1 정규화 좌표 (재크롭·수동 보정 UI용)
export type NormalizedBoundingBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

// 편지 1통에서 나온 손글씨 조각 1개 — segment 행 + asset(kind='segmentCrop')의 재료
export type SegmentCandidate = {
  index: number; // 편지 내 순서 → segment.idx
  granularity: SegmentGranularity;
  cropUri: string; // 크롭 이미지 파일 경로 → asset(kind='segmentCrop').local_path
  boundingBox: NormalizedBoundingBox; // → segment.bbox
  aspectRatio: number; // 크롭 가로/세로 → segment.aspect_ratio (위젯 레이아웃 사전계산용)
};

// 파이프라인 전체 산출물 (TSD.md 4.1 표).
// segments가 빈 배열이면 조각 검출 실패 — 수동 보정 UI(TSD.md 4.5) 또는
// '통짜 후퇴'(cleanedFull만 저장, '통째로' 모드 전용)로 이어진다.
export type SegmentationResult = {
  cleanedFullUri: string; // 이진화 전체 이미지 → asset(kind='cleanedFull'), '통째로' 보기의 실체
  segments: SegmentCandidate[];
};

/**
 * 편지 원본 이미지 1장을 손글씨 조각으로 나눈다. ★아직 미구현 (2단계).
 *
 * @param originalImageUri asset(kind='originalScan').local_path — 저장된 원본 스캔 파일 경로
 */
export async function segmentLetterImage(originalImageUri: string): Promise<SegmentationResult> {
  // TODO(2단계): 위 파이프라인을 react-native-fast-opencv로 구현.
  // 0단계 파라미터 확정 전까지는 호출하지 않는다 (호출부도 아직 없음).
  throw new Error(
    `세그멘테이션은 아직 준비 중이에요 (0단계 파라미터 확정 후 2단계에서 구현): ${originalImageUri}`
  );
}

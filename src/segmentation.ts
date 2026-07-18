/**
 * 세그멘테이션 — 2단계(OpenCV) 기본 구현. TSD.md 4.1 파이프라인 단계 그대로.
 *
 * ★파라미터는 임시 초기값이다(아래 상수). 이진화 blockSize·C, dilate 커널 같은
 * 값은 실물 손편지 20~30장으로 0단계(Windows Python) 검증을 돌려야 확정된다
 * (TSD.md 4.3, DECISIONS_NEEDED.md 1 ★차단). 확정값이 나오면 상수만 교체한다.
 * 실물 사진 튜닝은 이 루프에서 하지 않는다.
 *
 * ★실행 환경: react-native-fast-opencv는 네이티브(JSI) 모듈이라 개발 빌드
 * (`npx expo run:android`)에서만 동작한다. Expo Go에는 바인딩이 없고 모듈 로드
 * 시점(top-level)에 `global.__loadOpenCV()` 실행이 throw한다(설치본 src/index.tsx
 * 실측) — 그래서 정적 import 대신 호출 시점 지연 require로 분리했다
 * (index.ts의 react-native-android-widget과 같은 패턴). 이 파일을 import하는 것
 * 자체는 Expo Go에서 안전하다.
 *
 * 파이프라인 (TSD.md 4.1 표 — 함수 이름이 곧 OpenCV API 이름):
 *   1. 획득               호출 전에 끝나 있다 — originalImageUri가 그 결과
 *   2. cvtColor           컬러 → 그레이스케일
 *   3. adaptiveThreshold  적응형 이진화 (종이 배경·그림자·조명 불균일을 여기서 흡수
 *                         — 별도 배경 제거 단계 없음, TSD.md 4.2) → cleanedFull
 *   4. 수평 dilate → findContours → boundingRect  줄 경계 상자
 *      (투영 프로파일 보조 분리는 0단계 결과를 보고 추가 — TODO(0단계))
 *   5. crop               경계 상자로 줄 조각 추출 (granularity='line')
 *   6. TODO(0단계 종속)   문장 승격 — 기하 규칙만으로 줄 조각 병합 (OCR 없음 — 결정 2)
 *   7. TODO(다음 증분)    위젯 표시 크기 다운스케일 저장 — 보정 UI(TSD.md 4.5) 확정
 *                         시점에 letter-widget-thumbs와 연결
 *   메모리: 전 단계 clearBuffers 수동 해제 (TSD.md 4.4 — 자동 해제 안 됨)
 *
 * 산출물 사용처: 결과를 segment·asset 테이블(src/db.ts에 2단계에서 추가)에 저장하고,
 * 보기 모드 '한 줄씩'/'한 문장씩'(LetterDetailScreen)이 조각 이미지를 그린다 (TSD.md 4.6).
 *
 * 사용 API 실측 (설치본 react-native-fast-opencv 0.4.8):
 * - OpenCV.base64ToMat: cpp/ConvertImage.cpp — imdecode(IMREAD_UNCHANGED).
 *   JPEG는 BGR 3채널, 알파 있는 PNG는 BGRA 4채널 → 채널 수에 맞춰 cvtColor 코드 선택.
 * - OpenCV.matToBuffer: 이 라이브러리에서 Mat 크기(rows/cols/channels)를 읽는
 *   문서화된 방법은 이것(버퍼 복사)과 toJSValue(base64 인코딩)뿐 — 가벼운 전자를 쓴다.
 * - OpenCV.saveMatToFile: cpp/react-native-fast-opencv.cpp — 경로의 `file://` 접두사를
 *   네이티브가 벗겨주므로 expo-file-system의 File.uri를 그대로 넘겨도 된다.
 * - invoke 시그니처(cvtColor/adaptiveThreshold/getStructuringElement/dilate/
 *   findContours/boundingRect/crop/bitwise_not)는 설치본 src/functions/* 타입 정의로 확인.
 */
import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

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
  // 원본(=cleanedFull) 픽셀 크기 — 정규화 bbox를 픽셀 사각형으로 되돌릴 때 쓴다.
  // 보정 액션(TSD.md 4.5)의 재크롭(합치기 등)이 소비자. DB에는 저장하지 않는다(메모리 전용).
  imageWidth: number;
  imageHeight: number;
};

// ── 파이프라인 파라미터 — ★전부 임시 초기값 (0단계 확정 전, TSD.md 4.3) ──────────
// 지금 값은 합성 테스트 이미지 스모크용 자리값이다. 0단계(실물 20~30장, Python)에서
// 확정한 값으로 이 상수들만 교체한다. 여기서 실물 튜닝 금지(DECISIONS_NEEDED 1 ★차단).
const ADAPTIVE_BLOCK_SIZE = 31; // 홀수 필수 — 픽셀 주변 밝기를 보는 창. 글줄 높이보다 큰 편이 안전
const ADAPTIVE_C = 15; // 가중 평균에서 빼는 상수 — 클수록 옅은 얼룩·종이 질감을 배경으로 넘김
const DILATE_KERNEL_WIDTH = 25; // 수평 팽창 커널 — 글자를 가로로 이어 붙여 한 줄 덩어리로
const DILATE_KERNEL_HEIGHT = 3;
const DILATE_ITERATIONS = 1;
const MIN_LINE_HEIGHT_RATIO = 0.01; // 이미지 높이 대비 이보다 낮은 상자는 노이즈로 버림
const MIN_LINE_WIDTH_RATIO = 0.05; // 이미지 너비 대비 이보다 좁은 상자는 노이즈로 버림
// 산출물 JPEG 품질 (saveMatToFile compression: 0~1, 1=고품질).
// export 이유: 보정 액션의 재크롭(SegmentationReviewPanel 합치기)이 같은 품질로 저장해
// 자동 검출 조각과 병합 조각의 화질이 갈라지지 않게 한다.
export const OUTPUT_JPEG_QUALITY = 0.9;

const SEGMENTATION_OUT_DIR_NAME = 'segmentation';

type FastOpenCV = typeof import('react-native-fast-opencv');

// Expo Go 안전장치의 핵심 — 반드시 호출 시점에만 로드한다 (파일 머리 주석 참조).
function loadFastOpenCV(): FastOpenCV {
  return require('react-native-fast-opencv') as FastOpenCV;
}

/**
 * 편지 원본 이미지 1장을 손글씨 줄 조각으로 나눈다.
 *
 * 산출물 파일은 캐시 아래 `segmentation/<임의 id>/`에 담긴다 — 아직 '후보'라서다.
 * 수동 보정 UI(TSD.md 4.5)에서 확정되는 시점에 문서 폴더로 옮겨 asset 행과 함께
 * 영구화한다(다음 증분). 캐시는 시스템이 지울 수 있으므로 확정 전 후보 전용이다.
 *
 * @param originalImageUri asset(kind='originalScan').local_path — 저장된 원본 스캔 파일 경로
 * @throws Expo Go 등 네이티브 모듈이 없는 환경이면 안내 메시지와 함께 throw.
 */
export async function segmentLetterImage(originalImageUri: string): Promise<SegmentationResult> {
  let cv: FastOpenCV;
  try {
    cv = loadFastOpenCV();
  } catch {
    throw new Error(
      '세그멘테이션은 개발 빌드에서만 동작해요 — Expo Go에는 OpenCV 네이티브 모듈이 없어요.'
    );
  }
  const {
    OpenCV,
    ObjectType,
    DataTypes,
    ColorConversionCodes,
    AdaptiveThresholdTypes,
    ThresholdTypes,
    MorphShapes,
    BorderTypes,
    RetrievalModes,
    ContourApproximationModes,
  } = cv;
  // OpenCV 함수의 출력 Mat은 빈 Mat으로 만들어 넘기면 네이티브가 크기를 맞춘다
  // (공식 문서 blur 예제의 createObject(ObjectType.Mat, 0, 0, CV_8U) 관용구).
  const newEmptyMat = () => OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_8U);

  // SDK 57 File.base64(): Promise<string> — 설치본 타입 실측 (NativeFileSystem.types.d.ts)
  const base64 = await new File(originalImageUri).base64();

  const outDir = new Directory(Paths.cache, SEGMENTATION_OUT_DIR_NAME, Crypto.randomUUID());
  outDir.create({ intermediates: true, idempotent: true });

  try {
    const src = OpenCV.base64ToMat(base64);

    // 원본 크기·채널. 주의: 전체 픽셀 버퍼가 한 번 JS로 복사된다(일시적) —
    // 처리 해상도 상한을 둘지는 0단계에서 파라미터와 함께 확정한다.
    const {
      rows: imageHeight,
      cols: imageWidth,
      channels,
    } = OpenCV.matToBuffer(src, 'uint8');

    // 2. 그레이스케일 — 디코드 결과 채널 수에 맞춘다 (이미 1채널이면 그대로).
    let gray = src;
    if (channels === 3 || channels === 4) {
      gray = newEmptyMat();
      OpenCV.invoke(
        'cvtColor',
        src,
        gray,
        channels === 4
          ? ColorConversionCodes.COLOR_BGRA2GRAY
          : ColorConversionCodes.COLOR_BGR2GRAY
      );
    }

    // 3. 적응형 이진화 — 검출용은 글씨가 ON 픽셀이어야 하므로 THRESH_BINARY_INV.
    //    표시용 cleanedFull(흰 종이에 검은 글씨)은 그 반전(bitwise_not)으로 얻는다.
    const inkMask = newEmptyMat();
    OpenCV.invoke(
      'adaptiveThreshold',
      gray,
      inkMask,
      255,
      AdaptiveThresholdTypes.ADAPTIVE_THRESH_GAUSSIAN_C,
      ThresholdTypes.THRESH_BINARY_INV,
      ADAPTIVE_BLOCK_SIZE,
      ADAPTIVE_C
    );
    const cleanedFull = newEmptyMat();
    OpenCV.invoke('bitwise_not', inkMask, cleanedFull);

    // 4. 줄 검출 — 수평 dilate로 글자를 이어 붙인 덩어리의 외곽선 → 경계 상자.
    const kernel = OpenCV.invoke(
      'getStructuringElement',
      MorphShapes.MORPH_RECT,
      OpenCV.createObject(ObjectType.Size, DILATE_KERNEL_WIDTH, DILATE_KERNEL_HEIGHT)
    );
    const dilated = newEmptyMat();
    OpenCV.invoke(
      'dilate',
      inkMask,
      dilated,
      kernel,
      OpenCV.createObject(ObjectType.Point, -1, -1), // (-1,-1) = 커널 중심
      DILATE_ITERATIONS,
      BorderTypes.BORDER_CONSTANT,
      OpenCV.createObject(ObjectType.Scalar, 0)
    );

    // MatVector를 쓰는 이유: toJSValue(MatVector)는 {size, cols, rows}만 돌려줘
    // 개수 세기가 싸다 (PointVectorOfVectors는 전체 좌표를 직렬화한다).
    const contours = OpenCV.createObject(ObjectType.MatVector);
    OpenCV.invoke(
      'findContours',
      dilated,
      contours,
      RetrievalModes.RETR_EXTERNAL,
      ContourApproximationModes.CHAIN_APPROX_SIMPLE
    );
    const contourCount = OpenCV.toJSValue(contours).array.length;

    const lineBoxes: { x: number; y: number; width: number; height: number }[] = [];
    for (let i = 0; i < contourCount; i++) {
      const contour = OpenCV.copyObjectFromVector(contours, i);
      const box = OpenCV.toJSValue(OpenCV.invoke('boundingRect', contour));
      const isNoise =
        box.height < imageHeight * MIN_LINE_HEIGHT_RATIO ||
        box.width < imageWidth * MIN_LINE_WIDTH_RATIO;
      if (!isNoise) lineBoxes.push(box);
    }
    lineBoxes.sort((a, b) => a.y - b.y); // 편지 위 → 아래 순서 = segment.idx 순서

    // cleanedFull 저장 — '통째로' 보기의 실체 (TSD.md 4.6).
    const cleanedFullFile = new File(outDir, 'cleaned-full.jpg');
    OpenCV.saveMatToFile(cleanedFull, cleanedFullFile.uri, 'jpeg', OUTPUT_JPEG_QUALITY);

    // 5. 크롭 — 조각도 이진화(cleanedFull)에서 잘라낸다: 보기 모드가 그리는 그 그림이다.
    const segments: SegmentCandidate[] = lineBoxes.map((box, index) => {
      const roi = OpenCV.createObject(ObjectType.Rect, box.x, box.y, box.width, box.height);
      const cropMat = newEmptyMat();
      OpenCV.invoke('crop', cleanedFull, cropMat, roi);
      const cropFile = new File(outDir, `line-${index}.jpg`);
      OpenCV.saveMatToFile(cropMat, cropFile.uri, 'jpeg', OUTPUT_JPEG_QUALITY);
      return {
        index,
        granularity: 'line' as const,
        cropUri: cropFile.uri,
        boundingBox: {
          x: box.x / imageWidth,
          y: box.y / imageHeight,
          w: box.width / imageWidth,
          h: box.height / imageHeight,
        },
        aspectRatio: box.width / box.height,
      };
    });

    // 6(문장 승격)·7(위젯 썸네일 다운스케일)은 파일 머리 주석의 TODO 참조.
    return { cleanedFullUri: cleanedFullFile.uri, segments, imageWidth, imageHeight };
  } finally {
    // TSD.md 4.4 — Mat 등 네이티브 버퍼는 자동 해제되지 않는다. 성공·실패 모두 정리.
    OpenCV.clearBuffers();
  }
}

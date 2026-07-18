import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  OUTPUT_JPEG_QUALITY,
  segmentLetterImage,
  type SegmentCandidate,
  type SegmentationResult,
} from '../segmentation';
import { persistSegmentationResult } from '../segmentation-store';
import { syncLetterWidgetThumbnailsAfterSegmentation } from '../widgets/letter-widget-thumbs';
import { updateLetterWidgetSafe } from '../widgets/update-letter-widget';

/**
 * 세그멘테이션 보정 UI 1보 — 실행 → 후보 목록 → 확정 / ★통짜 후퇴 (TSD.md 4.5, 기획서 2.6).
 *
 * 이번 걸음까지의 범위: 자동 검출(segmentLetterImage) 결과를 줄 조각 후보 목록으로
 * 보여주고, 확정(persistSegmentationResult)하거나 ★통짜 후퇴("이 편지는 통째로만
 * 저장" — 기획서 2.6 탈출구, 상시 개방·원탭)로 빠져나간다. 보정 액션(TSD.md 4.5) 중
 * 구현된 것:
 * - **④ 삭제** — 후보별 "빼기" 토글(되살리기 가능 — 실수 복구, 강요 금지 톤).
 *   뺀 조각은 확정에서 제외된다.
 * - **① 합치기** — "위와 합치기"로 잘못 쪼개진 인접 조각을 병합: 두 bbox의 합집합을
 *   cleanedFull에서 재크롭(expo-image-manipulator)해 한 조각으로 만든다. 실수 복구는
 *   "자동 검출로 되돌리기"(빼기·합치기·순서 전부 초기화 — 병합별 되돌리기 스택은 과설계,
 *   DECISIONS_NEEDED 15).
 * - **⑤ 순서 지정** — 행별 ▲/▼로 노출 순서 재정렬(배열 이웃 교환 — 순수 JS, 재크롭 없음).
 *   확정 시 배열 순서가 그대로 letter.segment_order가 된다(persistSegmentationResult가
 *   받은 순서대로 기록 — 항목 11 계약의 실사용: LineSegmentsView가 이 순서로 그린다).
 * - **② 나누기** — 하나로 붙어 검출된 조각을 위/아래 둘로 분리: 조각 이미지를 탭해
 *   가로 분할선 위치를 정하고(드래그·슬라이더 아님 — RN 코어에 Slider가 없어 새 의존성이
 *   필요했다, DECISIONS_NEEDED 18) "여기서 나누기"로 확정하면 cleanedFull에서 두 사각형을
 *   재크롭한다(합치기와 같은 expo-image-manipulator 경로). 위 조각은 원래 번호를 물려받고
 *   아래 조각은 새 번호(최대값+1)를 받는다 — 확정 파일명(line-<idx>.jpg)·행 key의 유일성.
 * 완료 조건은 2.6 그대로 — 유효 조각 1개 이상 또는 통짜 저장(전부 빼면 통짜만 가능).
 * 확정 시 확정 조각이 위젯 풀에 편입되고 위젯이 즉시 갱신된다(TSD.md 5.1·5.2 —
 * 기획서 결정 4 '볼 때마다 랜덤'의 풀이 통째 썸네일에서 확정 조각으로 바뀐다).
 *
 * 다음 걸음 (TODO — TSD.md 4.5 보정 액션): 박스 조절(5종 중 마지막),
 * 그리고 목록 대신 이진화 이미지 위 번호 박스 오버레이 표시. 지금은 목록 형태다.
 *
 * 실행 환경: segmentLetterImage는 개발 빌드 전용(OpenCV 네이티브 모듈) —
 * Expo Go에서는 호출 즉시 안내 메시지와 함께 throw하므로 그 메시지를 그대로
 * 보여주는 것이 우아한 후퇴다(앱 본체는 계속 돈다).
 *
 * 확정 전에 화면을 떠나면 후보 파일은 캐시(segmentation/<임의 id>/)에 남는다 —
 * 캐시는 시스템이 지우므로 따로 정리하지 않는다(TSD.md 6.4, DECISIONS_NEEDED 8).
 */

type Props = {
  letterId: string;
  originalImagePath: string; // asset(kind='originalScan').local_path — 저장된 원본 스캔
  processingStatus: string; // letter.processing_status — raw|cleaned|segmented|ready (TSD.md 6.3)
  onPersisted: () => void; // 확정 후 부모(LetterDetailScreen)가 letter 행을 다시 읽게 한다
};

type Phase =
  | { name: 'idle' }
  | { name: 'running' }
  // candidates: 보정 작업본 — 합치기·순서 지정이 이 배열을 바꾼다. 배열 순서 = 표시 순서 =
  //   확정 시 segment_order(받은 순서 그대로 기록된다). result.segments는 자동 검출
  //   원본 그대로 남아 "자동 검출로 되돌리기"의 복귀 지점이 된다.
  // excluded: "빼기"(삭제 액션)로 제외한 후보의 index 집합 — 확정 시 이 조각들은 빠진다.
  //   남는 조각의 index는 재번호하지 않는다: idx는 순서 용도뿐이라 갭이 무해하고,
  //   bbox·파일명 대응이 그대로 유지된다 (DECISIONS_NEEDED 12). 합친 조각은 위쪽
  //   조각의 index를 물려받는다 — 같은 이유.
  // busy: 합치기·나누기 재크롭 진행 중 — 그동안 모든 조작 버튼을 잠근다(경쟁 상태 방지).
  // split: 나누기 진행 중인 조각 — index와 분할선 위치(조각 높이 대비 0~1 비율).
  //   null이면 후보 목록, 아니면 분할선 지정 화면을 그린다(취소하면 null 복귀).
  | {
      name: 'review';
      result: SegmentationResult;
      candidates: SegmentCandidate[];
      excluded: ReadonlySet<number>;
      busy: boolean;
      actionError: string | null;
      split: { index: number; fraction: number } | null;
    }
  | { name: 'saving' }
  | { name: 'done'; segmentCount: number }
  | { name: 'error'; message: string };

/**
 * 합치기(TSD.md 4.5 ① — 잘못 쪼개진 인접 조각 병합): 두 후보 bbox의 합집합을
 * cleanedFull에서 재크롭해 한 조각으로 만든다.
 *
 * OpenCV를 다시 로드하지 않는 이유: 합집합 크롭은 순수 사각형 자르기라
 * expo-image-manipulator(이터레이션 12에서 실측한 SDK 57 클래스 API)로 충분하다.
 * 산출물은 saveAsync가 캐시에 저장한다 — 후보는 확정 전까지 캐시가 맞는 자리
 * (확정 시 persistSegmentationResult가 문서 폴더로 옮긴다).
 */
async function mergeCandidates(
  result: SegmentationResult,
  upper: SegmentCandidate,
  lower: SegmentCandidate
): Promise<SegmentCandidate> {
  const { imageWidth, imageHeight } = result;
  const a = upper.boundingBox;
  const b = lower.boundingBox;
  const x0 = Math.min(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  const x1 = Math.max(a.x + a.w, b.x + b.w);
  const y1 = Math.max(a.y + a.h, b.y + b.h);
  // 정규화 → 픽셀: 바깥쪽으로 내림/올림(합집합이 잘리지 않게) 후 이미지 경계로 클램프.
  const px = Math.max(0, Math.floor(x0 * imageWidth));
  const py = Math.max(0, Math.floor(y0 * imageHeight));
  const pw = Math.max(1, Math.min(imageWidth - px, Math.ceil(x1 * imageWidth) - px));
  const ph = Math.max(1, Math.min(imageHeight - py, Math.ceil(y1 * imageHeight) - py));
  const cropped = await ImageManipulator.manipulate(result.cleanedFullUri)
    .crop({ originX: px, originY: py, width: pw, height: ph })
    .renderAsync();
  const saved = await cropped.saveAsync({ format: SaveFormat.JPEG, compress: OUTPUT_JPEG_QUALITY });
  return {
    index: Math.min(upper.index, lower.index), // 위쪽 번호 유지 — 재번호 안 함(DECISIONS 12)
    granularity: upper.granularity, // 지금은 둘 다 'line' — 문장 승격(0단계 종속)과 무관
    cropUri: saved.uri,
    boundingBox: {
      x: px / imageWidth,
      y: py / imageHeight,
      w: pw / imageWidth,
      h: ph / imageHeight,
    },
    aspectRatio: pw / ph,
  };
}

/**
 * 나누기(TSD.md 4.5 ② — 하나로 붙어 검출된 조각을 위/아래 둘로 분리): 조각 bbox를
 * 분할선 비율(fraction — 조각 높이 대비 0~1)에서 수평으로 잘라 두 사각형을
 * cleanedFull에서 재크롭한다. 합치기와 같은 expo-image-manipulator 경로 —
 * OpenCV 재로드 없음, 캐시에 저장(확정 시 문서 폴더로 이동).
 *
 * 번호(index): 위 조각은 원래 번호를 물려받고 아래 조각은 bottomIndex(호출자가
 * 현재 후보 최대값+1로 계산)를 받는다 — 확정 파일명 `line-<idx>.jpg`(segmentation-store)와
 * 후보 행 key·excluded 집합이 index 유일성을 요구해서다(DECISIONS_NEEDED 18).
 */
async function splitCandidate(
  result: SegmentationResult,
  target: SegmentCandidate,
  fraction: number,
  bottomIndex: number
): Promise<[SegmentCandidate, SegmentCandidate]> {
  const { imageWidth, imageHeight } = result;
  const b = target.boundingBox;
  // 정규화 → 픽셀: 합치기와 같은 규칙(바깥쪽 내림/올림 후 이미지 경계 클램프).
  const px = Math.max(0, Math.floor(b.x * imageWidth));
  const py = Math.max(0, Math.floor(b.y * imageHeight));
  const pw = Math.max(1, Math.min(imageWidth - px, Math.ceil((b.x + b.w) * imageWidth) - px));
  const ph = Math.min(imageHeight - py, Math.ceil((b.y + b.h) * imageHeight) - py);
  if (ph < 2) throw new Error('조각이 너무 얇아서 나눌 수 없어요.');
  // 분할선 픽셀 위치 — 위/아래 모두 최소 1px 보장(빈 크롭 방지).
  const topH = Math.min(ph - 1, Math.max(1, Math.round(ph * fraction)));
  const halves: { y: number; h: number; uri: string }[] = [];
  for (const rect of [
    { y: py, h: topH },
    { y: py + topH, h: ph - topH },
  ]) {
    const cropped = await ImageManipulator.manipulate(result.cleanedFullUri)
      .crop({ originX: px, originY: rect.y, width: pw, height: rect.h })
      .renderAsync();
    const saved = await cropped.saveAsync({
      format: SaveFormat.JPEG,
      compress: OUTPUT_JPEG_QUALITY,
    });
    halves.push({ ...rect, uri: saved.uri });
  }
  const toCandidate = (half: (typeof halves)[number], index: number): SegmentCandidate => ({
    index,
    granularity: target.granularity,
    cropUri: half.uri,
    boundingBox: {
      x: px / imageWidth,
      y: half.y / imageHeight,
      w: pw / imageWidth,
      h: half.h / imageHeight,
    },
    aspectRatio: pw / half.h,
  });
  return [toCandidate(halves[0], target.index), toCandidate(halves[1], bottomIndex)];
}

// processing_status(DECISIONS_NEEDED 9 매핑)별 시작 안내 — 재실행은 통째 교체임을 알린다
function idleStatusText(processingStatus: string): string {
  switch (processingStatus) {
    case 'ready':
      return '줄 조각이 이미 확정돼 있어요.\n다시 나누면 이전 조각은 통째로 교체돼요.';
    case 'cleaned':
      return '이 편지는 통째로만 저장하기로 했어요.\n마음이 바뀌면 언제든 다시 나눌 수 있어요.';
    default:
      return '편지를 줄 조각으로 나누면\n위젯과 보기에서 한 줄씩 다시 만날 수 있어요.';
  }
}

export default function SegmentationReviewPanel({
  letterId,
  originalImagePath,
  processingStatus,
  onPersisted,
}: Props) {
  const db = useSQLiteContext();
  const [phase, setPhase] = useState<Phase>({ name: 'idle' });
  // 분할선 지정 화면의 이미지 표시 높이(px) — 탭 위치(locationY)를 0~1 비율로 바꾸는 분모.
  // onLayout으로 갱신되므로 phase 밖 로컬 상태로 충분하다(분할선 화면에서만 읽는다).
  const [splitViewHeight, setSplitViewHeight] = useState(0);

  const runSegmentation = async () => {
    setPhase({ name: 'running' });
    try {
      const result = await segmentLetterImage(originalImagePath);
      setPhase({
        name: 'review',
        result,
        candidates: result.segments,
        excluded: new Set(),
        busy: false,
        actionError: null,
        split: null,
      });
    } catch (e) {
      // Expo Go면 여기로 온다 — segmentLetterImage의 안내 메시지를 그대로 보여준다
      setPhase({ name: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  };

  // "빼기"/"되살리기" 토글 — 삭제 액션(TSD.md 4.5 ④). 원탭 실행취소가 되므로
  // 확인 다이얼로그 없이 즉시 반영한다(빼도 확정 전까지는 아무것도 사라지지 않는다).
  const toggleExcluded = (index: number) => {
    if (phase.name !== 'review' || phase.busy) return;
    const excluded = new Set(phase.excluded);
    if (excluded.has(index)) excluded.delete(index);
    else excluded.add(index);
    setPhase({ ...phase, excluded });
  };

  // "위와 합치기" — 합치기 액션(TSD.md 4.5 ①). 바로 위의 안 뺀 후보와 병합한다.
  // 재크롭이 비동기라 busy로 다른 조작을 잠근다 — 잠금 중엔 captured phase가 최신이다.
  const mergeWithAbove = async (index: number) => {
    if (phase.name !== 'review' || phase.busy) return;
    const { result, candidates, excluded } = phase;
    const pos = candidates.findIndex((c) => c.index === index);
    if (pos < 0 || excluded.has(index)) return;
    let abovePos = -1;
    for (let i = pos - 1; i >= 0; i--) {
      if (!excluded.has(candidates[i].index)) {
        abovePos = i;
        break;
      }
    }
    if (abovePos < 0) return; // 위에 안 뺀 조각이 없다 — 버튼도 안 그려진다(방어)
    setPhase({ ...phase, busy: true, actionError: null });
    try {
      const merged = await mergeCandidates(result, candidates[abovePos], candidates[pos]);
      const next = candidates.slice();
      next[abovePos] = merged;
      next.splice(pos, 1);
      setPhase({ ...phase, candidates: next, busy: false, actionError: null });
    } catch (e) {
      // 실패해도 후보 목록은 그대로 — 검토 작업을 잃지 않는다(에러 화면으로 안 보냄)
      setPhase({
        ...phase,
        busy: false,
        actionError: e instanceof Error ? e.message : String(e),
      });
    }
  };

  // "나누기" — 나누기 액션(TSD.md 4.5 ②)의 진입: 분할선 지정 화면으로 전환.
  // 시작 위치는 조각 높이의 가운데(0.5) — 이미지를 탭해 옮긴다(splitViewTap).
  const beginSplit = (index: number) => {
    if (phase.name !== 'review' || phase.busy) return;
    setPhase({ ...phase, split: { index, fraction: 0.5 }, actionError: null });
  };

  const cancelSplit = () => {
    if (phase.name !== 'review' || phase.busy) return;
    setPhase({ ...phase, split: null });
  };

  // 분할선 확정 — 두 조각으로 재크롭해 원래 자리에 넣는다(위 조각이 원래 index,
  // 아래 조각은 현재 후보 최대값+1 — index 유일성은 splitCandidate 주석 참조).
  const confirmSplit = async () => {
    if (phase.name !== 'review' || phase.busy || phase.split == null) return;
    const { result, candidates, split } = phase;
    const pos = candidates.findIndex((c) => c.index === split.index);
    if (pos < 0) return; // 방어 — 분할선 화면의 조각이 사라졌으면 아무것도 안 한다
    setPhase({ ...phase, busy: true, actionError: null });
    try {
      const bottomIndex = Math.max(...candidates.map((c) => c.index)) + 1;
      const [top, bottom] = await splitCandidate(result, candidates[pos], split.fraction, bottomIndex);
      const next = candidates.slice();
      next.splice(pos, 1, top, bottom); // 원래 자리에 위→아래 순서로 — 표시 순서 유지
      setPhase({ ...phase, candidates: next, busy: false, actionError: null, split: null });
    } catch (e) {
      // 실패해도 후보 목록으로 돌아간다 — 검토 작업을 잃지 않는다(합치기와 같은 태도)
      setPhase({
        ...phase,
        busy: false,
        actionError: e instanceof Error ? e.message : String(e),
        split: null,
      });
    }
  };

  // "▲/▼" — 순서 지정 액션(TSD.md 4.5 ⑤). 배열상 이웃과 자리 교환(순수 JS — 재크롭 없음).
  // 뺀 조각과의 교환도 허용한다 — 뺀 조각은 확정에서 빠지므로 남는 조각끼리의 상대
  // 순서만 결과에 남지만, 화면 위치는 그대로 움직여 보인다(직관 우선).
  const moveCandidate = (index: number, delta: -1 | 1) => {
    if (phase.name !== 'review' || phase.busy) return;
    const { candidates } = phase;
    const pos = candidates.findIndex((c) => c.index === index);
    const target = pos + delta;
    if (pos < 0 || target < 0 || target >= candidates.length) return;
    const next = candidates.slice();
    [next[pos], next[target]] = [next[target], next[pos]];
    setPhase({ ...phase, candidates: next });
  };

  // 합치기·나누기 실수 복구 — 액션별 되돌리기 스택 대신 자동 검출 직후로 통째 복귀
  // (빼기도 함께 초기화 — "자동 검출로 되돌리기"라는 이름 그대로. DECISIONS_NEEDED 15).
  const resetToAutoDetected = () => {
    if (phase.name !== 'review' || phase.busy) return;
    setPhase({
      name: 'review',
      result: phase.result,
      candidates: phase.result.segments,
      excluded: new Set(),
      busy: false,
      actionError: null,
      split: null,
    });
  };

  // segmentsToKeep = 확정에 담을 조각. 빈 배열 = ★통짜 후퇴(기획서 2.6 탈출구) 또는
  // 전부 뺀 경우 — 둘 다 cleanedFull 1장만 영구화된다. 빠진 후보의 크롭 파일은
  // 캐시에 남는다 — 시스템 정리 대상(파일 머리 주석 참조).
  const confirmResult = async (result: SegmentationResult, segmentsToKeep: SegmentCandidate[]) => {
    setPhase({ name: 'saving' });
    try {
      const chosen = { ...result, segments: segmentsToKeep };
      const persisted = await persistSegmentationResult(db, letterId, chosen);
      // 확정 조각을 위젯 풀에 편입(TSD.md 5.2 "풀 = 확정한 모든 조각" — 결정 4의 완성:
      // 위젯이 통째 썸네일 대신 확정된 문장 조각을 보여주게 된다). 동기화 실패는
      // 확정을 되돌리지 않는다 — 풀만 이전 상태로 남고 다음 확정 때 다시 맞춰진다.
      try {
        await syncLetterWidgetThumbnailsAfterSegmentation(
          letterId,
          persisted.cleanedFullUri,
          persisted.segments
        );
      } catch {
        // 무시 — 위젯 풀은 표시 품질 문제일 뿐, 확정 데이터(DB·segments/)는 온전하다.
      }
      updateLetterWidgetSafe(); // 위젯 즉시 갱신(TSD.md 5.1 — Expo Go에서는 no-op)
      setPhase({ name: 'done', segmentCount: chosen.segments.length });
      onPersisted();
    } catch (e) {
      setPhase({ name: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  };

  if (phase.name === 'running' || phase.name === 'saving') {
    return (
      <View style={styles.panelCenter}>
        <Text style={styles.statusText}>
          {phase.name === 'running' ? '손글씨 줄을 나누는 중…' : '편지에 새기는 중…'}
        </Text>
      </View>
    );
  }

  if (phase.name === 'error') {
    return (
      <View style={styles.panelCenter}>
        <Text style={styles.statusText}>줄 나누기를 하지 못했어요.</Text>
        <Text style={styles.subText}>{phase.message}</Text>
        <Pressable style={styles.secondaryButton} onPress={() => setPhase({ name: 'idle' })}>
          <Text style={styles.secondaryButtonText}>돌아가기</Text>
        </Pressable>
      </View>
    );
  }

  if (phase.name === 'done') {
    return (
      <View style={styles.panelCenter}>
        <Text style={styles.statusText}>
          {phase.segmentCount > 0
            ? `줄 조각 ${phase.segmentCount}개를 편지에 새겼어요.`
            : '이 편지는 통째로만 저장했어요.'}
        </Text>
        <Text style={styles.subText}>
          {phase.segmentCount > 0
            ? "'한 줄씩' 보기에서 이 조각들을 만나요."
            : "위젯과 보기에서는 편지 한 장('통째로')으로 만나요."}
        </Text>
        <Pressable style={styles.secondaryButton} onPress={() => setPhase({ name: 'idle' })}>
          <Text style={styles.secondaryButtonText}>다시 나누기</Text>
        </Pressable>
      </View>
    );
  }

  if (phase.name === 'review') {
    const { result, candidates, excluded, busy, actionError, split } = phase;

    // 나누기 액션(TSD.md 4.5 ②)의 분할선 지정 화면 — 이미지를 탭해 가로 분할선을
    // 옮기고 "여기서 나누기"로 확정한다. 드래그·슬라이더가 아닌 탭인 이유는
    // DECISIONS_NEEDED 18(새 의존성 0 — RN 코어에 Slider 없음).
    const splitTarget = split != null ? candidates.find((c) => c.index === split.index) : undefined;
    if (split != null && splitTarget != null) {
      return (
        <View style={styles.panel}>
          <Text style={styles.reviewHeader}>
            {splitTarget.index + 1}번 조각 — 나눌 자리를 탭해 주세요.
          </Text>
          <ScrollView style={styles.candidateList} contentContainerStyle={styles.candidateListContent}>
            <Pressable
              disabled={busy}
              onLayout={(e) => setSplitViewHeight(e.nativeEvent.layout.height)}
              onPress={(e) => {
                if (splitViewHeight <= 0) return;
                // 탭 위치 → 조각 높이 대비 비율. 가장자리 5%는 남긴다 — 실수로 머리카락
                // 같은 조각이 생기는 것을 막고 분할선이 화면에서 안 보이는 일이 없게.
                const fraction = Math.min(
                  0.95,
                  Math.max(0.05, e.nativeEvent.locationY / splitViewHeight)
                );
                setPhase({ ...phase, split: { ...split, fraction } });
              }}
            >
              <Image
                source={{ uri: splitTarget.cropUri }}
                style={[styles.splitImage, { aspectRatio: splitTarget.aspectRatio }]}
                resizeMode="contain"
              />
              {/* 가로 분할선 — 선의 위/아래가 서로 다른 조각이 된다 */}
              <View pointerEvents="none" style={[styles.splitLine, { top: `${split.fraction * 100}%` }]} />
            </Pressable>
            <Text style={styles.subText}>선의 위와 아래가 서로 다른 조각이 돼요.</Text>
          </ScrollView>
          <Pressable style={styles.primaryButton} disabled={busy} onPress={confirmSplit}>
            <Text style={styles.primaryButtonText}>{busy ? '나누는 중…' : '여기서 나누기'}</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} disabled={busy} onPress={cancelSplit}>
            <Text style={styles.secondaryButtonText}>나누지 않고 돌아가기</Text>
          </Pressable>
        </View>
      );
    }

    const kept = candidates.filter((seg) => !excluded.has(seg.index));
    const edited = candidates !== result.segments; // 합치기·나누기·순서 지정이 일어났는가
    return (
      <View style={styles.panel}>
        <ScrollView style={styles.candidateList} contentContainerStyle={styles.candidateListContent}>
          <Text style={styles.reviewHeader}>
            {candidates.length > 0
              ? `줄 조각 후보 ${candidates.length}개 — 이 순서 그대로 새겨져요.`
              : '줄 조각을 찾지 못했어요.'}
          </Text>
          {candidates.length === 0 && (
            <Text style={styles.subText}>이 편지는 통째로 저장하고 한 장으로 만나는 게 좋겠어요.</Text>
          )}
          {actionError != null && (
            <Text style={styles.subText}>조각을 고치지 못했어요 — {actionError}</Text>
          )}
          {edited && (
            <Pressable disabled={busy} onPress={resetToAutoDetected}>
              <Text style={styles.resetLinkText}>자동 검출로 되돌리기</Text>
            </Pressable>
          )}
          {candidates.map((seg, pos) => {
            const isExcluded = excluded.has(seg.index);
            // 합치기(4.5 ①)는 위쪽의 안 뺀 조각과만 — 뺀 조각과 합치면 삭제 액션과 모순
            const canMergeUp =
              !isExcluded && candidates.slice(0, pos).some((c) => !excluded.has(c.index));
            return (
              <View
                key={seg.index}
                style={[styles.candidateRow, isExcluded && styles.candidateRowExcluded]}
              >
                <Text
                  style={[styles.candidateIndex, isExcluded && styles.candidateIndexExcluded]}
                >
                  {seg.index + 1}
                </Text>
                <Image
                  source={{ uri: seg.cropUri }}
                  style={[
                    styles.candidateImage,
                    { aspectRatio: seg.aspectRatio },
                    isExcluded && styles.candidateImageExcluded,
                  ]}
                  resizeMode="contain"
                />
                <View style={styles.rowButtons}>
                  {/* 삭제 액션(TSD.md 4.5 ④) — 얼룩·노이즈 가짜 조각을 빼기. 되살리기 가능 */}
                  <Pressable
                    style={styles.rowButton}
                    disabled={busy}
                    onPress={() => toggleExcluded(seg.index)}
                  >
                    <Text style={styles.rowButtonText}>{isExcluded ? '되살리기' : '빼기'}</Text>
                  </Pressable>
                  {/* 합치기 액션(TSD.md 4.5 ①) — 잘못 쪼개진 줄을 위 조각과 병합 */}
                  {canMergeUp && (
                    <Pressable
                      style={styles.rowButtonSecond}
                      disabled={busy}
                      onPress={() => mergeWithAbove(seg.index)}
                    >
                      <Text style={styles.rowButtonText}>위와 합치기</Text>
                    </Pressable>
                  )}
                  {/* 나누기 액션(TSD.md 4.5 ②) — 하나로 붙은 줄을 위/아래로 분리 */}
                  {!isExcluded && (
                    <Pressable
                      style={styles.rowButtonSecond}
                      disabled={busy}
                      onPress={() => beginSplit(seg.index)}
                    >
                      <Text style={styles.rowButtonText}>나누기</Text>
                    </Pressable>
                  )}
                  {/* 순서 지정 액션(TSD.md 4.5 ⑤) — 노출 순서 재정렬(이웃 교환) */}
                  {!isExcluded && (
                    <View style={styles.moveButtonRow}>
                      <Pressable
                        style={[styles.moveButton, pos === 0 && styles.moveButtonDisabled]}
                        disabled={busy || pos === 0}
                        onPress={() => moveCandidate(seg.index, -1)}
                        accessibilityLabel="위로 이동"
                      >
                        <Text style={styles.rowButtonText}>▲</Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.moveButton,
                          pos === candidates.length - 1 && styles.moveButtonDisabled,
                        ]}
                        disabled={busy || pos === candidates.length - 1}
                        onPress={() => moveCandidate(seg.index, 1)}
                        accessibilityLabel="아래로 이동"
                      >
                        <Text style={styles.rowButtonText}>▼</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
        {/* 완료 조건(기획서 2.6): 유효 조각 1개 이상일 때만 조각 확정 가능 — 전부 빼면 통짜만 */}
        {kept.length > 0 && (
          <Pressable
            style={styles.primaryButton}
            disabled={busy}
            onPress={() => confirmResult(result, kept)}
          >
            <Text style={styles.primaryButtonText}>
              {kept.length < candidates.length
                ? `남은 조각 ${kept.length}개로 새기기`
                : '이 조각들로 새기기'}
            </Text>
          </Pressable>
        )}
        {kept.length === 0 && candidates.length > 0 && (
          <Text style={styles.subText}>조각을 전부 뺐어요 — 통째로만 저장할 수 있어요.</Text>
        )}
        {/* ★탈출구 — 항상 원탭으로 열려 있다. 보정을 강요하지 않는다 (기획서 2.6) */}
        <Pressable
          style={styles.secondaryButton}
          disabled={busy}
          onPress={() => confirmResult(result, [])}
        >
          <Text style={styles.secondaryButtonText}>이 편지는 통째로만 저장</Text>
        </Pressable>
      </View>
    );
  }

  // idle
  return (
    <View style={styles.panelCenter}>
      <Text style={styles.statusText}>{idleStatusText(processingStatus)}</Text>
      <Pressable style={styles.primaryButton} onPress={runSegmentation}>
        <Text style={styles.primaryButtonText}>손글씨 줄 나누기</Text>
      </Pressable>
      <Text style={styles.captionText}>개발 빌드 전용 — Expo Go에서는 안내만 떠요.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#e6ece8',
    marginBottom: 16,
    padding: 12,
  },
  panelCenter: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#e6ece8',
    marginBottom: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: { fontSize: 14, color: '#4b5a52', textAlign: 'center', lineHeight: 21 },
  subText: {
    fontSize: 12,
    color: '#8a978f',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  captionText: { fontSize: 11, color: '#8a978f', marginTop: 8 },
  reviewHeader: { fontSize: 13, fontWeight: '600', color: '#4b5a52', marginBottom: 10 },
  candidateList: { flex: 1 },
  candidateListContent: { paddingBottom: 8 },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
  },
  candidateIndex: {
    width: 24,
    fontSize: 13,
    fontWeight: '700',
    color: '#2e8b6f',
    textAlign: 'center',
  },
  candidateRowExcluded: { backgroundColor: '#f2f3f2' },
  candidateIndexExcluded: { color: '#b3bcb6', textDecorationLine: 'line-through' },
  candidateImage: { flex: 1, marginLeft: 8 },
  candidateImageExcluded: { opacity: 0.3 },
  rowButtons: { marginLeft: 8, alignItems: 'stretch' },
  rowButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#e6ece8',
    alignItems: 'center',
  },
  rowButtonSecond: {
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#e6ece8',
    alignItems: 'center',
  },
  rowButtonText: { fontSize: 12, fontWeight: '600', color: '#4b5a52' },
  moveButtonRow: { flexDirection: 'row', marginTop: 6, gap: 6 },
  moveButton: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#e6ece8',
    alignItems: 'center',
  },
  moveButtonDisabled: { opacity: 0.35 },
  splitImage: { width: '100%', backgroundColor: '#fff', borderRadius: 10 },
  splitLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    marginTop: -1,
    backgroundColor: '#2e8b6f',
  },
  resetLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2e8b6f',
    textAlign: 'center',
    marginBottom: 10,
    textDecorationLine: 'underline',
  },
  primaryButton: {
    backgroundColor: '#2e8b6f',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryButtonText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  secondaryButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: { fontSize: 13, fontWeight: '600', color: '#4b5a52' },
});

import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  segmentLetterImage,
  type SegmentCandidate,
  type SegmentationResult,
} from '../segmentation';
import { persistSegmentationResult } from '../segmentation-store';

/**
 * 세그멘테이션 보정 UI 1보 — 실행 → 후보 목록 → 확정 / ★통짜 후퇴 (TSD.md 4.5, 기획서 2.6).
 *
 * 이번 걸음까지의 범위: 자동 검출(segmentLetterImage) 결과를 줄 조각 후보 목록으로
 * 보여주고, 확정(persistSegmentationResult)하거나 ★통짜 후퇴("이 편지는 통째로만
 * 저장" — 기획서 2.6 탈출구, 상시 개방·원탭)로 빠져나간다. 보정 액션 중
 * **삭제(TSD.md 4.5 ④ — 얼룩·노이즈 가짜 조각 제거)**는 구현됨: 후보별 "빼기" 토글
 * (되살리기 가능 — 실수 복구, 강요 금지 톤)로 뺀 조각은 확정에서 제외된다.
 * 완료 조건은 2.6 그대로 — 유효 조각 1개 이상 또는 통짜 저장(전부 빼면 통짜만 가능).
 *
 * 다음 걸음 (TODO — TSD.md 4.5 보정 액션): 합치기/나누기/박스 조절/순서 지정,
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
  // excluded: "빼기"(삭제 액션)로 제외한 후보의 index 집합 — 확정 시 이 조각들은 빠진다.
  // 남는 조각의 index는 재번호하지 않는다: idx는 순서 용도뿐이라 갭이 무해하고,
  // bbox·파일명(line-<index>.jpg) 대응이 그대로 유지된다 (DECISIONS_NEEDED 12).
  | { name: 'review'; result: SegmentationResult; excluded: ReadonlySet<number> }
  | { name: 'saving' }
  | { name: 'done'; segmentCount: number }
  | { name: 'error'; message: string };

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

  const runSegmentation = async () => {
    setPhase({ name: 'running' });
    try {
      const result = await segmentLetterImage(originalImagePath);
      setPhase({ name: 'review', result, excluded: new Set() });
    } catch (e) {
      // Expo Go면 여기로 온다 — segmentLetterImage의 안내 메시지를 그대로 보여준다
      setPhase({ name: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  };

  // "빼기"/"되살리기" 토글 — 삭제 액션(TSD.md 4.5 ④). 원탭 실행취소가 되므로
  // 확인 다이얼로그 없이 즉시 반영한다(빼도 확정 전까지는 아무것도 사라지지 않는다).
  const toggleExcluded = (index: number) => {
    if (phase.name !== 'review') return;
    const excluded = new Set(phase.excluded);
    if (excluded.has(index)) excluded.delete(index);
    else excluded.add(index);
    setPhase({ ...phase, excluded });
  };

  // segmentsToKeep = 확정에 담을 조각. 빈 배열 = ★통짜 후퇴(기획서 2.6 탈출구) 또는
  // 전부 뺀 경우 — 둘 다 cleanedFull 1장만 영구화된다. 빠진 후보의 크롭 파일은
  // 캐시에 남는다 — 시스템 정리 대상(파일 머리 주석 참조).
  const confirmResult = async (result: SegmentationResult, segmentsToKeep: SegmentCandidate[]) => {
    setPhase({ name: 'saving' });
    try {
      const chosen = { ...result, segments: segmentsToKeep };
      await persistSegmentationResult(db, letterId, chosen);
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
    const { result, excluded } = phase;
    const kept = result.segments.filter((seg) => !excluded.has(seg.index));
    return (
      <View style={styles.panel}>
        <ScrollView style={styles.candidateList} contentContainerStyle={styles.candidateListContent}>
          <Text style={styles.reviewHeader}>
            {result.segments.length > 0
              ? `줄 조각 후보 ${result.segments.length}개 — 위에서 아래 순서예요.`
              : '줄 조각을 찾지 못했어요.'}
          </Text>
          {result.segments.length === 0 && (
            <Text style={styles.subText}>이 편지는 통째로 저장하고 한 장으로 만나는 게 좋겠어요.</Text>
          )}
          {result.segments.map((seg) => {
            const isExcluded = excluded.has(seg.index);
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
                {/* 삭제 액션(TSD.md 4.5 ④) — 얼룩·노이즈 가짜 조각을 빼기. 되살리기 가능 */}
                <Pressable style={styles.excludeButton} onPress={() => toggleExcluded(seg.index)}>
                  <Text style={styles.excludeButtonText}>
                    {isExcluded ? '되살리기' : '빼기'}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
        {/* 완료 조건(기획서 2.6): 유효 조각 1개 이상일 때만 조각 확정 가능 — 전부 빼면 통짜만 */}
        {kept.length > 0 && (
          <Pressable style={styles.primaryButton} onPress={() => confirmResult(result, kept)}>
            <Text style={styles.primaryButtonText}>
              {kept.length < result.segments.length
                ? `남은 조각 ${kept.length}개로 새기기`
                : '이 조각들로 새기기'}
            </Text>
          </Pressable>
        )}
        {kept.length === 0 && result.segments.length > 0 && (
          <Text style={styles.subText}>조각을 전부 뺐어요 — 통째로만 저장할 수 있어요.</Text>
        )}
        {/* ★탈출구 — 항상 원탭으로 열려 있다. 보정을 강요하지 않는다 (기획서 2.6) */}
        <Pressable style={styles.secondaryButton} onPress={() => confirmResult(result, [])}>
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
  excludeButton: {
    marginLeft: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#e6ece8',
  },
  excludeButtonText: { fontSize: 12, fontWeight: '600', color: '#4b5a52' },
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

import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { segmentLetterImage, type SegmentationResult } from '../segmentation';
import { persistSegmentationResult } from '../segmentation-store';

/**
 * 세그멘테이션 보정 UI 1보 — 실행 → 후보 목록 → 확정 / ★통짜 후퇴 (TSD.md 4.5, 기획서 2.6).
 *
 * 이번 걸음의 범위: 자동 검출(segmentLetterImage) 결과를 줄 조각 후보 목록으로
 * 보여주고, 그대로 확정(persistSegmentationResult — 첫 호출부)하거나
 * ★통짜 후퇴("이 편지는 통째로만 저장" — 기획서 2.6 탈출구, 상시 개방·원탭)로
 * 빠져나가는 뼈대까지. 완료 조건도 2.6 그대로 — 유효 조각 1개 이상 또는 통짜 저장.
 *
 * 다음 걸음 (TODO — TSD.md 4.5 보정 액션): 합치기/나누기/박스 조절/삭제/순서 지정,
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
  | { name: 'review'; result: SegmentationResult }
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
      setPhase({ name: 'review', result });
    } catch (e) {
      // Expo Go면 여기로 온다 — segmentLetterImage의 안내 메시지를 그대로 보여준다
      setPhase({ name: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  };

  // wholeOnly = ★통짜 후퇴: 조각을 폐기하고 cleanedFull 1장만 영구화 (기획서 2.6 탈출구).
  // 폐기된 후보 크롭 파일은 캐시에 남는다 — 시스템 정리 대상(파일 머리 주석 참조).
  const confirmResult = async (result: SegmentationResult, wholeOnly: boolean) => {
    setPhase({ name: 'saving' });
    try {
      const chosen = wholeOnly ? { ...result, segments: [] } : result;
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
            ? "'한 줄씩' 보기가 이 조각들을 보여주는 건 다음 업데이트예요."
            : "위젯과 보기에서는 편지 한 장('통째로')으로 만나요."}
        </Text>
        <Pressable style={styles.secondaryButton} onPress={() => setPhase({ name: 'idle' })}>
          <Text style={styles.secondaryButtonText}>다시 나누기</Text>
        </Pressable>
      </View>
    );
  }

  if (phase.name === 'review') {
    const { result } = phase;
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
          {result.segments.map((seg) => (
            <View key={seg.index} style={styles.candidateRow}>
              <Text style={styles.candidateIndex}>{seg.index + 1}</Text>
              <Image
                source={{ uri: seg.cropUri }}
                style={[styles.candidateImage, { aspectRatio: seg.aspectRatio }]}
                resizeMode="contain"
              />
            </View>
          ))}
        </ScrollView>
        {result.segments.length > 0 && (
          <Pressable style={styles.primaryButton} onPress={() => confirmResult(result, false)}>
            <Text style={styles.primaryButtonText}>이 조각들로 새기기</Text>
          </Pressable>
        )}
        {/* ★탈출구 — 항상 원탭으로 열려 있다. 보정을 강요하지 않는다 (기획서 2.6) */}
        <Pressable style={styles.secondaryButton} onPress={() => confirmResult(result, true)}>
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
  candidateImage: { flex: 1, marginLeft: 8 },
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

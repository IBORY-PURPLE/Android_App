import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

/**
 * '한 줄씩' 보기 실동작 — 확정된 줄 조각(segmentCrop)을 segment_order 순으로 그린다.
 *
 * TSD.md 4.6: 모드 전환은 렌더 시점의 이미지 선택일 뿐 — 여기서는 segment 테이블에
 * 이미 확정된 조각(asset kind='segmentCrop')을 읽어 위→아래로 쌓아 보여준다.
 * 새 이미지 생성·세그멘테이션 실행은 하지 않는다(그건 SegmentationReviewPanel의 일).
 *
 * 순서 규칙: letter.segment_order(확정 segment id의 JSON 배열 — 보정 액션 '순서 지정'이
 * 확정 시점에 이 배열을 정한다)를 우선하고, 배열이 없거나 깨졌으면 segment.idx 오름차순으로
 * 후퇴한다. TSD.md 6.5의 "segment_order 순으로 문장 스크럽"에 대응하는 첫 걸음 —
 * 지금은 세로 목록이고, 스크럽(넘겨 보기)·핀치 줌은 다음 걸음이다.
 *
 * 이 화면이 뜨는 조건은 부모(LetterDetailScreen)가 판단한다 — processing_status가
 * 'ready'(조각 1개 이상 확정)일 때만. '통짜 후퇴'(cleaned)·미확정(raw)은 보정 패널로.
 *
 * SDK 57 확인: expo-sqlite `getAllAsync<T>(source, params)` → Promise<T[]>
 * (설치본 build/SQLiteDatabase.d.ts — 이터레이션 3에서 실측한 것과 동일 시그니처).
 */

type SegmentRow = {
  id: string;
  idx: number;
  aspect_ratio: number | null;
  local_path: string;
};

type Props = {
  letterId: string;
  segmentOrder: string | null; // letter.segment_order — 확정 segment id의 JSON 배열 문자열
  onReSegmentPress: () => void; // "다시 나누기" — 부모가 보정 패널로 전환한다
};

// segment_order 배열 위치 우선, 없는 id는 idx 순서를 유지한 채 뒤로 (정렬 안정성은 ES2019 보장)
function orderSegments(rows: SegmentRow[], segmentOrderJson: string | null): SegmentRow[] {
  const byIdx = [...rows].sort((a, b) => a.idx - b.idx);
  if (segmentOrderJson === null) return byIdx;
  let order: unknown;
  try {
    order = JSON.parse(segmentOrderJson);
  } catch {
    return byIdx; // 깨진 JSON — idx 순서로 후퇴
  }
  if (!Array.isArray(order)) return byIdx;
  const position = new Map<string, number>();
  order.forEach((id, i) => {
    if (typeof id === 'string' && !position.has(id)) position.set(id, i);
  });
  return byIdx.sort(
    (a, b) =>
      (position.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
      (position.get(b.id) ?? Number.MAX_SAFE_INTEGER)
  );
}

export default function LineSegmentsView({ letterId, segmentOrder, onReSegmentPress }: Props) {
  const db = useSQLiteContext();
  const [segments, setSegments] = useState<SegmentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    db.getAllAsync<SegmentRow>(
      `SELECT s.id, s.idx, s.aspect_ratio, a.local_path
       FROM segment s
       JOIN asset a ON a.id = s.crop_asset_id
       WHERE s.letter_id = ? AND s.granularity = 'line'`,
      [letterId]
    )
      .then((rows) => setSegments(orderSegments(rows, segmentOrder)))
      .catch((e) => setError(String(e)));
  }, [db, letterId, segmentOrder]);

  if (error !== null) {
    return (
      <View style={styles.panelCenter}>
        <Text style={styles.statusText}>줄 조각을 읽지 못했어요.</Text>
        <Text style={styles.subText}>{error}</Text>
      </View>
    );
  }

  if (segments !== null && segments.length === 0) {
    // 방어적 처리 — 'ready'인데 조각이 없다(정상 흐름에선 안 생긴다). 다시 나누기로 복구.
    return (
      <View style={styles.panelCenter}>
        <Text style={styles.statusText}>확정된 줄 조각을 찾지 못했어요.</Text>
        <Pressable style={styles.secondaryButton} onPress={onReSegmentPress}>
          <Text style={styles.secondaryButtonText}>다시 나누기</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {(segments ?? []).map((seg) => (
          <View key={seg.id} style={styles.segmentCard}>
            <Image
              source={{ uri: seg.local_path }}
              // aspect_ratio는 확정 시점에 항상 기록된다(segmentation-store) — null은 방어값
              style={[styles.segmentImage, { aspectRatio: seg.aspect_ratio ?? 4 }]}
              resizeMode="contain"
            />
          </View>
        ))}
      </ScrollView>
      <Pressable style={styles.secondaryButton} onPress={onReSegmentPress}>
        <Text style={styles.secondaryButtonText}>다시 나누기</Text>
      </Pressable>
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
  list: { flex: 1 },
  listContent: { paddingBottom: 8 },
  segmentCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
  },
  segmentImage: { width: '100%' },
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

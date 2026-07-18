import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';

// letter + 원본 이미지 경로(asset.local_path)를 한 번에 읽는다 (스키마: src/db.ts).
// 썸네일 원천은 원본 스캔(originalScan) — 위젯 풀(widget-thumbs/)을 재사용하지 않는
// 이유는 확정 후 풀 엔트리가 가로로 긴 줄 조각이라 목록 미리보기로 부적합하고,
// 풀은 위젯 표시 품질용이지 진실의 원천이 아니기 때문(채택 근거는 DECISIONS_NEEDED 17).
type LetterRow = {
  id: string;
  author_display_name: string;
  received_date: number | null;
  scanned_at: number;
  local_path: string | null;
};

type Props = {
  onAddPress: () => void;
  onLetterPress: (letterId: string) => void;
  /** 위젯 미리보기 화면(TSD.md 5.6 — 위젯 디자인을 앱 안에서 확인) 진입 */
  onWidgetPreviewPress: () => void;
};

// 편지함 — letter 테이블을 읽는 목록 + "편지 추가" 진입점 (개발계획.md 1단계 '화면: 편지함/편지 추가')
export default function LetterListScreen({ onAddPress, onLetterPress, onWidgetPreviewPress }: Props) {
  const db = useSQLiteContext();
  const [letters, setLetters] = useState<LetterRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    db.getAllAsync<LetterRow>(
      `SELECT l.id, l.author_display_name, l.received_date, l.scanned_at, a.local_path
       FROM letter l
       LEFT JOIN asset a ON a.id = l.original_asset_id
       ORDER BY l.scanned_at DESC`
    )
      .then(setLetters)
      .catch((e) => setError(String(e)));
  }, [db]);

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>편지함</Text>
        <Pressable onPress={onWidgetPreviewPress} hitSlop={8}>
          <Text style={styles.previewLink}>위젯 미리보기</Text>
        </Pressable>
      </View>
      {error !== null && <Text style={styles.error}>목록을 읽지 못했어요: {error}</Text>}
      <FlatList
        data={letters}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => onLetterPress(item.id)}>
            {item.local_path !== null ? (
              // resizeMethod="resize"(안드로이드 전용 — 설치본 RN 0.86 Image.d.ts 실측):
              // 뷰보다 훨씬 큰 원본 스캔을 디코드 전에 축소해 목록 메모리를 아낀다.
              // cover 크롭은 미리보기 어포던스일 뿐 — 감상 화면(상세)은 원본 그대로다(원칙 1).
              <Image
                source={{ uri: item.local_path }}
                style={styles.rowThumb}
                resizeMode="cover"
                resizeMethod="resize"
              />
            ) : (
              <View style={[styles.rowThumb, styles.rowThumbEmpty]}>
                <Text style={styles.rowThumbEmptyEmoji}>💌</Text>
              </View>
            )}
            <View style={styles.rowTextColumn}>
              <Text style={styles.rowName}>{item.author_display_name}</Text>
              <Text style={styles.rowDate}>
                {formatDate(item.received_date ?? item.scanned_at)}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💌</Text>
            <Text style={styles.emptyText}>
              아직 편지가 없어요.{'\n'}받은 손편지를 사진으로 담아 보관해 보세요.
            </Text>
          </View>
        }
        contentContainerStyle={letters.length === 0 ? styles.emptyGrow : undefined}
      />
      <Pressable style={styles.addButton} onPress={onAddPress}>
        <Text style={styles.addButtonText}>+ 편지 추가</Text>
      </Pressable>
    </View>
  );
}

// 시간 값은 Unix epoch 밀리초(INTEGER)로 저장한다는 전제 (INSERT 쪽도 Date.now() 사용 예정)
function formatDate(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString();
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 56, paddingHorizontal: 20 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#1f2a24' },
  previewLink: { fontSize: 14, color: '#2e8b6f', fontWeight: '600' },
  error: { fontSize: 13, color: '#b3392f', marginBottom: 12 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    elevation: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#e6ece8', // 편지지 톤 — 로드 전·투명 영역 배경
  },
  rowThumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  rowThumbEmptyEmoji: { fontSize: 22 },
  rowTextColumn: { flex: 1, marginLeft: 14 },
  rowName: { fontSize: 16, fontWeight: '700', color: '#1f2a24' },
  rowDate: { fontSize: 12, color: '#6b7a72', marginTop: 4 },
  empty: { alignItems: 'center' },
  emptyGrow: { flexGrow: 1, justifyContent: 'center' },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#8a978f', textAlign: 'center', lineHeight: 21 },
  addButton: {
    backgroundColor: '#2e8b6f',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 24,
  },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

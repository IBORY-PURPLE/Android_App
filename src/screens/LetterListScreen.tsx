import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

// letter 테이블에서 목록 표시에 필요한 열만 읽는다 (스키마: src/db.ts)
type LetterRow = {
  id: string;
  author_display_name: string;
  received_date: number | null;
  scanned_at: number;
};

type Props = {
  onAddPress: () => void;
  onLetterPress: (letterId: string) => void;
};

// 편지함 — letter 테이블을 읽는 목록 + "편지 추가" 진입점 (개발계획.md 1단계 '화면: 편지함/편지 추가')
export default function LetterListScreen({ onAddPress, onLetterPress }: Props) {
  const db = useSQLiteContext();
  const [letters, setLetters] = useState<LetterRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    db.getAllAsync<LetterRow>(
      'SELECT id, author_display_name, received_date, scanned_at FROM letter ORDER BY scanned_at DESC'
    )
      .then(setLetters)
      .catch((e) => setError(String(e)));
  }, [db]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>편지함</Text>
      {error !== null && <Text style={styles.error}>목록을 읽지 못했어요: {error}</Text>}
      <FlatList
        data={letters}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => onLetterPress(item.id)}>
            <Text style={styles.rowName}>{item.author_display_name}</Text>
            <Text style={styles.rowDate}>{formatDate(item.received_date ?? item.scanned_at)}</Text>
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
  title: { fontSize: 26, fontWeight: '800', color: '#1f2a24', marginBottom: 16 },
  error: { fontSize: 13, color: '#b3392f', marginBottom: 12 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 10,
    elevation: 1,
  },
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

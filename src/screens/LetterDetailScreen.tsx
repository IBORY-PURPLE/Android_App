import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

// letter + 원본 이미지 경로(asset.local_path)를 한 번에 읽는다 (스키마: src/db.ts)
type LetterDetailRow = {
  author_display_name: string;
  received_date: number | null;
  scanned_at: number;
  local_path: string | null;
};

type Props = {
  letterId: string;
  onBackPress: () => void;
};

/**
 * 편지 상세 — 편지함에서 고른 편지의 저장된 원본 이미지를 크게 보여준다
 * (개발계획.md 1단계. 보기모드 3종은 다음 증분 — 지금은 원본 통짜 표시만).
 *
 * SDK 57 확인: expo-sqlite `getFirstAsync<T>(source, params)` → Promise<T | null>
 * (node_modules/expo-sqlite/build/SQLiteDatabase.d.ts에서 시그니처 확인).
 */
export default function LetterDetailScreen({ letterId, onBackPress }: Props) {
  const db = useSQLiteContext();
  const [row, setRow] = useState<LetterDetailRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    db.getFirstAsync<LetterDetailRow>(
      `SELECT l.author_display_name, l.received_date, l.scanned_at, a.local_path
       FROM letter l
       LEFT JOIN asset a ON a.id = l.original_asset_id
       WHERE l.id = ?`,
      [letterId]
    )
      .then((r) => {
        setRow(r);
        setLoaded(true);
      })
      .catch((e) => {
        setError(String(e));
        setLoaded(true);
      });
  }, [db, letterId]);

  return (
    <View style={styles.container}>
      {row !== null && (
        <View style={styles.header}>
          <Text style={styles.name}>{row.author_display_name}</Text>
          <Text style={styles.date}>
            {new Date(row.received_date ?? row.scanned_at).toLocaleDateString()}에 받은 편지
          </Text>
        </View>
      )}
      {error !== null && <Text style={styles.error}>편지를 읽지 못했어요: {error}</Text>}
      {loaded && error === null && row === null && (
        <Text style={styles.error}>편지를 찾지 못했어요.</Text>
      )}
      {row !== null && row.local_path !== null ? (
        <Image source={{ uri: row.local_path }} style={styles.image} resizeMode="contain" />
      ) : (
        <View style={styles.imageEmpty}>
          {loaded && row !== null && (
            <Text style={styles.imageEmptyText}>저장된 이미지가 없어요.</Text>
          )}
        </View>
      )}
      <Pressable style={styles.backButton} onPress={onBackPress}>
        <Text style={styles.backButtonText}>← 편지함으로</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 56, paddingHorizontal: 20 },
  header: { marginBottom: 16 },
  name: { fontSize: 26, fontWeight: '800', color: '#1f2a24' },
  date: { fontSize: 13, color: '#6b7a72', marginTop: 4 },
  error: { fontSize: 13, color: '#b3392f', marginBottom: 12 },
  image: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#e6ece8',
    marginBottom: 16,
  },
  imageEmpty: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#e6ece8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  imageEmptyText: { fontSize: 14, color: '#8a978f' },
  backButton: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 1,
  },
  backButtonText: { fontSize: 15, fontWeight: '700', color: '#2e8b6f' },
});

import { File } from 'expo-file-system';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { deleteLetterWidgetThumbnail } from '../widgets/letter-widget-thumbs';
import { updateLetterWidgetSafe } from '../widgets/update-letter-widget';

// letter + 원본 이미지 경로(asset.local_path)를 한 번에 읽는다 (스키마: src/db.ts)
type LetterDetailRow = {
  author_display_name: string;
  received_date: number | null;
  scanned_at: number;
  original_asset_id: string | null;
  local_path: string | null;
};

type Props = {
  letterId: string;
  onBackPress: () => void;
};

// 보기 모드 3종 (기획서 결정 3: 편지 통째로 / 한 줄씩 / 한 문장씩).
// TSD.md 4.6: 모드 전환은 렌더 시점의 이미지 선택일 뿐 — 새 이미지 생성이 아니다.
// 지금은 '통째로'만 실동작. '한 줄씩'/'한 문장씩'은 2단계 세그멘테이션(OpenCV)이
// segmentCrop 조각을 만든 뒤에 그 조각 이미지를 그린다 (TODO: 2단계).
type ViewMode = 'whole' | 'line' | 'sentence';

const VIEW_MODES: { mode: ViewMode; label: string }[] = [
  { mode: 'whole', label: '통째로' },
  { mode: 'line', label: '한 줄씩' },
  { mode: 'sentence', label: '한 문장씩' },
];

/**
 * 편지 상세 — 편지함에서 고른 편지의 저장된 원본 이미지를 크게 보여준다
 * (개발계획.md 1단계. 보기모드 3종 뼈대 포함 — 통째로만 실동작).
 *
 * 삭제: 기획서 3.8 "받은 편지는 로컬에 영구 보관(사용자가 지우기 전까지)" —
 * 지우는 건 사용자의 능동 행위이며, 결정 8(디지털은 사본, 실물이 원본)에 따라
 * 사라지는 것은 앱 안의 사본뿐이다(letter·asset 행 + letters/ 이미지 사본).
 *
 * SDK 57 확인 (설치본 타입 정의에서 시그니처 확인):
 * - expo-sqlite `getFirstAsync<T>(source, params)` → Promise<T | null>,
 *   `runAsync` / `withTransactionAsync` (build/SQLiteDatabase.d.ts)
 * - expo-file-system `File.delete(): void`(동기, 없으면 throw), `File.exists: boolean`
 *   (build/internal/NativeFileSystem.types.d.ts)
 */
export default function LetterDetailScreen({ letterId, onBackPress }: Props) {
  const db = useSQLiteContext();
  const [row, setRow] = useState<LetterDetailRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('whole');

  useEffect(() => {
    db.getFirstAsync<LetterDetailRow>(
      `SELECT l.author_display_name, l.received_date, l.scanned_at, l.original_asset_id, a.local_path
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

  const deleteLetter = async () => {
    if (row === null || deleting) return;
    setDeleting(true);
    try {
      await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM letter WHERE id = ?', [letterId]);
        if (row.original_asset_id !== null) {
          await db.runAsync('DELETE FROM asset WHERE id = ?', [row.original_asset_id]);
        }
      });
      // 이미지 사본 파일 정리 — DB가 이미 지워졌으므로 실패해도 고아 파일만 남는다(치명적 아님)
      if (row.local_path !== null) {
        try {
          const file = new File(row.local_path);
          if (file.exists) file.delete();
        } catch {
          // 무시 — 다음 스캔 저장에 영향 없음
        }
      }
      // 위젯 썸네일도 지우고 위젯 갱신 — 지운 편지가 위젯에 계속 뜨지 않게
      try {
        deleteLetterWidgetThumbnail(letterId);
      } catch {
        // 무시 — 고아 썸네일만 남는다
      }
      updateLetterWidgetSafe();
      onBackPress(); // 편지함으로 — 목록 화면이 다시 마운트되며 새로 읽는다
    } catch (e) {
      setError(`지우지 못했어요: ${String(e)}`);
      setDeleting(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert('이 편지를 지울까요?', '앱에 담아 둔 사본만 사라져요.\n실물 편지는 그대로예요.', [
      { text: '남겨두기', style: 'cancel' },
      { text: '지우기', style: 'destructive', onPress: deleteLetter },
    ]);
  };

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
      {row !== null && (
        <View style={styles.modeRow}>
          {VIEW_MODES.map(({ mode, label }) => (
            <Pressable
              key={mode}
              style={[styles.modeButton, viewMode === mode && styles.modeButtonActive]}
              onPress={() => setViewMode(mode)}
            >
              <Text
                style={[styles.modeButtonText, viewMode === mode && styles.modeButtonTextActive]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      {viewMode !== 'whole' && row !== null ? (
        // TODO(2단계 세그멘테이션): segmentCrop 조각이 생기면 여기서 조각 이미지를 그린다 (TSD.md 4.6)
        <View style={styles.imageEmpty}>
          <Text style={styles.imageEmptyText}>
            {viewMode === 'line' ? '한 줄씩 보기' : '한 문장씩 보기'}는 아직 준비 중이에요.
          </Text>
          <Text style={styles.imageEmptySubText}>
            편지를 줄 조각으로 나누는 작업(세그멘테이션)이 끝나면 여기서 볼 수 있어요.
          </Text>
        </View>
      ) : row !== null && row.local_path !== null ? (
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
      {row !== null && (
        <Pressable style={styles.deleteButton} onPress={confirmDelete} disabled={deleting}>
          <Text style={styles.deleteButtonText}>
            {deleting ? '지우는 중…' : '이 편지 지우기'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 56, paddingHorizontal: 20 },
  header: { marginBottom: 16 },
  name: { fontSize: 26, fontWeight: '800', color: '#1f2a24' },
  date: { fontSize: 13, color: '#6b7a72', marginTop: 4 },
  error: { fontSize: 13, color: '#b3392f', marginBottom: 12 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modeButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: 'center',
    elevation: 1,
  },
  modeButtonActive: { backgroundColor: '#2e8b6f' },
  modeButtonText: { fontSize: 13, fontWeight: '600', color: '#6b7a72' },
  modeButtonTextActive: { color: '#fff' },
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
  imageEmptySubText: {
    fontSize: 12,
    color: '#8a978f',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  backButton: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 1,
  },
  backButtonText: { fontSize: 15, fontWeight: '700', color: '#2e8b6f' },
  deleteButton: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  deleteButtonText: { fontSize: 14, fontWeight: '600', color: '#b3392f' },
});

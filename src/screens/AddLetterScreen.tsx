import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { createLetterWidgetThumbnail } from '../widgets/letter-widget-thumbs';
import { updateLetterWidgetSafe } from '../widgets/update-letter-widget';

type Props = {
  onBackPress: () => void;
};

/**
 * 편지 추가 — 갤러리에서 편지 사진을 골라 애칭·받은 날짜와 함께 저장한다
 * (개발계획.md 1단계 '이미지 획득 + 로컬 저장').
 *
 * SDK 57 문서 확인 사항:
 * - expo-image-picker: launchImageLibraryAsync → { canceled, assets }. mediaTypes는 ['images'].
 * - expo-file-system(https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/):
 *   File/Directory/Paths 클래스 API. Paths.document가 앱 문서 디렉터리,
 *   Directory.create({ intermediates, idempotent }), File.copy(destination) → Promise<void>.
 * - expo-crypto: Crypto.randomUUID(): string (동기, UUIDv4).
 * - expo-sqlite: runAsync(source, params) / withTransactionAsync(task).
 *
 * 저장 규칙:
 * - 결정 8 '디지털은 사본' — 갤러리 원본은 건드리지 않고 앱 문서 폴더 letters/에 사본을 만든다.
 * - asset.kind = 'originalScan', letter.processing_status = 'raw' (TSD.md 6.3).
 * - 시간 값은 Unix epoch 밀리초(INTEGER). 편지함 formatDate와 같은 전제.
 */
export default function AddLetterScreen({ onBackPress }: Props) {
  const db = useSQLiteContext();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [receivedDate, setReceivedDate] = useState(todayString());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1, // 손글씨 물성 보존(기획서 원칙 1) — 압축하지 않는다
      });
      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
        setError(null);
      }
    } catch (e) {
      setError(`사진을 불러오지 못했어요: ${String(e)}`);
    }
  };

  const saveLetter = async () => {
    if (imageUri === null || saving) return;
    const name = nickname.trim();
    if (name === '') {
      setError('보낸 사람 애칭을 입력해 주세요.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(receivedDate)) {
      setError('받은 날짜는 YYYY-MM-DD 형식으로 적어 주세요.');
      return;
    }
    const receivedMs = new Date(`${receivedDate}T00:00:00`).getTime();
    if (Number.isNaN(receivedMs)) {
      setError('받은 날짜가 올바르지 않아요.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const letterId = Crypto.randomUUID();
      const assetId = Crypto.randomUUID();

      // 결정 8 '디지털은 사본' — 앱 문서 폴더 letters/에 이미지 사본 저장
      const lettersDir = new Directory(Paths.document, 'letters');
      lettersDir.create({ intermediates: true, idempotent: true });
      const ext = /\.(jpe?g|png|webp|heic)$/i.exec(imageUri)?.[1]?.toLowerCase() ?? 'jpg';
      const destFile = new File(lettersDir, `${assetId}.${ext}`);
      await new File(imageUri).copy(destFile);

      await db.withTransactionAsync(async () => {
        await db.runAsync(
          'INSERT INTO asset (id, kind, local_path, byte_size) VALUES (?, ?, ?, ?)',
          [assetId, 'originalScan', destFile.uri, destFile.size]
        );
        await db.runAsync(
          `INSERT INTO letter
             (id, author_display_name, received_date, scanned_at, original_asset_id, processing_status)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [letterId, name, receivedMs, Date.now(), assetId, 'raw']
        );
      });

      // 위젯용 다운스케일 썸네일 생성 + 위젯 즉시 갱신(TSD.md 1.4·5.1).
      // 실패해도 편지 저장은 이미 성공 — 위젯만 다음 기회에 따라잡는다(치명 아님).
      try {
        await createLetterWidgetThumbnail(letterId, destFile.uri);
      } catch {
        // 무시 — 편지 본체(원본 사본 + DB 행)는 온전하다
      }
      updateLetterWidgetSafe();

      onBackPress(); // 편지함으로 — 목록 화면이 다시 마운트되며 새로 읽는다
    } catch (e) {
      setError(`저장하지 못했어요: ${String(e)}`);
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>편지 추가</Text>
      {error !== null && <Text style={styles.error}>{error}</Text>}
      {imageUri !== null ? (
        <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
      ) : (
        <View style={styles.previewEmpty}>
          <Text style={styles.previewEmptyEmoji}>📷</Text>
          <Text style={styles.previewEmptyText}>
            받은 손편지 사진을{'\n'}갤러리에서 골라 주세요.
          </Text>
        </View>
      )}
      {imageUri !== null && (
        <View>
          <TextInput
            style={styles.input}
            value={nickname}
            onChangeText={setNickname}
            placeholder="보낸 사람 애칭 (예: 곰돌이)"
            placeholderTextColor="#9aa8a0"
          />
          <TextInput
            style={styles.input}
            value={receivedDate}
            onChangeText={setReceivedDate}
            placeholder="받은 날짜 (YYYY-MM-DD)"
            placeholderTextColor="#9aa8a0"
          />
          <Pressable style={styles.saveButton} onPress={saveLetter} disabled={saving}>
            <Text style={styles.saveButtonText}>{saving ? '저장 중…' : '편지 보관하기'}</Text>
          </Pressable>
        </View>
      )}
      <Pressable style={styles.pickButton} onPress={pickImage}>
        <Text style={styles.pickButtonText}>
          {imageUri !== null ? '다른 사진 고르기' : '갤러리에서 사진 선택'}
        </Text>
      </Pressable>
      <Pressable style={styles.backButton} onPress={onBackPress}>
        <Text style={styles.backButtonText}>← 편지함으로</Text>
      </Pressable>
    </View>
  );
}

// 오늘 날짜를 YYYY-MM-DD로 (받은 날짜 입력 기본값)
function todayString(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${mm}-${dd}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 56, paddingHorizontal: 20 },
  title: { fontSize: 26, fontWeight: '800', color: '#1f2a24', marginBottom: 16 },
  error: { fontSize: 13, color: '#b3392f', marginBottom: 12 },
  preview: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#e6ece8',
    marginBottom: 16,
  },
  previewEmpty: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#e6ece8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  previewEmptyEmoji: { fontSize: 44, marginBottom: 12 },
  previewEmptyText: { fontSize: 14, color: '#8a978f', textAlign: 'center', lineHeight: 21 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1f2a24',
    marginBottom: 10,
    elevation: 1,
  },
  saveButton: {
    backgroundColor: '#2e8b6f',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  pickButton: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 1,
  },
  pickButtonText: { fontSize: 15, fontWeight: '700', color: '#2e8b6f' },
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

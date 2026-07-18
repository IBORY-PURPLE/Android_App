import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  onBackPress: () => void;
};

/**
 * 편지 추가 — 갤러리에서 편지 사진을 골라 화면에 보여준다 (개발계획.md 1단계 '이미지 획득').
 *
 * SDK 57 문서(https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/) 확인 사항:
 * - launchImageLibraryAsync(options) → { canceled, assets }. 갤러리 실행에는 권한 요청 불필요.
 * - mediaTypes는 문자열 배열(['images']). MediaTypeOptions enum은 deprecated.
 *
 * 다음 증분: 애칭·날짜 입력 폼 + letter/asset INSERT (이미지 앱 폴더 복사 포함).
 */
export default function AddLetterScreen({ onBackPress }: Props) {
  const [imageUri, setImageUri] = useState<string | null>(null);
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
      setError(String(e));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>편지 추가</Text>
      {error !== null && <Text style={styles.error}>사진을 불러오지 못했어요: {error}</Text>}
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
  pickButton: {
    backgroundColor: '#2e8b6f',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  pickButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
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

import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DB_NAME, initLetterDb } from './src/db';
import LetterListScreen from './src/screens/LetterListScreen';

// 이 숫자를 바꿔 저장하면 에뮬레이터 화면이 즉시 바뀝니다 (실시간 반영 증명용)
const BUILD_MARKER = 4;

// 화면이 당장 둘뿐이라 내비게이션 라이브러리 없이 useState로 전환한다
type Screen = 'list' | 'add';

export default function App() {
  return (
    <SQLiteProvider databaseName={DB_NAME} onInit={initLetterDb}>
      <Root />
    </SQLiteProvider>
  );
}

function Root() {
  const [screen, setScreen] = useState<Screen>('list');

  return (
    <View style={styles.root}>
      {screen === 'list' ? (
        <LetterListScreen onAddPress={() => setScreen('add')} />
      ) : (
        <AddLetterPlaceholder onBackPress={() => setScreen('list')} />
      )}
      <Text style={styles.marker}>BUILD #{BUILD_MARKER}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

// 편지 추가 화면 자리 — 다음 증분에서 expo-image-picker 갤러리 선택으로 채운다
function AddLetterPlaceholder({ onBackPress }: { onBackPress: () => void }) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderTitle}>편지 추가</Text>
      <Text style={styles.placeholderText}>
        다음 단계: 갤러리에서 편지 사진 선택{'\n'}(expo-image-picker)
      </Text>
      <Pressable style={styles.backButton} onPress={onBackPress}>
        <Text style={styles.backButtonText}>← 편지함으로</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f2f5f3' },
  marker: {
    position: 'absolute',
    bottom: 6,
    alignSelf: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#9fb3a9',
  },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  placeholderTitle: { fontSize: 24, fontWeight: '800', color: '#1f2a24', marginBottom: 12 },
  placeholderText: {
    fontSize: 14,
    color: '#6b7a72',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
  backButton: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 22,
    elevation: 1,
  },
  backButtonText: { fontSize: 15, fontWeight: '700', color: '#2e8b6f' },
});

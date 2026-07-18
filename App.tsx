import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DB_NAME, initLetterDb } from './src/db';
import AddLetterScreen from './src/screens/AddLetterScreen';
import LetterDetailScreen from './src/screens/LetterDetailScreen';
import LetterListScreen from './src/screens/LetterListScreen';

// 이 숫자를 바꿔 저장하면 에뮬레이터 화면이 즉시 바뀝니다 (실시간 반영 증명용)
const BUILD_MARKER = 7;

// 화면이 셋뿐이라 내비게이션 라이브러리 없이 useState로 전환한다
type Screen = { name: 'list' } | { name: 'add' } | { name: 'detail'; letterId: string };

export default function App() {
  return (
    <SQLiteProvider databaseName={DB_NAME} onInit={initLetterDb}>
      <Root />
    </SQLiteProvider>
  );
}

function Root() {
  const [screen, setScreen] = useState<Screen>({ name: 'list' });

  return (
    <View style={styles.root}>
      {screen.name === 'list' && (
        <LetterListScreen
          onAddPress={() => setScreen({ name: 'add' })}
          onLetterPress={(letterId) => setScreen({ name: 'detail', letterId })}
        />
      )}
      {screen.name === 'add' && <AddLetterScreen onBackPress={() => setScreen({ name: 'list' })} />}
      {screen.name === 'detail' && (
        <LetterDetailScreen
          letterId={screen.letterId}
          onBackPress={() => setScreen({ name: 'list' })}
        />
      )}
      <Text style={styles.marker}>BUILD #{BUILD_MARKER}</Text>
      <StatusBar style="auto" />
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
});

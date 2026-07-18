import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DB_NAME, initLetterDb } from './src/db';
import AddLetterScreen from './src/screens/AddLetterScreen';
import LetterDetailScreen from './src/screens/LetterDetailScreen';
import LetterListScreen from './src/screens/LetterListScreen';
import { letterIdFromParsedDeepLink } from './src/widgets/letter-deep-link';

// 이 숫자를 바꿔 저장하면 에뮬레이터 화면이 즉시 바뀝니다 (실시간 반영 증명용)
const BUILD_MARKER = 10;

/** 앱을 연 URL이 위젯 딥링크(sonpyeonji://letter/<id>, TSD.md 5.5)면 편지 id를 돌려준다. */
function letterIdFromUrl(url: string): string | null {
  try {
    const { hostname, path } = Linking.parse(url);
    return letterIdFromParsedDeepLink(hostname, path);
  } catch {
    return null; // 딥링크가 아닌(또는 못 읽는) URL이면 그냥 무시 — 평소 실행 흐름 유지
  }
}

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

  // 위젯 탭 딥링크 → 편지 상세로 진입 (TSD.md 5.5).
  // useLinkingURL() 훅 대신 getInitialURL + addEventListener를 직접 쓴다 —
  // 훅은 같은 문자열이면 리렌더가 없어서, 상세에서 뒤로 나온 뒤 같은 위젯을
  // 다시 탭했을 때(같은 URL 재수신) 화면 전환이 안 된다. 이벤트는 매번 온다.
  // (expo-linking SDK 57 — getInitialURL/addEventListener 시그니처는 설치본 소스 확인.)
  useEffect(() => {
    const openFromUrl = (url: string | null) => {
      if (!url) return;
      const letterId = letterIdFromUrl(url);
      if (letterId) setScreen({ name: 'detail', letterId });
    };
    // 앱이 꺼진 상태에서 위젯 탭으로 시작된 경우
    Linking.getInitialURL().then(openFromUrl, () => {});
    // 앱이 떠 있는(또는 백그라운드) 상태에서 위젯 탭으로 들어온 경우
    const subscription = Linking.addEventListener('url', (event) => openFromUrl(event.url));
    return () => subscription.remove();
  }, []);

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

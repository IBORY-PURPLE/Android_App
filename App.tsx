import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DB_NAME, initLetterDb } from './src/db';

// 이 숫자를 바꿔 저장하면 에뮬레이터 화면이 즉시 바뀝니다 (실시간 반영 증명용)
const BUILD_MARKER = 3;

// 로컬 DB가 실제로 열렸는지 화면에서 확인하는 한 줄 표시
function DbStatus() {
  const db = useSQLiteContext();
  const [status, setStatus] = useState('로컬 DB 여는 중…');

  useEffect(() => {
    db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM letter')
      .then((row) => setStatus(`로컬 DB 준비됨 · 편지 ${row?.n ?? 0}통`))
      .catch((e) => setStatus(`로컬 DB 오류: ${String(e)}`));
  }, [db]);

  return <Text style={styles.dbStatus}>{status}</Text>;
}

export default function App() {
  return (
    <SQLiteProvider databaseName={DB_NAME} onInit={initLetterDb}>
      <Home />
    </SQLiteProvider>
  );
}

function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🤖</Text>
      <Text style={styles.title}>안드로이드 개발환경 완료!</Text>
      <Text style={styles.subtitle}>Windows · 에뮬레이터 · SDK 57</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>실시간 반영</Text>
        <Text style={styles.cardText}>Windows에서 코딩 → 에뮬레이터에 즉시 반영</Text>
      </View>

      <Text style={styles.marker}>BUILD #{BUILD_MARKER}</Text>
      <DbStatus />
      <Text style={styles.hint}>
        이 화면이 에뮬레이터에 보이면{'\n'}Windows 안드로이드 개발 루프가 살아있는 겁니다.
      </Text>

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f5f3',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emoji: { fontSize: 64, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#1f2a24' },
  subtitle: { fontSize: 14, color: '#6b7a72', marginTop: 4, marginBottom: 28 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 22,
    alignItems: 'center',
    elevation: 2,
    marginBottom: 24,
  },
  cardLabel: { fontSize: 13, fontWeight: '700', color: '#2e8b6f', marginBottom: 6 },
  cardText: { fontSize: 14, color: '#3a3a3a' },
  marker: { fontSize: 18, fontWeight: '800', color: '#2e8b6f', marginBottom: 16 },
  dbStatus: { fontSize: 13, color: '#3a6b58', marginBottom: 16 },
  hint: { fontSize: 13, color: '#8a978f', textAlign: 'center', lineHeight: 20 },
});

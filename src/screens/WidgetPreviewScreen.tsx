import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  ONBOARDING_CAPTION_COLOR,
  ONBOARDING_CAPTION_FONT_SIZE,
  ONBOARDING_CAPTION_MARGIN_TOP,
  ONBOARDING_CAPTION_TEXT,
  ONBOARDING_TITLE_COLOR,
  ONBOARDING_TITLE_FONT_SIZE,
  ONBOARDING_TITLE_TEXT,
  WIDGET_BG_COLOR,
  WIDGET_BORDER_RADIUS,
  WIDGET_IMAGE_RADIUS,
  WIDGET_MIN_HEIGHT_DP,
  WIDGET_MIN_WIDTH_DP,
  WIDGET_PADDING,
} from '../widgets/letter-widget-design';
import {
  listLetterWidgetThumbnails,
  pickRandomLetterWidgetThumbnail,
  type LetterWidgetThumbnail,
} from '../widgets/letter-widget-thumbs';

type Props = {
  onBackPress: () => void;
};

/**
 * 위젯 미리보기 — LetterWidget 레이아웃을 앱 일반 화면에 복제 (TSD.md 5.6 ·
 * 기획서 3.9 완화 전략).
 *
 * 왜: 위젯 레이아웃 변경이 재빌드일 수 있어(기획서 3.9 최대 미확인 변수),
 * 디자인 반복은 이 화면의 Fast Refresh(1초)로 하고 개발 빌드는 최종 검증에만 쓴다.
 * 같은 풀(widget-thumbs/ 파일 목록)·같은 디자인 토큰(letter-widget-design.ts)을
 * 쓰므로 여기서 보이는 것이 곧 위젯이 그릴 것이다.
 *
 * 위젯 컴포넌트 ↔ RN 컴포넌트 대응 (LetterWidget.tsx와 나란히 유지):
 * - FlexWidget(center, bg, radius, padding) ↔ View (같은 토큰)
 * - ImageWidget(resizeMode "contain", radius) ↔ Image (같은 토큰)
 * - TextWidget(온보딩 2줄) ↔ Text (같은 토큰·같은 문구)
 * LetterWidget 자체는 여기서 렌더할 수 없다 — FlexWidget 등은 위젯 트리 전용
 * 컴포넌트(RN 뷰가 아님)이고, 라이브러리 로드가 Expo Go에서 throw할 수 있다
 * (index.ts 조건부 로드와 같은 이유). 그래서 토큰 공유로 정합을 지킨다.
 *
 * "다른 조각 뽑기"는 실제 위젯과 같은 pickRandomLetterWidgetThumbnail()을
 * 호출한다 — 30분 갱신 한 번과 같은 로직(최근 K개 제외 + 균등 랜덤, TSD.md 5.2)이라
 * 개발 빌드 없이 Expo Go에서 뽑기 동작까지 눈으로 확인된다. 이력 파일도 실제와
 * 공유한다(뽑기 = 갱신 한 번의 시뮬레이션 — DECISIONS_NEEDED 14).
 */
export default function WidgetPreviewScreen({ onBackPress }: Props) {
  const [thumbnail, setThumbnail] = useState<LetterWidgetThumbnail | null>(safePick);
  const [poolSize, setPoolSize] = useState<number>(safePoolSize);
  // 편지가 있어도 온보딩 카드(편지 0장 분기) 디자인을 확인할 수 있게 하는 강제 토글
  const [forceOnboarding, setForceOnboarding] = useState(false);

  const repick = () => {
    setThumbnail(safePick());
    setPoolSize(safePoolSize());
  };

  const showOnboarding = forceOnboarding || thumbnail === null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={onBackPress} hitSlop={8}>
        <Text style={styles.back}>← 편지함으로</Text>
      </Pressable>
      <Text style={styles.title}>위젯 미리보기</Text>
      <Text style={styles.description}>
        홈 화면 위젯과 같은 풀·같은 디자인 값으로 그려요. 디자인은 여기서 고치고,
        개발 빌드는 최종 확인에만 쓰면 돼요.
      </Text>

      {/* 홈 화면 배경 흉내 — 카드가 벽지 위에서 어떻게 보이는지 판단용 */}
      <View style={styles.wallpaper}>
        <View style={styles.widgetFrame}>
          {showOnboarding ? (
            <>
              <Text style={styles.onboardingTitle}>{ONBOARDING_TITLE_TEXT}</Text>
              <Text style={styles.onboardingCaption}>{ONBOARDING_CAPTION_TEXT}</Text>
            </>
          ) : (
            <Image
              source={{ uri: thumbnail.uri }}
              style={styles.widgetImage}
              resizeMode="contain"
            />
          )}
        </View>
      </View>
      <Text style={styles.frameCaption}>
        3×2 최소 크기 {WIDGET_MIN_WIDTH_DP}×{WIDGET_MIN_HEIGHT_DP}dp — 실제 홈 화면에선 더
        커질 수 있어요
      </Text>
      <Text style={styles.status}>
        풀 {poolSize}개 · 표시 중:{' '}
        {showOnboarding ? '온보딩 카드' : (thumbnail?.poolKey ?? '없음')}
      </Text>

      <Pressable style={styles.primaryButton} onPress={repick}>
        <Text style={styles.primaryButtonText}>다른 조각 뽑기</Text>
      </Pressable>
      <Text style={styles.buttonCaption}>
        뽑기 한 번 = 위젯 30분 갱신 한 번과 같은 로직이에요 (최근에 보인 조각은 제외)
      </Text>
      <Pressable
        style={styles.secondaryButton}
        onPress={() => setForceOnboarding((value) => !value)}
      >
        <Text style={styles.secondaryButtonText}>
          {forceOnboarding ? '조각 보기로 돌아가기' : '온보딩 카드(편지 0장) 보기'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

// 위젯 태스크 핸들러와 같은 후퇴: 파일 접근이 실패해도 화면이 깨지지 않게
// 온보딩 카드(null)로 후퇴한다(widget-task-handler.tsx와 같은 태도).
function safePick(): LetterWidgetThumbnail | null {
  try {
    return pickRandomLetterWidgetThumbnail();
  } catch {
    return null;
  }
}

function safePoolSize(): number {
  try {
    return listLetterWidgetThumbnails().length;
  } catch {
    return 0;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 40 },
  back: { fontSize: 15, color: '#2e8b6f', fontWeight: '600', marginBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', color: '#1f2a24', marginBottom: 8 },
  description: { fontSize: 13, color: '#6b7a72', lineHeight: 19, marginBottom: 20 },
  wallpaper: {
    backgroundColor: '#33413a',
    borderRadius: 20,
    paddingVertical: 32,
    alignItems: 'center',
  },
  // ── 여기부터가 위젯 복제 — LetterWidget.tsx와 같은 토큰만 쓴다 ──
  widgetFrame: {
    width: WIDGET_MIN_WIDTH_DP,
    height: WIDGET_MIN_HEIGHT_DP,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: WIDGET_BG_COLOR,
    borderRadius: WIDGET_BORDER_RADIUS,
    padding: WIDGET_PADDING,
  },
  widgetImage: {
    width: WIDGET_MIN_WIDTH_DP - WIDGET_PADDING * 2,
    height: WIDGET_MIN_HEIGHT_DP - WIDGET_PADDING * 2,
    borderRadius: WIDGET_IMAGE_RADIUS,
  },
  onboardingTitle: {
    fontSize: ONBOARDING_TITLE_FONT_SIZE,
    color: ONBOARDING_TITLE_COLOR,
  },
  onboardingCaption: {
    fontSize: ONBOARDING_CAPTION_FONT_SIZE,
    color: ONBOARDING_CAPTION_COLOR,
    marginTop: ONBOARDING_CAPTION_MARGIN_TOP,
  },
  // ── 위젯 복제 끝 ──
  frameCaption: { fontSize: 12, color: '#8a978f', marginTop: 8 },
  status: { fontSize: 12, color: '#6b7a72', marginTop: 4, marginBottom: 20 },
  primaryButton: {
    backgroundColor: '#2e8b6f',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  buttonCaption: { fontSize: 12, color: '#8a978f', marginTop: 6, marginBottom: 14 },
  secondaryButton: {
    borderColor: '#2e8b6f',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#2e8b6f', fontSize: 14, fontWeight: '600' },
});

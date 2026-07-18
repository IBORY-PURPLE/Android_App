// React Compiler가 켜진 빌드에서 위젯 순수 함수가 자동 메모이제이션되는 것을 막는다
// (react-native-android-widget 공식 문서 권장 — 위젯은 훅 없는 순수 함수여야 한다).
'use no memo';

import React from 'react';
import {
  FlexWidget,
  ImageWidget,
  TextWidget,
  type ImageWidgetSource,
} from 'react-native-android-widget';

import { letterDetailDeepLinkUri } from './letter-deep-link';
import type { LetterWidgetThumbnail } from './letter-widget-thumbs';

const PADDING = 12;

export type LetterWidgetProps = {
  /** 표시할 썸네일(경로 + 편지 id). null이면 편지 0장 → 온보딩 카드. */
  thumbnail: LetterWidgetThumbnail | null;
  /** 위젯 실제 크기(dp) — widgetTaskHandler의 widgetInfo.width/height에서 받는다. */
  widthDp: number;
  heightDp: number;
};

/**
 * 홈 화면 위젯 — 저장된 편지 이미지 1장 표시 (react-native-android-widget).
 *
 * - 편지가 1장이라도 있으면 언제나 손글씨 이미지를 그린다(원칙 1 — 손글씨 물성 보존).
 *   텍스트가 뜨는 것은 편지 0장 온보딩 카드뿐이다(TSD.md 5.3 · 기획서 2.5 빈 상태 규칙).
 * - resizeMode="contain": 종횡비 유지, 넘치면 잘림 금지 → 축소 우선(TSD.md 5.4).
 * - 지금은 편지 원본의 통짜 썸네일. 2단계 세그멘테이션이 끝나면 같은 자리에
 *   문장/줄 조각 썸네일이 들어온다(TSD.md 4.6 — 모드 전환은 이미지 선택일 뿐).
 *
 * 위젯 탭(TSD.md 5.5):
 * - 썸네일 분기: clickAction "OPEN_URI" + sonpyeonji://letter/<id> → 표시 중인 편지의
 *   상세로 딥링크. 네이티브가 ACTION_VIEW 인텐트로 바로 처리하며 JS의 WIDGET_CLICK은
 *   발생하지 않는다(설치본 RNWidgetProvider.java onReceive · click-action.ts 실측).
 * - 온보딩 분기: clickAction "OPEN_APP" → 앱만 연다(첫 편지 담기로 유도).
 * - 위젯 위에 별표 등 다른 버튼은 놓지 않는다(TSD.md 5.5 — 오조작 방지·의도적 행위 보존,
 *   결정 9 '능동 반응만'·결정 10 '별표 = 단일 제스처').
 *
 * ImageWidget 실측 근거(설치본 소스):
 * - imageWidth/imageHeight는 dp 단위로 이미지 표시 크기를 정한다
 *   (android/.../builder/widget/ImageWidget.java — dpToPx 변환).
 * - image의 TS 타입(ImageWidgetSource)에는 file:이 없지만, 네이티브 로더는
 *   file:// 경로를 명시 지원한다(android/.../utils/ResourceUtils.java getBitmap —
 *   BitmapFactory.decodeFile 분기). 그래서 캐스트로 넘긴다.
 */
export function LetterWidget({ thumbnail, widthDp, heightDp }: LetterWidgetProps) {
  // 주의: 위젯 트리 빌더는 React Fragment(<>...</>)를 지원하지 않는다
  // (설치본 src/api/build-widget-tree.ts — type이 함수인 위젯 컴포넌트만 순회).
  // 그래서 분기마다 FlexWidget 루트를 통째로 반환한다.
  if (thumbnail !== null) {
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#FFF9F2',
          borderRadius: 16,
          padding: PADDING,
        }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: letterDetailDeepLinkUri(thumbnail.letterId) }}
        accessibilityLabel="손편지 위젯 — 탭하면 이 편지를 열어요"
      >
        <ImageWidget
          image={thumbnail.uri as ImageWidgetSource}
          imageWidth={Math.max(1, widthDp - PADDING * 2)}
          imageHeight={Math.max(1, heightDp - PADDING * 2)}
          resizeMode="contain"
          radius={8}
        />
      </FlexWidget>
    );
  }

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF9F2',
        borderRadius: 16,
        padding: PADDING,
      }}
      clickAction="OPEN_APP"
      accessibilityLabel="손편지 위젯 — 탭하면 앱을 열어요"
    >
      <TextWidget
        text="첫 편지를 기다리는 중"
        style={{
          fontSize: 15,
          color: '#8A6D5B',
        }}
      />
      <TextWidget
        text="편지를 스캔하면 여기에 손글씨가 떠요"
        style={{
          fontSize: 12,
          color: '#B49A87',
          marginTop: 6,
        }}
      />
    </FlexWidget>
  );
}

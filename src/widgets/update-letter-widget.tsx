import React from 'react';

import { pickRandomLetterWidgetThumbnailUri } from './letter-widget-thumbs';

/**
 * 앱 화면에서 홈 위젯 갱신을 요청한다 — 새 편지 저장·편지 삭제 직후 호출
 * (TSD.md 5.1 "새 편지 스캔 시 즉시 반영").
 *
 * index.ts와 같은 조건부 분리 로드: react-native-android-widget은 Expo Go에
 * 네이티브 모듈이 없어 로드가 throw할 수 있으므로, 지연 require + try/catch로
 * 감싼 no-op 안전 함수로 만든다 — Expo Go 앱 본체는 그대로 돈다.
 * (타입은 `typeof import(...)` 캐스트로만 쓴다 — 런타임에는 지워진다.)
 */
export function updateLetterWidgetSafe(): void {
  try {
    const { requestWidgetUpdate } =
      require('react-native-android-widget') as typeof import('react-native-android-widget');
    const { LetterWidget } =
      require('./LetterWidget') as typeof import('./LetterWidget');

    requestWidgetUpdate({
      widgetName: 'Letter',
      renderWidget: (widgetInfo) => {
        let thumbnailUri: string | null = null;
        try {
          thumbnailUri = pickRandomLetterWidgetThumbnailUri();
        } catch {
          thumbnailUri = null;
        }
        return (
          <LetterWidget
            thumbnailUri={thumbnailUri}
            widthDp={widgetInfo.width}
            heightDp={widgetInfo.height}
          />
        );
      },
    }).catch(() => {
      // 위젯 갱신 실패는 치명 아님 — 다음 updatePeriodMillis 갱신에서 따라잡는다.
    });
  } catch {
    // Expo Go 등 위젯 네이티브 모듈이 없는 환경 — 아무것도 하지 않는다.
  }
}

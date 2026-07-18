import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { LetterWidget } from './LetterWidget';
import { pickRandomLetterWidgetThumbnailUri } from './letter-widget-thumbs';

// app.json의 react-native-android-widget plugin 설정 widgets[].name과 1:1 매핑.
const nameToWidget = {
  Letter: LetterWidget,
} as const;

/**
 * 위젯 태스크 핸들러 — 안드로이드가 위젯 이벤트(추가/갱신/리사이즈)를 보낼 때
 * 헤드리스 태스크로 호출된다. index.ts에서 registerWidgetTaskHandler로 등록.
 *
 * 표시 내용: widget-thumbs/ 폴더에서 랜덤 썸네일 1개(기획서 결정 4 '볼 때마다 랜덤' —
 * 30분 updatePeriodMillis 갱신마다 새로 뽑는 근사, TSD.md 5.1). 위젯 프로세스는
 * expo-sqlite를 쓰지 않는다 — DB 대신 파일 목록이 곧 표시 풀이다(TSD.md 1.4).
 *
 * 위젯 탭(WIDGET_CLICK) → 편지 상세 딥링크는 TSD.md 5.5의 다음 증분.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const Widget =
    nameToWidget[props.widgetInfo.widgetName as keyof typeof nameToWidget];

  if (!Widget) {
    return;
  }

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      // 헤드리스 컨텍스트에서 파일 접근이 실패해도 위젯이 빈칸이 되지 않게
      // 온보딩 카드로 후퇴한다(기획서 2.5 빈 상태 규칙).
      let thumbnailUri: string | null = null;
      try {
        thumbnailUri = pickRandomLetterWidgetThumbnailUri();
      } catch {
        thumbnailUri = null;
      }
      props.renderWidget(
        <Widget
          thumbnailUri={thumbnailUri}
          widthDp={props.widgetInfo.width}
          heightDp={props.widgetInfo.height}
        />
      );
      break;
    }
    case 'WIDGET_DELETED':
    case 'WIDGET_CLICK':
      // 지금은 할 일 없음 (탭 딥링크는 TSD.md 5.5 — 다음 증분)
      break;
  }
}

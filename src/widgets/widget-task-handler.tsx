import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { LetterWidget } from './LetterWidget';

// app.json의 react-native-android-widget plugin 설정 widgets[].name과 1:1 매핑.
const nameToWidget = {
  Letter: LetterWidget,
} as const;

/**
 * 위젯 태스크 핸들러 — 안드로이드가 위젯 이벤트(추가/갱신/리사이즈)를 보낼 때
 * 헤드리스 태스크로 호출된다. index.ts에서 registerWidgetTaskHandler로 등록.
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
    case 'WIDGET_RESIZED':
      props.renderWidget(<Widget />);
      break;
    case 'WIDGET_DELETED':
    case 'WIDGET_CLICK':
      // 지금은 할 일 없음 (탭 딥링크는 TSD.md 5.5 — 다음 증분)
      break;
  }
}

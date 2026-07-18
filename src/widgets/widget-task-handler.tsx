import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { LetterWidget } from './LetterWidget';
import {
  pickRandomLetterWidgetThumbnail,
  type LetterWidgetThumbnail,
} from './letter-widget-thumbs';

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
 * 위젯 탭(TSD.md 5.5)은 LetterWidget이 clickAction OPEN_URI(편지 상세 딥링크) /
 * OPEN_APP(온보딩 카드)으로 처리한다 — 둘 다 네이티브가 인텐트로 직접 실행하므로
 * 이 핸들러의 WIDGET_CLICK에는 도달하지 않는다(설치본 RNWidgetProvider.java 실측).
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
      let thumbnail: LetterWidgetThumbnail | null = null;
      try {
        thumbnail = pickRandomLetterWidgetThumbnail();
      } catch {
        thumbnail = null;
      }
      props.renderWidget(
        <Widget
          thumbnail={thumbnail}
          widthDp={props.widgetInfo.width}
          heightDp={props.widgetInfo.height}
        />
      );
      break;
    }
    case 'WIDGET_DELETED':
    case 'WIDGET_CLICK':
      // 할 일 없음 — 탭은 OPEN_URI/OPEN_APP으로 네이티브가 처리(위 주석),
      // 커스텀 clickAction을 쓰기 전까지 WIDGET_CLICK은 오지 않는다.
      break;
  }
}

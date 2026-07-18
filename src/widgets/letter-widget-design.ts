/**
 * LetterWidget 디자인 토큰 — 위젯(LetterWidget.tsx)과 앱 안 미리보기
 * (WidgetPreviewScreen.tsx)가 같은 값을 쓴다.
 *
 * 왜 한곳에 모으나 (TSD.md 5.6 · 기획서 3.9 완화 전략): 위젯 레이아웃 변경이
 * 재빌드(12~20분)일 수 있어, 디자인 반복은 앱 화면 미리보기의 Fast Refresh(1초)로
 * 하고 빌드는 최종 검증에만 쓴다. 값이 갈라지면 미리보기가 거짓말을 하므로
 * 색·여백·글자 크기·문구를 이 모듈 하나에서만 정한다.
 *
 * 순수 상수 모듈 — 네이티브 모듈 import 없음. 위젯 헤드리스 컨텍스트와
 * Expo Go 어디서나 안전하다.
 */

/** 위젯 카드 배경 (따뜻한 편지지 톤) */
export const WIDGET_BG_COLOR = '#FFF9F2';
export const WIDGET_BORDER_RADIUS = 16;
export const WIDGET_PADDING = 12;
/** 손글씨 썸네일 이미지의 모서리 반경 */
export const WIDGET_IMAGE_RADIUS = 8;

// 편지 0장 온보딩 카드 (TSD.md 5.3 · 기획서 2.5 빈 상태 규칙)
export const ONBOARDING_TITLE_TEXT = '첫 편지를 기다리는 중';
export const ONBOARDING_TITLE_FONT_SIZE = 15;
export const ONBOARDING_TITLE_COLOR = '#8A6D5B';
export const ONBOARDING_CAPTION_TEXT = '편지를 스캔하면 여기에 손글씨가 떠요';
export const ONBOARDING_CAPTION_FONT_SIZE = 12;
export const ONBOARDING_CAPTION_COLOR = '#B49A87';
export const ONBOARDING_CAPTION_MARGIN_TOP = 6;

/**
 * app.json 위젯 구성(3×2 셀)의 최소 크기 dp — DECISIONS_NEEDED 4.
 * 실제 위젯은 이것보다 커질 수 있다(widgetInfo.width/height로 렌더 시점에 받음).
 * 미리보기는 이 최소 크기(= 디자인이 가장 빡빡한 경우)로 그린다.
 */
export const WIDGET_MIN_WIDTH_DP = 180;
export const WIDGET_MIN_HEIGHT_DP = 110;

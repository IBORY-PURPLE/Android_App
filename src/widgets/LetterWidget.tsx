// React Compiler가 켜진 빌드에서 위젯 순수 함수가 자동 메모이제이션되는 것을 막는다
// (react-native-android-widget 공식 문서 권장 — 위젯은 훅 없는 순수 함수여야 한다).
'use no memo';

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

/**
 * 홈 화면 위젯 — 3단계 최소 구성 (react-native-android-widget).
 *
 * 지금은 빈 위젯 온보딩 카드만 그린다(TSD.md 5.3 — 편지 0장이어도 첫인상이
 * 빈칸이 되지 않게. 기획서 P0 '빈 위젯 첫인상 처리').
 *
 * TODO(3단계 다음 증분): 저장된 편지 이미지 1장 랜덤 표시 — 기획서 결정 4(볼 때마다 랜덤).
 * - 위젯 프로세스는 expo-sqlite를 직접 못 쓰므로, 앱이 저장 시점에 만들어 두는
 *   위젯용 다운스케일 썸네일(TSD.md 1.4 공유 저장소·5.4 위젯 메모리 예산)을
 *   ImageWidget의 로컬 파일 경로로 읽는 구조로 간다.
 * - 원칙 1(손글씨 물성 보존): 편지가 1장이라도 있으면 언제나 손글씨 이미지를 그린다.
 *   텍스트가 뜨는 것은 편지 0장 온보딩 카드뿐이다.
 */
export function LetterWidget() {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF9F2',
        borderRadius: 16,
        padding: 12,
      }}
      accessibilityLabel="손편지 위젯"
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

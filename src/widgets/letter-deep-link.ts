/**
 * 위젯 탭 → 편지 상세 딥링크 (TSD.md 5.5).
 *
 * 위젯(썸네일 분기)이 만드는 URI와 앱(App.tsx)이 되읽는 규칙을 한곳에 둔다.
 * 이 모듈은 의도적으로 expo-linking을 import하지 않는다 — 위젯 헤드리스 컨텍스트에서도
 * 안전한 순수 문자열 규칙만 담고, URL 파싱은 앱 쪽(App.tsx)이 expo-linking으로 한다.
 *
 * 스킴 `sonpyeonji`는 app.json의 `expo.scheme`과 반드시 일치해야 한다
 * (prebuild가 이 값으로 안드로이드 인텐트 필터를 만든다 — DECISIONS_NEEDED 6).
 */

export const APP_SCHEME = 'sonpyeonji';

/** 위젯에 표시 중인 편지의 상세 화면으로 들어가는 딥링크 URI. */
export function letterDetailDeepLinkUri(letterId: string): string {
  return `${APP_SCHEME}://letter/${letterId}`;
}

/**
 * expo-linking의 Linking.parse 결과(hostname·path)에서 편지 id를 꺼낸다.
 * 파싱 형태는 설치본 expo-linking 소스(createURL.ts parse)로 실측했다:
 * - 개발 빌드 `sonpyeonji://letter/<id>` → hostname 'letter', path '<id>'
 * - Expo Go `exp://<호스트>/--/letter/<id>` → hostname null, path 'letter/<id>'
 * 두 형태를 모두 받도록 hostname+path를 합쳐 조각으로 나눠 본다.
 * 딥링크가 아니면(경로가 letter/<id> 꼴이 아니면) null.
 */
export function letterIdFromParsedDeepLink(
  hostname: string | null,
  path: string | null
): string | null {
  const segments = `${hostname ?? ''}/${path ?? ''}`.split('/').filter(Boolean);
  if (segments.length === 2 && segments[0] === 'letter') {
    return segments[1];
  }
  return null;
}

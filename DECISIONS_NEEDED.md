# DECISIONS_NEEDED — 사람 판단이 필요해 루프가 건너뛴 것들

> 루프가 임의로 정하지 않고 기록만 한다. 각 항목: 무엇이 막혔나 / 왜 루프에서 못 정하나 / 루프가 대신 한 것.

## 1. 0단계 파이프라인 검증용 실물 편지 사진 (★차단 — 2단계 실제 구현의 전제)

- **무엇:** 개발계획.md 0단계는 실제 손편지 20~30장 사진으로 OpenCV 줄 분할을 검증해야 한다. 실물 편지 사진이 없어 루프에서 수행 불가.
- **왜 못 정하나:** 실물 편지 + 사람(사진 촬영)이 필요.
- **루프가 대신 한 것:** 1단계(앱 골격)를 먼저 진행하고, 2단계 OpenCV는 인터페이스·TODO 뼈대까지만 만든다(overnight_task.md '이번 루프의 범위'와 일치).

## 2. 실사용 안드로이드 기기 (개발계획.md 부록 [결정 필요] 승계)

- **무엇:** 완성 앱을 실제로 돌릴 안드로이드 기기(여자친구 폰 기종 등) 미정.
- **왜 못 정하나:** 사람 확인 필요. 루프 작업(에뮬레이터 개발)에는 지장 없음 — 기록만.

## 3. `expo-widgets` 안드로이드 미지원 확정 — 3단계 위젯은 Glance 네이티브 직접 작성으로 후퇴 (이터레이션 10 실측)

- **무엇:** TSD.md 부록 A의 ★차단 항목 "`expo-widgets` 안드로이드(Glance) 지원 존재 여부"를 문서로 실측했다. 결과: **안드로이드 미지원 확정.**
  - **공식 문서** (https://docs.expo.dev/versions/v57.0.0/sdk/widgets/): 지원 플랫폼이 **iOS뿐**(`platforms: ['ios']`). 소개 문구도 "A library to build **iOS** home screen widgets and Live Activities". 본문 전체에 안드로이드·Jetpack Glance(안드로이드의 Compose 기반 홈 화면 위젯 툴킷) 언급 0회. 위젯 크기도 iOS 전용(`systemSmall`/`systemMedium`/`systemLarge`/잠금화면)만. "This library is not available in the Expo Go app" 명시(네이티브 모듈 — 개발 빌드 필요).
  - **npm 레지스트리:** `expo-widgets` 57.x는 57.0.0~57.0.6이 존재하나, iOS 전용이라는 문서 사실을 뒤집는 근거 없음.
- **왜 루프에서 못 정하나:** 후퇴 경로 채택은 아키텍처 결정 + TSD.md 5장(위젯) 문서 개정이 걸린 사람 판단. **권장 후퇴 경로(TSD.md 부록 A에 이미 명시): Jetpack Glance 네이티브 위젯 직접 작성** — Expo prebuild로 생성되는 `android/` 폴더에 Kotlin + Glance 코드를 얹고, 개발 빌드(`npx expo run:android`)로 확인. 위젯 코드는 앱 자바스크립트 번들 밖(네이티브)이므로 Expo Go로 도는 앱 본체와 자연 분리된다.
- **루프가 대신 한 것:** `expo-widgets`를 **설치하지 않았다**(iOS 전용 네이티브 모듈 — 넣어도 안드로이드에서 무의미하고 Expo Go 범위만 깨짐). 실측 결과만 기록하고 후보 ②(1단계 마무리 점검 + MORNING_REPORT.md 갱신)로 전환. 3단계 자리 표시(TODO 문서 파일)는 Glance 네이티브 전제로 다음 반복 후보에 남김.
- **채택(자율, 이터레이션 11 — 규칙 v2 자율 결정 모드):** 후퇴 경로로 **`react-native-android-widget` 라이브러리를 채택**하고 설치했다(Kotlin Glance 직접 작성 대신). **근거(실측):**
  - npm: 최신 0.21.0(2026-07-11 갱신), peerDependencies `expo: '>=54.0.0'` → **SDK 57 충족**.
  - 공식 문서(saleksovski.github.io/react-native-android-widget): **신아키텍처(New Architecture) 지원 명시**, RN 0.76+ 지원(현재 0.86.0), Expo는 config plugin 제공(개발 빌드 필요 — Expo Go에는 네이티브 모듈 없음).
  - 설치본 소스 실측: 위젯 등록(`registerWidgetTaskHandler`)은 순수 JS(`AppRegistry.registerHeadlessTask`)이고, 네이티브 모듈 부재 시 로드가 throw할 수 있는 경로가 있어 index.ts에서 **try/catch + 지연 require 조건부 로드**로 분리 — Expo Go 앱 본체 불변.
  - 기획서 원칙 6(혼자 출시 가능한 최소 제품): 위젯 레이아웃을 TSX로 유지 — Kotlin/Glance 학습·prebuild 커스텀 코드 없이 위젯 구현 가능. 안 되면 그때 Glance 네이티브로 후퇴(원 경로 유지).
  - TSD.md 5장은 "Jetpack Glance 직접" 전제로 서술돼 있어 **개정 필요**(라이브러리 내부는 RemoteViews 기반 — 5장 제목·1.4 공유 저장소 서술 손질). 사람 리뷰 대상으로 남김.

## 4. 안드로이드 앱 패키지 이름 — `com.theone.sonpyeonji` 채택(자율, 이터레이션 11)

- **무엇:** react-native-android-widget config plugin이 prebuild 시 `android.package`를 요구한다(없으면 throw — 설치본 plugin 소스 실측). app.json에 `android.package`가 없었다.
- **채택(자율):** `"com.theone.sonpyeonji"` — 작업 공간 이름(TheOne) + 프로젝트 별칭(sonpyeonji, MORNING_REPORT에서 사용 중). **Play 제출 전까지는 자유롭게 변경 가능**(제출하면 영구 고정) — 범위 밖(제출 금지)이므로 지금은 임시 식별자 성격. 사람 확인 후 바꾸려면 app.json 한 줄 수정이면 된다.
- **부수 채택(자율) — 위젯 최소 구성값:** 크기 3×2 셀(minWidth 180dp × minHeight 110dp) — 기획서 3.2.3 "[결정 필요] 위젯 크기: Medium 이상 권장"의 안드로이드 대응. `updatePeriodMillis` 1800000(30분) — 안드로이드 시스템 최솟값이자 TSD.md 5.1 "[결정 필요] 엔트리 간격 15/30/60분"의 중간값. 둘 다 위젯 실기 확인(개발 빌드) 때 재조정 가능.

## 5. 위젯 썸네일 규격·이미지 로드 방식 — 채택(자율, 이터레이션 12)

- **무엇:** 위젯에 저장 편지 이미지를 랜덤 표시하려면 ① 위젯이 읽는 저장 위치·썸네일 규격(TSD.md 1.4의 "[결정 필요] 위젯이 읽는 정확한 저장 위치")과 ② 이미지 전달 방식(TSD.md 5.4의 "[결정 필요] ImageProvider 로컬 파일 로드 방식"의 라이브러리 대응)을 정해야 했다.
- **채택(자율) — 썸네일 공유 저장소:** 앱 문서 폴더 `widget-thumbs/<letterId>.jpg`. 앱이 편지 저장 시점에 **최대 가로 720px·JPEG 품질 0.85**로 다운스케일해 만들고(expo-image-manipulator, 원본이 더 작으면 업스케일 안 함), 위젯 태스크 핸들러는 이 폴더의 파일 목록에서 랜덤 1개를 고른다 — **위젯 쪽에서 expo-sqlite를 쓰지 않는다**(파일 목록 = 표시 풀, TSD.md 1.4 취지). **근거:** 3×2 셀 minWidth 180dp는 고밀도(~3x) 화면에서 ~540px — 720px면 리사이즈 여유 포함 충분하고 위젯 메모리 예산(TSD.md 5.4 "원본 고해상도 로드 금지")을 지킨다. 실기 확인 때 재조정 가능.
- **채택(자율) — `file://` 경로 전달:** `ImageWidget`의 TS 타입(`ImageWidgetSource`)에는 `file:`이 없지만, **네이티브 로더가 `file://`을 명시 지원함을 설치본 소스로 실측**(android/.../utils/ResourceUtils.java `getBitmap` — `BitmapFactory.decodeFile` 분기). 캐스트로 넘긴다. **주의:** 문서에 없는 타입 밖 경로이므로 라이브러리 업데이트 때 이 분기가 유지되는지 재확인할 것.
- **미룬 것:** TSD.md 5.2 "직전 표시 즉시 재노출 방지(최근 K개 제외)"는 이번 증분에서 **균등 랜덤만** 구현 — 최근 표시 이력 저장(로컬 전용·동기화 금지, 원칙 4)이 필요해 다음 증분으로.

## 6. 위젯 탭 딥링크 스킴·URI 형식 — 채택(자율, 이터레이션 13)

- **무엇:** TSD.md 5.5(위젯 탭 → 편지 상세 딥링크)를 구현하려면 ① 앱 스킴(app.json `expo.scheme`) ② 딥링크 URI 형식 ③ TSD가 전제한 Glance `actionStartActivity`의 react-native-android-widget 대응 방식을 정해야 했다.
- **채택(자율) — 스킴 `sonpyeonji`:** app.json에 `"scheme": "sonpyeonji"` 추가(prebuild가 이 값으로 안드로이드 인텐트 필터를 만든다 — 위젯과 같이 개발 빌드 필요). **근거:** 패키지 이름 `com.theone.sonpyeonji`(항목 4)와 정합. Play 제출 전까지 자유롭게 변경 가능 — 바꾸면 app.json과 `src/widgets/letter-deep-link.ts`의 `APP_SCHEME` 두 곳만 고치면 된다.
- **채택(자율) — URI `sonpyeonji://letter/<letterId>` + `clickAction "OPEN_URI"`:** 설치본 실측 — RNWidgetProvider.java(onReceive)가 OPEN_URI를 `ACTION_VIEW` 인텐트로 **네이티브에서 직접 실행**하며 JS의 WIDGET_CLICK은 발생하지 않는다(click-action.ts 주석과 일치). 이것이 TSD 5.5 "Glance actionStartActivity"의 이 라이브러리 대응이다. 편지 0장 온보딩 카드는 `"OPEN_APP"`(앱만 열기 → 첫 편지 담기 유도). 위젯 위에 별표 등 다른 버튼은 두지 않음(TSD 5.5 그대로).
- **채택(자율) — 앱 쪽 수신은 expo-linking(57.0.3, Expo Go 내장) `getInitialURL` + `addEventListener('url')` 직접 구독:** `useLinkingURL()` 훅은 내부 setState라 **같은 URL을 다시 받아도 리렌더가 없어**(상세 → 뒤로 → 같은 위젯 재탭이 무시됨) 훅 대신 이벤트 직접 구독. `Linking.parse()` 동작은 설치본 소스(createURL.ts)로 실측 — 개발 빌드 `sonpyeonji://letter/<id>` → hostname 'letter'/path '<id>', Expo Go `exp://…/--/letter/<id>` → hostname null/path 'letter/<id>'. 두 형태를 모두 `letterIdFromParsedDeepLink`가 처리한다.
- **주의(실기 확인 필요):** 위젯의 딥링크 URI는 **위젯 렌더 시점에 굳는다** — 탭 시점이 아니라 마지막 렌더 때 표시된 편지의 상세로 연결된다(다음 30분 갱신/저장·삭제 갱신 전까지는 화면에 보이는 그 편지와 일치하므로 의도된 동작). 개발 빌드에서 위젯 탭 → 그 편지 상세가 뜨는지 사람 확인 필요.

## 7. 위젯 랜덤의 최근 제외 K 값·이력 저장 방식 — 채택(자율, 이터레이션 14)

- **무엇:** TSD.md 5.2(최근 K개 제외 + 균등 랜덤)를 구현하려면 ① K 값(기획서 2.5는 K를 정하지 않음) ② 최근 표시 이력의 저장 위치·형식을 정해야 했다.
- **채택(자율) — K = 3, 풀 크기에 맞춰 `min(K, 풀 크기 − 1)` 자동 축소:** 30분 `updatePeriodMillis` 갱신 기준 같은 편지가 대략 2시간 안에 다시 안 뜨는 정도. 편지 2장이면 직전 1장만 제외(교대 노출), 1장이면 제외 0(반복 허용 — TSD.md 5.3 "의도된 반복"). 상수 하나(`RECENT_EXCLUDE_K`)라 실기 확인 후 재조정이 쉽다. TSD 5.2의 "직전 표시 조각의 즉시 재노출만 막는다" 취지(가중치 등 과설계 금지) 안에서 최소 구현.
- **채택(자율) — 이력은 문서 폴더 루트의 JSON 파일 `widget-recent-letters.json`:** 위젯 헤드리스 컨텍스트는 expo-sqlite를 쓰지 않기로 했으므로(항목 5 — 파일 목록 = 표시 풀) 이력도 같은 원칙으로 expo-file-system 파일에 둔다(새 의존성 0). `widget-thumbs/` 폴더 안에 두면 파일 목록이 곧 표시 풀이라 썸네일로 오인되므로 **문서 폴더 루트**에 둔다. `File.write`가 없는 파일을 만들어 줌은 네이티브 소스(FileSystemFile.kt `if (!exists) create()`)로 실측. 이력이 깨지면 빈 이력으로 취급, 기록 실패는 표시를 막지 않는다(둘 다 try/catch).
- **★로컬 전용·동기화 금지(TSD.md 5.2 계약):** 이 이력은 랜덤 품질 개선용일 뿐이다. 클라우드 업로드·상대 동기화 금지 — 새어나가면 '읽음 확인'이 되어 원칙 4(관찰하지 않는다) 위반. 코드 주석에 같은 문구로 못박음.
- **부수 효과:** 이력에 있는 id가 풀에 없으면(편지 삭제 등) 읽을 때 걸러진다 — 삭제 쪽 코드 변경 없음.

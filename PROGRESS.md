# PROGRESS — 밤샘 자율 루프 진행 기록

> 매 반복 시작 시 이 파일부터 읽는다. 규칙·범위는 overnight_task.md, 제품 결정은 ..\기획서.md, 실행 계획은 ..\개발계획.md.

**반복 횟수(검증 통과 커밋 기준): 15**

---

## 이터레이션 15 — react-native-fast-opencv 실측 → 채택 + segmentLetterImage 파이프라인 기본 구현 (2026-07-18)

**한 일**
- 이터레이션 14의 다음 후보 ① 채택: **스코프 v2 (2) — `react-native-fast-opencv` 호환 실측(2단계 최대 리스크) → 긍정 → 설치 + 파이프라인 기본 구현.**
- 문서 실측(코드 작성 전): npm 0.4.8(2026-02 갱신, peer `react-native: '*'` → RN 0.86 충돌 없음), 공식 문서 "New architecture ready"(JSI), 설치본 `codegenConfig`(Turbo Module) 확인. **주의 실측:** 설치본 index.tsx가 top-level에서 `global.__loadOpenCV()` 실행 — **Expo Go에서는 모듈 로드 자체가 throw** → `segmentLetterImage` 내부 지연 require + try/catch(index.ts 위젯 패턴)로 분리, 앱 본체·게이트 불변. `npx expo install react-native-fast-opencv`(0.4.8, config plugin·app.json 변경 없음 — 오토링킹).
- `src/segmentation.ts`: 뼈대(이터레이션 9) → **TSD.md 4.1 단계 그대로 기본 구현**: `base64ToMat`(imdecode IMREAD_UNCHANGED — 채널 수 맞춰 cvtColor) → `adaptiveThreshold`(GAUSSIAN·BINARY_INV) → 표시용 cleanedFull은 `bitwise_not` → 수평 `dilate`(25×3) → `findContours`(RETR_EXTERNAL) → `boundingRect` → 노이즈 필터(높이 1%·너비 5% 미만 제거) → y 정렬 → `crop` + `saveMatToFile`(캐시 `segmentation/<id>/`, file:// 접두사 네이티브 처리 실측) → **finally에서 `clearBuffers`**(TSD.md 4.4). 산출 타입(TSD.md 6.3 매핑)은 그대로. 모든 invoke 시그니처·enum 값은 설치본 소스로 확인.
- **파라미터는 전부 임시 초기값 상수** — 0단계 확정값으로 교체용(실물 튜닝 안 함 — ★차단 유지). 문장 승격(6단계)·위젯 썸네일 연결(7단계)·투영 프로파일 보조는 TODO로 명시. 호출부는 아직 없음(수동 보정 UI가 다음). DECISIONS_NEEDED.md 항목 8 신설.

**검증 결과 (게이트 3종)**
- `npx tsc --noEmit` — 통과 (에러 0)
- `npx expo-doctor` — 통과 (20/20 checks)
- `npx expo export -p android` — 통과 (번들 무에러, 683 modules)

**커밋:** (이 커밋) feat: react-native-fast-opencv 채택 + segmentLetterImage 파이프라인 기본 구현

**사람이 눈으로 볼 것 (실기 확인 필요):** ① **개발 빌드(`npx expo run:android`)가 RN 0.86에서 네이티브 컴파일에 성공하는지** — 라이브러리 자체 테스트는 RN 0.79 기준이라 문서 실측만으로 확정 불가(2단계 최대 리스크의 남은 부분). ② 개발 빌드에서 합성/샘플 이미지로 `segmentLetterImage` 스모크 — 줄 상자가 나오는지, cleanedFull이 흰 종이·검은 글씨로 보이는지. ③ Expo Go에서 앱 본체가 평소대로 돌고 콘솔 에러 0인지(이 함수는 호출부가 없어 영향 없어야 정상).

**다음 후보 (작은 순)**
1. 세그멘테이션 보정 UI 뼈대(기획서 2.6·TSD.md 4.5) 1보 — LetterDetailScreen '한 줄씩' 자리 화면을 "세그멘테이션 실행(개발 빌드 전용)" 진입점으로 교체, 결과 조각을 목록으로 보여주기(보정 액션은 다음). Expo Go에선 안내 문구 후퇴.
2. segment·asset(kind='cleanedFull'/'segmentCrop') 테이블 추가(src/db.ts — TSD.md 6.3) + 확정 산출물 문서 폴더 이동.
3. TSD.md 5장 개정(react-native-android-widget 전제로) — 사람 승인 후.

---

## 이터레이션 14 — 위젯 랜덤에 직전 재노출 방지 (최근 K개 제외 — TSD.md 5.2) (2026-07-18)

**한 일**
- 이터레이션 13의 다음 후보 ① 채택: **TSD.md 5.2 "최근 K개 제외 + 균등 랜덤"**(기획서 2.5 "직전 표시 문장 즉시 재노출 방지").
- 코드 작성 전 실측: expo-file-system SDK 57 설치본 타입에서 `File.textSync(): string`(동기 읽기)·`File.write(content: string): void`(동기 쓰기) 확인, `write`가 없는 파일을 만들어 줌은 네이티브 소스(FileSystemFile.kt `if (!exists) create()`)로 확인. **새 의존성 0.**
- `letter-widget-thumbs.ts`의 `pickRandomLetterWidgetThumbnail()` 확장:
  - 최근 표시 이력을 문서 폴더 루트 `widget-recent-letters.json`에 기록(최신이 앞). `widget-thumbs/` 안에 두면 파일 목록(= 표시 풀)에 섞여서 루트에 둠.
  - **K = 3 채택(자율)** — 30분 갱신 기준 ~2시간 내 재노출 방지. `min(K, 풀 크기 − 1)` 자동 축소(TSD.md 5.3): 편지 2장이면 직전 1장만 제외, 1장이면 반복 허용(의도된 반복).
  - 이력에서 풀에 없는 id(삭제된 편지)는 읽을 때 걸러짐 — 삭제 쪽 코드 변경 없음. 이력 깨짐 → 빈 이력, 기록 실패 → 표시 계속(둘 다 try/catch — 위젯이 이력 때문에 빈칸이 되지 않게).
  - **★로컬 전용·동기화 금지**(TSD.md 5.2 계약 — 새어나가면 읽음 확인 = 원칙 4 위반)를 코드 주석에 명시.
- `widget-task-handler.tsx` 변경 없음(함수 이름 유지). DECISIONS_NEEDED.md 항목 7 신설(K 값·이력 저장 방식 채택 근거).

**검증 결과 (게이트 3종)**
- `npx tsc --noEmit` — 통과 (에러 0)
- `npx expo-doctor` — 통과 (20/20 checks)
- `npx expo export -p android` — 통과 (번들 무에러, 683 modules)

**커밋:** (이 커밋) feat: 위젯 랜덤에 직전 재노출 방지 (최근 K개 제외 + 이력 파일)

**사람이 눈으로 볼 것:** 개발 빌드에서 편지 4장 이상 저장 후 위젯 갱신을 여러 번(재추가/30분 갱신) 관찰 — 같은 편지가 연속으로 안 나오는지, 편지 1~2장일 때도 위젯이 정상 표시되는지(2장 = 교대, 1장 = 반복). Expo Go에서는 앱 본체가 평소대로 돌고 콘솔 에러 0인지.

**다음 후보 (작은 순)**
1. 스코프 v2 (2): `react-native-fast-opencv` 설치·신아키텍처 호환 실측(2단계 최대 리스크) — 문서·npm 확인 후 설치, Expo Go 앱 본체는 조건부 로드로 불변 유지.
2. (위가 막히면) `segmentLetterImage` 없이 가능한 1단계 소품 — 편지함 목록 썸네일 등.
3. TSD.md 5장 개정(react-native-android-widget 전제로) — 사람 승인 후.

---

## 이터레이션 13 — 위젯 탭 → 편지 상세 딥링크 (TSD.md 5.5) (2026-07-18)

**한 일**
- 이터레이션 12의 다음 후보 ① 채택: **위젯 탭 → 표시 중인 편지의 상세로 딥링크**(TSD.md 5.5).
- 코드 작성 전 실측: ① 라이브러리 clickAction — 설치본 소스(click-action.ts, RNWidgetProvider.java)에서 `"OPEN_URI"`(clickActionData `{ uri }` → 네이티브가 ACTION_VIEW 인텐트 직접 실행, JS WIDGET_CLICK 미발생)와 `"OPEN_APP"` 확인. ② expo-linking SDK 57 — 공식 문서(Expo Go 내장) + 설치본 소스에서 `getInitialURL`/`addEventListener('url')`/`parse()` 확인. `npx expo install expo-linking`(57.0.3).
- `app.json`: `"scheme": "sonpyeonji"` 추가(패키지 이름과 정합 — DECISIONS_NEEDED 6). prebuild가 인텐트 필터를 만든다 — 위젯과 같이 개발 빌드에서만 유효.
- `src/widgets/letter-deep-link.ts` 신설: `APP_SCHEME`·`letterDetailDeepLinkUri(letterId)`·`letterIdFromParsedDeepLink(hostname, path)` — 위젯이 만드는 URI와 앱이 되읽는 규칙을 한곳에. expo-linking을 import하지 않는 순수 문자열 모듈(위젯 헤드리스 컨텍스트 안전).
- `letter-widget-thumbs.ts`: pick이 `{ uri, letterId }`(파일 이름 `<letterId>.jpg`의 id)를 돌려주도록 변경 → `LetterWidget.tsx` 썸네일 분기 루트에 `clickAction="OPEN_URI"` + `sonpyeonji://letter/<id>`, 온보딩 카드엔 `clickAction="OPEN_APP"`. 위젯 위에 다른 버튼 없음(TSD 5.5 — 별표 버튼 금지). `widget-task-handler.tsx`·`update-letter-widget.tsx` 프롭 정합.
- `App.tsx`: `getInitialURL` + `addEventListener('url')`로 딥링크 수신 → `letter/<id>`면 상세 화면 전환. `useLinkingURL()` 훅 미사용 — 같은 URL 재수신(뒤로 → 같은 위젯 재탭) 때 리렌더가 없어 이벤트 직접 구독(주석에 근거). Expo Go(`exp://…/--/letter/<id>`)·개발 빌드(`sonpyeonji://…`) 파싱 형태 모두 처리(설치본 parse 소스 실측). BUILD #10.
- fix-forward 1회: expo-linking 설치가 expo-constants 물리 사본 2개를 만들어 expo-doctor 실패 → `npm dedupe`로 해소(같은 57.0.6, 위치만 중복이었음).

**검증 결과 (게이트 3종)**
- `npx tsc --noEmit` — 통과 (에러 0)
- `npx expo-doctor` — 통과 (20/20 checks, dedupe 후)
- `npx expo export -p android` — 통과 (번들 무에러)

**커밋:** (이 커밋) feat: 위젯 탭 → 편지 상세 딥링크 (OPEN_URI + expo-linking 수신)

**사람이 눈으로 볼 것:** 개발 빌드(`npx expo run:android`)에서 ① 편지 있는 위젯 탭 → 그 편지 상세가 바로 뜨는지(앱 꺼짐/백그라운드/포그라운드 3상태 모두) ② 상세 → 뒤로 → 같은 위젯 재탭 → 다시 상세가 뜨는지 ③ 편지 0장 온보딩 카드 탭 → 앱(편지함)만 열리는지 ④ 위젯이 보여주던 편지와 열린 상세가 같은 편지인지(URI는 렌더 시점에 굳음 — DECISIONS_NEEDED 6 주의). Expo Go에서는 앱 본체가 평소대로 돌고(BUILD #10) 콘솔 에러 0인지.

**다음 후보 (작은 순)**
1. TSD.md 5.2 "직전 표시 즉시 재노출 방지" — 최근 표시 이력(로컬 전용·동기화 금지, 원칙 4)을 키-값 저장소에 저장, 풀 크기에 맞춰 K 자동 축소(TSD 5.3).
2. 스코프 v2 (2): `react-native-fast-opencv` 설치·신아키텍처 호환 실측 + `segmentLetterImage` 기본 구현(합성 이미지 스모크까지 — 실물 튜닝 금지).
3. TSD.md 5장 개정(react-native-android-widget 전제로) — 사람 승인 후.

---

## 이터레이션 12 — 위젯에 저장 편지 이미지 랜덤 표시 (썸네일 공유 저장 + ImageWidget) (2026-07-18)

**한 일**
- 이터레이션 11의 다음 후보 ① 채택: **위젯에 저장된 편지 이미지 1장 랜덤 표시**(기획서 결정 4 '볼 때마다 랜덤' · 2.5 표시 로직).
- `npx expo install expo-image-manipulator`(~57.0.5, Expo Go 내장). 코드 작성 전 SDK 57 문서 확인: 새 클래스 API `ImageManipulator.manipulate(source)` → `.resize({ width })`(한 값만 주면 비율 유지) → `.renderAsync()` → `ImageRef.saveAsync({ format, compress })`(캐시 폴더에 저장). 레거시 manipulateAsync는 deprecated — 안 씀.
- `src/widgets/letter-widget-thumbs.ts` 신설 — 앱↔위젯 썸네일 공유 저장소(TSD.md 1.4·5.4):
  - 저장 시 `widget-thumbs/<letterId>.jpg`로 **최대 가로 720px·JPEG 0.85** 다운스케일(원본이 작으면 업스케일 안 함 — 원칙 1). 캐시 → 문서 폴더로 move.
  - `pickRandomLetterWidgetThumbnailUri()` — 파일 목록에서 **균등 랜덤 1개**, 0장이면 null(→ 온보딩 카드). **위젯 쪽 expo-sqlite 접근 없음** — 파일 목록이 곧 표시 풀. "직전 재노출 방지(최근 K개 제외, TSD.md 5.2)"는 이력 저장이 필요해 다음 증분 TODO.
- `LetterWidget.tsx`: props(`thumbnailUri`/`widthDp`/`heightDp`) 추가 — 썸네일이 있으면 `ImageWidget`(resizeMode "contain" — 잘림 금지·축소 우선, TSD.md 5.4), 없으면 기존 온보딩 카드. **실측 2건:** ① 위젯 트리 빌더가 React Fragment 미지원(설치본 build-widget-tree.ts) → 분기마다 FlexWidget 루트 반환. ② `ImageWidget`의 TS 타입엔 `file:`이 없지만 네이티브 로더가 `file://` 명시 지원(ResourceUtils.java `BitmapFactory.decodeFile` 분기) → 캐스트로 전달(DECISIONS_NEEDED 5).
- `widget-task-handler.tsx`: ADDED/UPDATE/RESIZED에서 랜덤 썸네일 + `widgetInfo.width/height`(dp — ImageWidget의 imageWidth/imageHeight가 dp임을 네이티브 소스로 확인)를 넘겨 렌더. 파일 접근 실패 시 온보딩 카드로 후퇴.
- `src/widgets/update-letter-widget.tsx` 신설: `updateLetterWidgetSafe()` — `requestWidgetUpdate`를 지연 require + try/catch로 감싼 no-op 안전 함수(Expo Go 앱 본체 불변 — index.ts와 같은 패턴). 저장(AddLetterScreen)·삭제(LetterDetailScreen) 직후 호출: 저장 시 썸네일 생성+위젯 갱신, 삭제 시 썸네일 삭제+위젯 갱신(지운 편지가 위젯에 안 남게 — TSD.md 5.1 "새 편지 스캔 시 즉시 반영").

**검증 결과 (게이트 3종)**
- `npx tsc --noEmit` — 통과 (에러 0)
- `npx expo-doctor` — 통과 (20/20 checks)
- `npx expo export -p android` — 통과 (번들 무에러, 675 modules)

**커밋:** (이 커밋) feat: 위젯에 저장 편지 이미지 랜덤 표시 (썸네일 공유 저장 + ImageWidget)

**사람이 눈으로 볼 것:** 위젯 실동작은 **개발 빌드(`npx expo run:android`) 필요.** ① 편지 1~2장 저장 → 홈 화면 위젯에 손글씨 썸네일이 뜨는지 ② 30분 갱신·위젯 재추가 때 랜덤으로 바뀌는지 ③ 편지 전부 삭제 → 온보딩 카드 복귀 ④ `file://` 캐스트 경로가 실기에서 실제 그려지는지(DECISIONS_NEEDED 5 주의 참조). Expo Go에서는 저장/삭제 흐름이 그대로 돌고 위젯 호출은 no-op인지(콘솔 에러 0) 확인.

**다음 후보 (작은 순)**
1. 위젯 탭 → 앱 열기/편지 상세 딥링크(TSD.md 5.5) — widget-task-handler의 WIDGET_CLICK + clickAction.
2. TSD.md 5.2 "직전 표시 즉시 재노출 방지" — 최근 표시 이력(로컬 전용·동기화 금지, 원칙 4)을 키-값 저장소에 저장.
3. 스코프 v2 (2): `react-native-fast-opencv` 설치·신아키텍처 호환 실측 + `segmentLetterImage` 기본 구현(합성 이미지 스모크까지 — 실물 튜닝 금지).
4. TSD.md 5장 개정(react-native-android-widget 전제로) — 사람 승인 후.

---

## 이터레이션 11 — react-native-android-widget 실측 스파이크 → 채택 + 위젯 최소 구성 (2026-07-18)

**한 일**
- 규칙 v2 스코프 (1) 착수: **`react-native-android-widget` SDK 57/신아키텍처 호환 실측 → 긍정 → 채택(자율)**:
  - npm: 0.21.0(2026-07-11 갱신), peer `expo >=54` → SDK 57 충족. 공식 문서: 신아키텍처 지원 명시, RN 0.76+(현재 0.86.0), Expo config plugin 제공(위젯 실동작은 개발 빌드 필요).
  - 설치본 소스 실측: `registerWidgetTaskHandler`는 순수 JS(`AppRegistry.registerHeadlessTask`) / 라이브러리 로드는 환경 따라 `TurboModuleRegistry.getEnforcing` throw 가능 → **index.ts에서 try/catch + 지연 require 조건부 로드**(Expo Go 앱 본체 불변 — overnight_task.md "조건부/분리 로드" 준수).
- `npx expo install react-native-android-widget`(0.21.0) 후 최소 구성:
  - `app.json`: plugin 설정 — 위젯 1개(name `Letter`, label 손편지, 3×2 셀, minWidth 180dp/minHeight 110dp, updatePeriodMillis 1800000=30분·시스템 최솟값). plugin이 prebuild에 `android.package`를 요구(소스 실측)해 **`com.theone.sonpyeonji` 채택(자율)** — Play 제출 전 변경 가능.
  - `src/widgets/LetterWidget.tsx`: 위젯 순수 함수 — 지금은 **빈 위젯 온보딩 카드**(TSD.md 5.3 "첫 편지를 기다리는 중" — 기획서 P0 '빈 위젯 첫인상 처리')만. `'use no memo'`(공식 문서 권장). 편지 이미지 랜덤 표시는 TODO 주석으로 다음 증분 명시.
  - `src/widgets/widget-task-handler.tsx`: WIDGET_ADDED/UPDATE/RESIZED → renderWidget. CLICK 딥링크(TSD.md 5.5)는 다음 증분.
- DECISIONS_NEEDED.md: 항목 3에 채택(자율)+근거 추가, 항목 4(패키지 이름·위젯 구성값) 신설. TSD.md 5장은 "Glance 직접" 전제라 개정 필요 — 사람 리뷰 대상으로 기록만.

**검증 결과 (게이트 3종)**
- `npx tsc --noEmit` — 통과 (에러 0)
- `npx expo-doctor` — 통과 (20/20 checks)
- `npx expo export -p android` — 통과 (번들 무에러, 668 modules — 위젯 코드 포함)

**커밋:** (이 커밋) feat: react-native-android-widget 채택 + 위젯 최소 구성 (빈 위젯 온보딩 카드)

**사람이 눈으로 볼 것:** 위젯 실동작은 **개발 빌드(`npx expo run:android`) 필요** — Expo Go로는 확인 불가(앱 본체만 확인 가능). 개발 빌드 후 홈 화면에 '손편지' 위젯 추가 → 온보딩 카드 확인. DECISIONS_NEEDED 3(라이브러리 채택)·4(패키지 이름) 리뷰.

**다음 후보 (작은 순)**
1. 위젯에 저장된 편지 이미지 1장 랜덤 표시(기획서 결정 4) — 앱이 저장 시점에 위젯용 다운스케일 썸네일을 만들어 두고(TSD.md 1.4·5.4), widgetTaskHandler가 파일 목록에서 랜덤 1개를 `ImageWidget`으로 렌더 + `requestWidgetUpdate` 연동. (위젯 프로세스는 expo-sqlite 직접 접근 불가 전제 확인 포함)
2. 스코프 v2 (2): `react-native-fast-opencv` 설치·신아키텍처 호환 실측 + `segmentLetterImage` 기본 구현(합성 이미지 스모크까지 — 실물 튜닝 금지).
3. TSD.md 5장 개정(react-native-android-widget 전제로) — 사람 승인 후.

---

## 이터레이션 10 — expo-widgets 안드로이드 지원 실측 스파이크 + 1단계 마무리 점검 (2026-07-18)

**한 일**
- 이터레이션 9의 다음 후보 ① 착수: `expo-widgets` 안드로이드 지원 실측 스파이크(TSD.md 부록 A ★차단). 결과 — **미지원 확정**:
  - 공식 문서(docs.expo.dev/versions/v57.0.0/sdk/widgets/): `platforms: ['ios']`, 소개도 "iOS home screen widgets and Live Activities", 안드로이드/Jetpack Glance 언급 0회, 위젯 크기도 iOS 전용(`systemSmall` 등)만, Expo Go 미지원 명시.
  - npm: `expo-widgets` 57.0.0~57.0.6 존재하나 iOS 전용을 뒤집는 근거 없음.
- 지시대로 **설치하지 않고**(iOS 전용 네이티브 모듈 — Expo Go 범위만 깨짐) DECISIONS_NEEDED.md 항목 3에 실측 결과 + 후퇴 경로(**Jetpack Glance 네이티브 직접 작성** — prebuild `android/` + Kotlin, 개발 빌드 필요) 기록 후 후보 ②로 전환.
- 후보 ② 수행: overnight_task.md '이번 루프의 범위' 대비 1단계 마무리 점검표 작성 — **1단계 완성 목표 전부 충족**(편지함 목록/상세 · 갤러리 선택 · sqlite 저장 · 메타 입력 · 보기모드 3종 뼈대 + 범위 외 승격 편지 삭제). MORNING_REPORT.md를 이터레이션 7~10 기준으로 갱신(실기 미확인 항목: 편지 삭제·보기모드 전환).
- 코드 변경 없음(문서 증분). 새 의존성 없음.

**검증 결과 (게이트 3종)**
- `npx tsc --noEmit` — 통과 (에러 0)
- `npx expo-doctor` — 통과 (20/20 checks)
- `npx expo export -p android` — 통과 (번들 무에러, 644 modules)

**커밋:** `d80574a` docs: expo-widgets 안드로이드 미지원 실측 스파이크 기록 + 1단계 마무리 점검 (MORNING_REPORT 갱신)

**사람이 눈으로 볼 것:** DECISIONS_NEEDED.md 항목 3 — Glance 네이티브 직접 작성 후퇴 경로 승인 여부(승인 시 TSD.md 5장·부록 A ★차단 갱신 필요). 에뮬레이터 실기: 편지 삭제(이터레이션 7)·보기모드 전환(이터레이션 8).

**다음 후보 (작은 순)**
1. (사람 승인 후) 3단계 자리 표시 — Glance 네이티브 전제의 위젯 TODO 자리 문서/파일(앱 자바스크립트 번들과 분리 유지 — 네이티브 코드라 자연 분리. Expo Go 범위 밖 작업은 자리·TODO까지만).
2. 잔여 다듬기(범위 내 소소한 것) — 예: 편지함 목록에 저장 이미지 썸네일 표시(현재 텍스트 행만). 단 오버엔지니어링 경계.

---

## 이터레이션 9 — OpenCV 세그멘테이션 인터페이스 뼈대 (2026-07-18)

**한 일**
- 이터레이션 8의 다음 후보 ① 채택: `src/segmentation.ts` 신설 — **타입·시그니처만** (overnight_task.md '이번 루프의 범위': 2단계는 뼈대까지).
- 타입은 TSD.md 6.3 segment 테이블에 1:1 매핑: `SegmentGranularity('line'|'sentence')` · `NormalizedBoundingBox(bbox)` · `SegmentCandidate(idx·cropUri·bbox·aspectRatio)` · `SegmentationResult(cleanedFullUri + segments[], 빈 배열 = 통짜 후퇴 경로)`. 함수는 `segmentLetterImage(originalImageUri)` 하나 — 호출 시 "준비 중" throw(호출부 아직 없음).
- TODO 주석에 TSD.md 4.1 파이프라인 단계(cvtColor → adaptiveThreshold → 투영 프로파일+dilate → findContours → boundingRect → 크롭 → 문장 승격 → 다운스케일)와 4.4 `clearBuffers` 수동 해제 메모 명시. 실제 구현·`react-native-fast-opencv` 설치는 안 함 — 파라미터가 0단계 실물 사진 검증(DECISIONS_NEEDED 1 ★차단) 종속이라 범위 밖.
- 새 의존성·새 Expo API 없음(순수 타입 파일 — docs 확인 대상 API 없음). 화면 연결 없음(2단계에서 연결).

**검증 결과 (게이트 3종)**
- `npx tsc --noEmit` — 통과 (에러 0)
- `npx expo-doctor` — 통과 (20/20 checks)
- `npx expo export -p android` — 통과 (번들 무에러, 644 modules)

**커밋:** `688ad9a` feat: OpenCV 세그멘테이션 인터페이스 뼈대 (타입·시그니처만, 구현은 2단계)

**사람이 눈으로 볼 것:** 없음(화면 변화 없음). 코드 리뷰만 — 타입이 TSD.md 6.3 스키마와 맞는지.

**다음 후보 (작은 순)**
1. (뼈대만) Glance 위젯 자리 표시 — 3단계 스캐폴드 (착수 시 `expo-widgets` 안드로이드 지원 실측 스파이크부터 — TSD 부록 A ★차단. Expo Go 밖이면 자리·TODO 문서화까지만).
2. 1단계 마무리 점검 — overnight_task.md '이번 루프의 범위' 대비 누락 확인 후 MORNING_REPORT.md 갱신.

---

## 이터레이션 8 — 보기모드 3종 뼈대 (2026-07-18)

**한 일**
- 이터레이션 7의 다음 후보 ① 채택: `LetterDetailScreen.tsx`에 보기 모드 전환 UI. 명칭은 PROGRESS의 임시 표기("통짜/줄만/영역")가 아니라 **기획서 결정 3(보기 모드 3종)의 정식 명칭 — 통째로/한 줄씩/한 문장씩** — 을 따름(기획서 우선 규칙).
- 3버튼 세그먼트 UI(`ViewMode = 'whole' | 'line' | 'sentence'`, 화면 로컬 useState): **통째로**만 실동작(저장된 원본 이미지 표시 — 기존 동작 유지). **한 줄씩/한 문장씩**은 자리 화면("~는 아직 준비 중이에요" + 세그멘테이션 후 가능 안내) + `TODO(2단계 세그멘테이션)` 주석 — TSD.md 4.6 "모드 전환은 렌더 시점의 이미지 선택일 뿐" 매핑 주석 포함.
- 새 Expo API·새 의존성 없음(React Native 기본 컴포넌트만). 모드 영구 저장(키-값 저장소)은 위젯 설정 단계(3단계) 일이라 만들지 않음 — 오버엔지니어링 금지. BUILD #9.

**검증 결과 (게이트 3종)**
- `npx tsc --noEmit` — 통과 (에러 0)
- `npx expo-doctor` — 통과 (20/20 checks)
- `npx expo export -p android` — 통과 (번들 무에러, 644 modules)

**커밋:** `be2fb98` feat: 보기모드 3종 뼈대 (통째로 실동작 + 한 줄씩/한 문장씩 자리 표시)

**사람이 눈으로 볼 것:** 상세 화면에서 통째로/한 줄씩/한 문장씩 버튼 전환 — 통째로는 이미지, 나머지 둘은 준비 중 안내가 뜨는지.

**다음 후보 (작은 순)**
1. (뼈대만) OpenCV 세그멘테이션 인터페이스 + TODO — segment 산출물 타입(TSD.md 6.3 segment 테이블 참조)·함수 시그니처만. 실제 구현은 0단계 실물 사진 이후 (DECISIONS_NEEDED 1 ★차단).
2. (뼈대만) Glance 위젯 자리 표시 — 3단계 스캐폴드 (착수 시 `expo-widgets` 안드로이드 지원 실측 스파이크부터 — TSD 부록 A ★차단).
3. 1단계 마무리 점검 — overnight_task.md '이번 루프의 범위' 대비 누락 확인 후 MORNING_REPORT.md 갱신.

---

## 이터레이션 7 — 편지 삭제 (2026-07-18)

**한 일**
- MORNING_REPORT 실기 확인에서 승격된 후보 채택: 테스트 레코드("tdorld")를 지울 방법이 없었음. 기획서 3.8 "받은 편지는 로컬에 영구 보관(**사용자가 지우기 전까지**)" + 결정 8(디지털은 사본, 실물이 원본) 정합 — 지워지는 건 앱 안의 사본뿐.
- `LetterDetailScreen.tsx`: "이 편지 지우기" 버튼 + `Alert.alert` 확인 다이얼로그("앱에 담아 둔 사본만 사라져요. 실물 편지는 그대로예요"). 확인 시 ① 트랜잭션으로 letter·asset 행 DELETE ② `letters/` 이미지 사본 파일 삭제(실패해도 고아 파일만 — try/catch로 무시) ③ 편지함 복귀(재마운트로 목록 자동 갱신).
- 코드 작성 전 API 확인(설치본 SDK 57 타입 정의): expo-file-system `File.delete(): void`(동기, 없으면 throw)·`File.exists: boolean` — node_modules/expo-file-system/build/internal/NativeFileSystem.types.d.ts. 레거시 `deleteAsync`는 쓰지 않음(SDK 57에서 throw).
- 상세 조회 쿼리에 `original_asset_id` 추가. 새 의존성 없음. BUILD #8.

**검증 결과 (게이트 3종)**
- `npx tsc --noEmit` — 통과 (에러 0)
- `npx expo-doctor` — 통과 (20/20 checks)
- `npx expo export -p android` — 통과 (번들 무에러, 644 modules)

**커밋:** `4d5d3b8` feat: 편지 삭제 (확인 다이얼로그 + letter/asset DELETE + 이미지 사본 정리)

**사람이 눈으로 볼 것:** 에뮬레이터에서 "tdorld" 테스트 레코드를 실제로 지워보기 (상세 → 이 편지 지우기 → 확인 → 목록에서 사라짐 + 재시작 후에도 안 돌아옴).

**다음 후보 (작은 순)**
1. 보기모드 3종 뼈대 — 편지 상세 화면에 통짜/줄만/영역 전환 UI. 통짜만 실동작(현재 이미지), 줄만/영역은 자리 + "2단계 세그멘테이션 후" TODO 안내. (개발계획.md 1단계 '보기모드 3종 뼈대')
2. (뼈대만) OpenCV 세그멘테이션 인터페이스 + TODO — segment 산출물 타입·함수 시그니처만 (실제 구현은 0단계 실물 사진 이후)
3. (뼈대만) Glance 위젯 자리 표시 — 3단계 스캐폴드 (착수 시 `expo-widgets` 안드로이드 지원 실측 스파이크부터 — TSD 부록 A ★차단)

---

## 이터레이션 6 — 편지 상세 화면 (저장된 원본 이미지 표시) (2026-07-18)

**한 일**
- `src/screens/LetterDetailScreen.tsx` 신설: letter + asset을 `original_asset_id`로 LEFT JOIN해 한 번에 읽고(애칭·받은 날짜 헤더 + 저장된 원본 이미지 `resizeMode="contain"` 표시) "← 편지함으로" 복귀. 이미지/행이 없을 때 안내 문구 처리.
- 코드 작성 전 API 확인: expo-sqlite `getFirstAsync<T>(source, params)` → `Promise<T | null>` — 설치된 SDK 57 타입 정의(node_modules/expo-sqlite/build/SQLiteDatabase.d.ts)에서 시그니처 확인.
- `LetterListScreen.tsx`: 행을 `Pressable`로 바꾸고 `onLetterPress(letterId)` 전달.
- `App.tsx`: 화면 상태를 `{ name: 'list' } | { name: 'add' } | { name: 'detail'; letterId }` 판별 유니언으로 확장 (여전히 내비게이션 라이브러리 없음). BUILD #7.
- 새 의존성 없음. 보기모드 3종은 이 화면 위에 다음 증분으로 얹는다.

**검증 결과 (게이트 3종)**
- `npx tsc --noEmit` — 통과 (에러 0)
- `npx expo-doctor` — 통과 (20/20 checks)
- `npx expo export -p android` — 통과 (번들 무에러, 644 modules)

**커밋:** `132d625` feat: 편지 상세 화면 (저장된 원본 이미지 표시 + 뒤로가기)

**다음 후보 (작은 순)**
1. 보기모드 3종 뼈대 — 편지 상세 화면에 통짜/줄만/영역 전환 UI. 통짜만 실동작(현재 이미지), 줄만/영역은 자리 + "2단계 세그멘테이션 후" TODO 안내. (개발계획.md 1단계 '보기모드 3종 뼈대')
2. (뼈대만) OpenCV 세그멘테이션 인터페이스 + TODO — segment 산출물 타입·함수 시그니처만 (실제 구현은 0단계 실물 사진 이후)
3. (뼈대만) Glance 위젯 자리 표시 — 3단계 스캐폴드

---

## 이터레이션 5 — 편지 저장 (메타 입력 + 이미지 사본 + INSERT) (2026-07-18)

**한 일**
- `npx expo install expo-file-system expo-crypto` (~57.0.1 둘 다, Expo Go 내장. app.json 변경 없음).
- 코드 작성 전 SDK 57 문서 확인:
  - expo-file-system(https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/): 새 클래스 API — `Paths.document`(문서 디렉터리), `Directory.create({ intermediates, idempotent })`, `File.copy(destination)` → `Promise<void>`, `File.uri`/`File.size` 속성. 레거시 `copyAsync`/`documentDirectory`는 쓰지 않음.
  - expo-crypto: `Crypto.randomUUID(): string` (동기, UUIDv4 — TSD.md 스키마의 TEXT id용).
  - expo-sqlite: `runAsync(source, params)` / `withTransactionAsync(task)` 시그니처 확인.
- `AddLetterScreen.tsx`: 사진 선택 후 애칭·받은 날짜(YYYY-MM-DD, 오늘 자동 채움) 입력 폼 + "편지 보관하기" 버튼. 저장 시:
  1. 결정 8 '디지털은 사본' — 이미지를 앱 문서 폴더 `letters/<assetId>.<ext>`로 복사(갤러리 원본 불변).
  2. 트랜잭션으로 asset(kind='originalScan', local_path, byte_size) + letter(id, 애칭, received_date, scanned_at, original_asset_id, processing_status='raw') INSERT — TSD.md 6.3 enum 값 그대로.
  3. 편지함 복귀 → 목록 화면 재마운트로 자동 갱신(추가 코드 없음).
- 입력 검증은 최소한(애칭 공백/날짜 형식·유효성)만. App.tsx BUILD #6.

**검증 결과 (게이트 3종)**
- `npx tsc --noEmit` — 통과 (에러 0)
- `npx expo-doctor` — 통과 (20/20 checks)
- `npx expo export -p android` — 통과 (번들 무에러, 643 modules)

**커밋:** `080c85c` feat: 편지 메타 입력 폼 + 이미지 사본 저장 + letter/asset INSERT

**다음 후보 (작은 순)**
1. 편지 상세 화면 — 편지함 행 탭 → 저장된 원본 이미지(asset.local_path) 표시 + 뒤로. (보기모드 3종 뼈대의 전 단계)
2. 보기모드 3종 뼈대 (통짜/줄만/영역 — 통짜만 실동작, 줄만/영역은 자리 + TODO. 실제 분할은 2단계)
3. (뼈대만) OpenCV 세그멘테이션 인터페이스 + TODO / Glance 위젯 자리 표시

---

## 이터레이션 4 — expo-image-picker 갤러리 선택 (2026-07-18)

**한 일**
- `npx expo install expo-image-picker` (~57.0.5, Expo Go 내장. app.json 변경 없음).
- 코드 작성 전 https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/ 에서 실제 API 확인: `launchImageLibraryAsync(options)` → `{ canceled, assets }`, `mediaTypes`는 문자열 배열 `['images']`(MediaTypeOptions enum은 deprecated), 갤러리 실행에는 권한 요청 불필요.
- `src/screens/AddLetterScreen.tsx` 신설: "갤러리에서 사진 선택" 버튼 → 선택한 사진을 화면에 미리보기(`resizeMode="contain"`) + "다른 사진 고르기" 재선택 + "편지함으로" 복귀. `quality: 1`로 압축 안 함(기획서 원칙 1 손글씨 물성 보존).
- `App.tsx`: AddLetterPlaceholder 자리 화면 제거, AddLetterScreen으로 교체. BUILD #5.
- 아직 저장하지 않음 — 선택·표시까지만. INSERT는 다음 증분.

**검증 결과 (게이트 3종)**
- `npx tsc --noEmit` — 통과 (에러 0)
- `npx expo-doctor` — 통과 (20/20 checks)
- `npx expo export -p android` — 통과 (번들 무에러, 618 modules)

**커밋:** `47f382e` feat: expo-image-picker 갤러리 선택으로 편지 추가 화면 구현

**다음 후보 (작은 순)**
1. 편지 메타(애칭·날짜) 입력 폼 → letter/asset INSERT 연결 (expo-file-system으로 이미지를 앱 폴더에 복사 — 결정 8 '디지털은 사본') + 저장 후 편지함 목록 갱신
2. 편지 상세 화면 + 보기모드 3종 뼈대 (통짜/줄만/영역 — 실제 분할은 2단계 스캐폴드로)
3. (뼈대만) OpenCV 세그멘테이션 인터페이스 + TODO / Glance 위젯 자리 표시

---

## 이터레이션 3 — 편지함 화면 뼈대 (2026-07-18)

**한 일**
- `src/screens/LetterListScreen.tsx` 신설: letter 테이블을 `getAllAsync`로 읽는 편지함 목록(지금은 빈 목록 → 💌 빈 상태 안내) + "편지 추가" 버튼. 코드 작성 전 https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/ 에서 `getAllAsync<T>(source, params?)` 시그니처 확인.
- `App.tsx`: hello-world 화면을 편지함으로 교체. 화면이 둘뿐이라 내비게이션 라이브러리 없이 `useState('list' | 'add')`로 전환 — "편지 추가"는 자리 화면(다음 증분에서 expo-image-picker로 채움) + "편지함으로" 복귀 버튼. BUILD #4 마커는 하단 작은 글씨로 유지.
- 새 의존성 없음.

**검증 결과 (게이트 3종)**
- `npx tsc --noEmit` — 통과 (에러 0)
- `npx expo-doctor` — 통과 (20/20 checks)
- `npx expo export -p android` — 통과 (번들 무에러, 613 modules)

**커밋:** `0c7042a` feat: 편지함 화면 뼈대 (letter 목록 + 편지 추가 진입점)

**다음 후보 (작은 순)**
1. expo-image-picker로 갤러리에서 사진 선택 → 편지 추가 화면에 표시 (Expo Go 내장, docs 확인 후)
2. 편지 메타(애칭·날짜) 입력 폼 → letter/asset INSERT 연결 (expo-file-system으로 이미지 복사 포함) + 편지함 목록 갱신
3. 편지 상세 화면 + 보기모드 3종 뼈대 (통짜/줄만/영역 — 실제 분할은 2단계 스캐폴드로)
4. (뼈대만) OpenCV 세그멘테이션 인터페이스 + TODO / Glance 위젯 자리 표시

---

## 이터레이션 2 — expo-sqlite 최소 데이터 계층 (2026-07-18)

**한 일**
- `npx expo install expo-sqlite` (~57.0.1, Expo Go 내장. app.json에 config plugin 자동 추가됨).
- 코드 작성 전 https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/ 에서 실제 API 확인(`openDatabaseAsync`/`SQLiteProvider`/`execAsync`).
- `src/db.ts` 신설: TSD.md 6.3 'expo-sqlite 스키마 초안' 그대로 **letter**(편지 메타: 애칭·날짜 등)·**asset**(이미지 파일 경로) 두 테이블만 `CREATE TABLE IF NOT EXISTS`로 초기화. segment(2단계)·favorite(Phase 1)은 그 단계에서 추가 — 미리 만들지 않음.
- `App.tsx`: `SQLiteProvider(databaseName='letters.db', onInit=initLetterDb)`로 감싸고, DB가 실제 열렸는지 보여주는 상태 한 줄(`로컬 DB 준비됨 · 편지 N통`) 추가. BUILD #3.

**검증 결과 (게이트 3종)**
- `npx tsc --noEmit` — 통과 (에러 0)
- `npx expo-doctor` — 통과 (20/20 checks)
- `npx expo export -p android` — 통과 (번들 무에러, 612 modules)

**커밋:** `23ee54e` feat: expo-sqlite 최소 데이터 계층 (letter·asset 테이블 초기화)

**다음 후보 (작은 순)**
1. 편지함 화면 뼈대 — letter 테이블을 읽는 빈 목록 + "편지 추가" 진입점 (내비게이션은 최소한으로)
2. expo-image-picker로 갤러리에서 사진 선택 → 화면 표시 (Expo Go 내장, docs 확인 후)
3. 편지 메타(애칭·날짜) 입력 폼 → letter/asset INSERT 연결 (expo-file-system으로 이미지 복사 포함)
4. 편지 상세 화면 + 보기모드 3종 뼈대 (통짜/줄만/영역 — 실제 분할은 2단계 스캐폴드로)
5. (뼈대만) OpenCV 세그멘테이션 인터페이스 + TODO / Glance 위젯 자리 표시

---

## 이터레이션 1 — 베이스라인 정리 (2026-07-18)

**한 일**
- 커밋 안 된 App.tsx(hello-world BUILD #2)와 추적 안 된 overnight_task.md를 베이스라인으로 커밋.
- 루프 상태 파일 생성: PROGRESS.md(이 파일), DECISIONS_NEEDED.md.
- expo-doctor 실패(expo 57.0.6 ↔ 기대 ~57.0.7 패치 불일치)를 `npx expo install --fix`로 해결 → package.json / package-lock.json 갱신.

**검증 결과 (게이트 3종)**
- `npx tsc --noEmit` — 통과 (에러 0)
- `npx expo-doctor` — 통과 (20/20 checks, expo 57.0.7 패치 후)
- `npx expo export -p android` — 통과 (번들 무에러, 579 modules)

**다음 후보 (작은 순)**
1. 편지 데이터 모델 + expo-sqlite 로컬 저장 기초 — `npx expo install expo-sqlite` 후 letters 테이블(id, 애칭, 날짜, 이미지 경로) 열기/초기화만. Expo Go 범위. (개발계획.md 1단계, 기획서 3.7 백업 정책·결정 8 '디지털은 사본')
2. 편지함 화면 뼈대 — 빈 목록 + "편지 추가" 진입점 (내비게이션은 최소한으로)
3. expo-image-picker로 갤러리에서 사진 선택 → 화면 표시 (Expo Go 내장)
4. 편지 메타(애칭·날짜) 입력 폼 → sqlite 저장 연결
5. 편지 상세 화면 + 보기모드 3종 뼈대 (통짜/줄만/영역 — 실제 분할은 2단계 스캐폴드로)
6. (뼈대만) OpenCV 세그멘테이션 인터페이스 + TODO / Glance 위젯 자리 표시

**메모**
- 개발계획.md 0단계(Python 파이프라인 검증)는 실물 편지 사진이 필요 → 루프에서 불가, DECISIONS_NEEDED.md 참고.
- 새 Expo API 사용 시 반드시 https://docs.expo.dev/versions/v57.0.0/ 에서 먼저 확인.

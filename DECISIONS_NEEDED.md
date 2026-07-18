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

# PROGRESS — 밤샘 자율 루프 진행 기록

> 매 반복 시작 시 이 파일부터 읽는다. 규칙·범위는 overnight_task.md, 제품 결정은 ..\기획서.md, 실행 계획은 ..\개발계획.md.

**반복 횟수(검증 통과 커밋 기준): 9**

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

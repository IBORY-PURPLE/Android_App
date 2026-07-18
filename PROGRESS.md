# PROGRESS — 밤샘 자율 루프 진행 기록

> 매 반복 시작 시 이 파일부터 읽는다. 규칙·범위는 overnight_task.md, 제품 결정은 ..\기획서.md, 실행 계획은 ..\개발계획.md.

**반복 횟수(검증 통과 커밋 기준): 4**

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

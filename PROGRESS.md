# PROGRESS — 밤샘 자율 루프 진행 기록

> 매 반복 시작 시 이 파일부터 읽는다. 규칙·범위는 overnight_task.md, 제품 결정은 ..\기획서.md, 실행 계획은 ..\개발계획.md.

**반복 횟수(검증 통과 커밋 기준): 1**

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

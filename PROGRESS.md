# PROGRESS — 밤샘 자율 루프 진행 기록

> 매 반복 시작 시 이 파일부터 읽는다. 규칙·범위는 overnight_task.md, 제품 결정은 ..\기획서.md, 실행 계획은 ..\개발계획.md.

**반복 횟수(검증 통과 커밋 기준): 24**

---

## 이터레이션 24 — 편지함 목록 썸네일 (원본 스캔 미리보기 — 1단계 다듬기) (2026-07-18)

**한 일**
- 이터레이션 23의 다음 후보 ① 채택(②'나누기'는 분할선 UI 설계가 필요한 더 무거운 걸음, ③TSD 개정은 사람 승인 대기): **편지함 목록 행에 저장 이미지 미리보기**(1단계 다듬기 — 기획서 6.4 박물관 코어의 소품, 스코프 v2 우선순위 3).
- `LetterListScreen.tsx`: 목록 쿼리를 `LEFT JOIN asset ON asset.id = letter.original_asset_id`로 확장(상세 화면과 같은 조인)해 행마다 **원본 스캔 56dp 정사각 썸네일**(cover 크롭 + 편지지 톤 배경, 원본 없으면 💌 자리 표시) + 이름·날짜 가로 배치. **위젯 풀(widget-thumbs/) 재사용은 검토 후 기각** — 확정된 편지의 풀 엔트리는 가로로 긴 줄 조각이라 목록 미리보기로 부적합하고, 풀은 확정 시 교체되는 위젯 표시 품질용 저장소지 진실의 원천이 아니다(채택 근거는 DECISIONS_NEEDED 17).
- **메모리:** RN `Image`의 `resizeMethod="resize"`(안드로이드 전용 — 설치본 RN 0.86 `Image.d.ts` 실측: 디코드 전에 뷰 크기 근처로 다운샘플) — 원본 고해상도 비트맵이 목록에 그대로 올라오지 않는다. 목록 전용 썸네일 파일 계층은 과설계로 안 만듦(개인용 규모 — 원칙 6).
- 새 의존성 0, 새 Expo API 0(RN 기본 `Image` + 기존 실측 `getAllAsync` — docs 확인 대상 없음). 앱 본체 Expo Go에서 그대로 돈다(순수 JS·표준 컴포넌트만). 저장 계층 변경 0(읽기 쿼리 확장뿐).

**검증 결과 (게이트 3종)**
- `npx tsc --noEmit` — 통과 (에러 0)
- `npx expo-doctor` — 통과 (20/20 checks)
- `npx expo export -p android` — 통과 (번들 무에러, 697 modules)

**커밋:** (이 커밋) feat: 편지함 목록 썸네일 — 원본 스캔 미리보기 (asset 조인 + 디코드 다운샘플)

**사람이 눈으로 볼 것 (실기 확인 필요):** **Expo Go에서 바로** — ① 편지함 목록 행마다 왼쪽에 손글씨 썸네일이 뜨는지(정사각 크롭·둥근 모서리) ② 여러 장(5장 이상) 저장해도 목록 스크롤이 버벅이지 않는지(resizeMethod 다운샘플) ③ 원본 없는 편지 행에 💌 자리 표시가 뜨는지 ④ 행 탭 → 상세 진입이 평소대로인지, 콘솔 에러 0.

**다음 후보 (작은 순)**
1. 보정 액션 '나누기'(TSD.md 4.5 ②) — 한 조각을 위/아래 둘로 분리. 드래그 대신 "가로 분할선 슬라이더" 최소화 설계부터 — 재크롭은 합치기(이터레이션 22)의 expo-image-manipulator crop 인프라 재사용 가능.
2. 보정 액션 '박스 조절'(TSD.md 4.5 ③ — 5종 중 마지막) — bbox 가장자리 조절. 나누기와 같은 계열이나 4방향이라 더 무겁다.
3. TSD.md 5장 개정(react-native-android-widget 전제) + 6.3 processing_status 매핑(DECISIONS_NEEDED 9)·풀 편입 규칙(13)·미리보기 방식(14)·합치기 재크롭(15)·순서 지정(16)·목록 썸네일(17) 명문화 — 사람 승인 후.

---

## 이터레이션 23 — 보정 액션 '순서 지정' (행별 ▲/▼ 재정렬 — segment_order 계약 첫 실사용) (2026-07-18)

**한 일**
- 이터레이션 22의 다음 후보 ① 채택(스코프 v2 우선순위 2 '보정 UI'의 계속 — ②편지함 썸네일은 "위 둘이 막혔을 때"용, ③TSD 개정은 사람 승인 대기): **보정 액션 '순서 지정'(TSD.md 4.5 ⑤ — 노출 순서 재정렬)**, 삭제(19)·합치기(22)에 이어 5종 중 3호. 남은 둘(나누기·박스 조절)은 드래그 UI라 더 무겁다.
- `SegmentationReviewPanel.tsx`: 후보 행에 **▲/▼ 한 칸 이동 버튼**(순수 JS 배열 이웃 교환 — 재크롭·비동기·새 의존성 0, 드래그 정렬은 과설계라 안 함, 채택 근거는 DECISIONS_NEEDED 16). 경계(맨 위/맨 아래)는 비활성+흐림, busy 중 잠금(합치기와 동일), 뺀 조각엔 버튼 없음(확정에서 빠지므로 — 단 교환 상대로는 허용, 화면 위치 직관 우선). 재정렬도 "자동 검출로 되돌리기"의 초기화 대상. 헤더 카피 "위에서 아래 순서예요" → **"이 순서 그대로 새겨져요"**(순서가 결과에 새겨짐을 알림).
- **저장 계층 변경 0:** `persistSegmentationResult`는 원래부터 받은 segments 배열 순서대로 `segment_order`를 기록하고 `LineSegmentsView`는 segment_order 우선으로 그린다(항목 11 계약) — candidates 배열 재정렬만으로 끝. **이제 segment_order가 idx 오름차순과 달라질 수 있다**(계약의 첫 실사용). idx 재번호 안 함(항목 12·15와 일관 — idx는 검출 번호일 뿐 순서의 원천 아님). `segmentation-store.ts`·`LineSegmentsView.tsx`의 낡은 주석("idx 오름차순 = segment_order")을 실제 계약으로 고침(코드 변경은 주석뿐).
- 새 의존성 0, 새 Expo API 0(RN 기본 컴포넌트 + 로컬 상태만 — docs 확인 대상 없음). 앱 본체 Expo Go 불변(패널은 개발 빌드 전용 경로 — 진입 전 흐름 변화 없음).

**검증 결과 (게이트 3종)**
- `npx tsc --noEmit` — 통과 (에러 0)
- `npx expo-doctor` — 통과 (20/20 checks)
- `npx expo export -p android` — 통과 (번들 무에러, 697 modules)

**커밋:** (이 커밋) feat: 보정 액션 '순서 지정' — 행별 ▲/▼ 재정렬 (segment_order 계약 첫 실사용)

**사람이 눈으로 볼 것 (실기 확인 필요):** 개발 빌드 — ① 줄 나누기 → 후보 ▲/▼로 순서 바꾸기 → 맨 위 ▲·맨 아래 ▼가 흐리게 비활성인지 ② 순서 바꾼 채 확정 → '한 줄씩'이 **바꾼 순서 그대로** 뜨는지(segment_order 반영 — 번호 갭·비오름차순은 정상) ③ 순서 바꾼 뒤 "자동 검출로 되돌리기" → 원래 순서·빼기 복구 ④ 재정렬 후 "위와 합치기"가 화면상 위 조각과 합치는지 ⑤ 뺀 조각에 ▲/▼가 없는지. Expo Go — 앱 본체 평소대로(패널은 안내 후퇴), 콘솔 에러 0.

**다음 후보 (작은 순)**
1. 편지함 목록 썸네일(1단계 다듬기) — 목록 행에 저장 이미지 미리보기(위젯 썸네일 재사용 가능) — 기획서 6.4 박물관 코어의 소품. 보정 액션 남은 둘(나누기·박스 조절)은 드래그 UI라 이보다 무겁다.
2. 보정 액션 '나누기'(TSD.md 4.5 ②) — 한 조각을 분리. 드래그 대신 "가로선 위치 탭/슬라이더"로 최소화할 수 있는지 설계부터.
3. TSD.md 5장 개정(react-native-android-widget 전제) + 6.3 processing_status 매핑(DECISIONS_NEEDED 9)·풀 편입 규칙(13)·미리보기 방식(14)·합치기 재크롭(15)·순서 지정(16) 명문화 — 사람 승인 후.

---

## 이터레이션 22 — 보정 액션 '합치기' (인접 조각 병합 — bbox 합집합 재크롭) (2026-07-18)

**한 일**
- 이터레이션 21의 다음 후보 ① 채택(스코프 v2 우선순위 2 '보정 UI'의 계속 — ②편지함 썸네일은 "위 둘이 막혔을 때"용, ③TSD 개정은 사람 승인 대기): **보정 액션 '합치기'(TSD.md 4.5 ① — 잘못 쪼개진 인접 조각 병합)**, 삭제(이터레이션 19)에 이어 5종 중 2호.
- `SegmentationReviewPanel.tsx`: 후보 행에 **"위와 합치기"** 버튼(첫 안 뺀 조각·뺀 조각엔 없음) — 바로 위의 안 뺀 후보와 병합. 병합 = 두 bbox **합집합 사각형을 cleanedFull에서 재크롭**: OpenCV 재로드 없이 **expo-image-manipulator `crop()`**(이터레이션 12 실측 API — 설치본 d.ts에서 `crop({originX,originY,width,height})`·`renderAsync()`·`saveAsync` 재확인, docs 확인 대상 새 API 0). 연쇄 병합 가능, 병합 조각은 위쪽 index 유지(재번호 안 함 — 항목 12와 일관). 실수 복구는 **"자동 검출로 되돌리기"**(원본 후보로 전체 리셋 — un-merge 스택은 과설계, 채택 근거는 DECISIONS_NEEDED 15). 재크롭 중 busy 잠금, 실패 시 목록 유지 + 인라인 안내(검토 작업 안 잃음). 검토 상태를 `candidates` 작업본 배열로 재구성(자동 검출 원본은 리셋 지점으로 보존).
- `segmentation.ts`: `SegmentationResult`에 **`imageWidth`/`imageHeight` 추가**(파이프라인이 이미 가진 값 — 정규화 bbox→픽셀 변환용, 메모리 전용·DB 저장 없음), `OUTPUT_JPEG_QUALITY` export(병합 조각도 같은 품질 0.9 — 화질 갈라짐 방지). 구성자가 `segmentLetterImage` 하나뿐이라 타입 추가 안전(tsc 검증).
- 새 의존성 0, 새 Expo API 0(expo-image-manipulator 기존 실측 API 재사용). 앱 본체 Expo Go 불변(보정 패널은 개발 빌드 전용 경로 — 진입 전 흐름 변화 없음). 저장 계층 변경 0(`persistSegmentationResult`는 받은 segments만 영구화 — 병합 조각도 후보와 같은 경로).

**검증 결과 (게이트 3종)**
- `npx tsc --noEmit` — 통과 (에러 0)
- `npx expo-doctor` — 통과 (20/20 checks)
- `npx expo export -p android` — 통과 (번들 무에러, 697 modules)

**커밋:** (이 커밋) feat: 보정 액션 '합치기' — 인접 조각 병합 (bbox 합집합 재크롭 + 자동 검출 리셋)

**사람이 눈으로 볼 것 (실기 확인 필요):** 개발 빌드 — ① 줄 나누기 → 아래 조각의 "위와 합치기" → 두 줄이 한 조각(합집합 크롭)으로 합쳐지고 번호가 위쪽 것으로 남는지 ② 연쇄 병합(3줄 → 1조각)과 병합 조각 "빼기"가 되는지 ③ "자동 검출로 되돌리기" → 원래 후보·빼기 상태 초기화 ④ 병합 조각으로 확정 → '한 줄씩'과 위젯 풀에 병합 크롭이 나오는지(bbox 합집합이 segment.bbox로 저장) ⑤ 중간 조각을 뺀 채 위아래 병합 시 사이 픽셀이 크롭에 포함되는 것(알려진 동작 — DECISIONS 15) 확인. Expo Go — 앱 본체 평소대로(패널은 안내 후퇴), 콘솔 에러 0.

**다음 후보 (작은 순)**
1. 보정 액션 '순서 지정'(TSD.md 4.5 ⑤) — 후보/확정 조각 노출 순서 재정렬(위/아래 이동 버튼 — 순수 JS, segment_order 계약(항목 11)의 첫 실사용). 5종 중 남은 것(나누기·박스 조절)은 드래그 UI라 더 무겁다.
2. 편지함 목록 썸네일(1단계 다듬기) — 목록 행에 저장 이미지 미리보기(위젯 썸네일 재사용 가능) — 기획서 6.4 박물관 코어의 소품.
3. TSD.md 5장 개정(react-native-android-widget 전제) + 6.3 processing_status 매핑(DECISIONS_NEEDED 9)·풀 편입 규칙(13)·미리보기 방식(14)·합치기 재크롭(15) 명문화 — 사람 승인 후.

---

## 이터레이션 21 — 위젯 미리보기 앱 화면 복제 (TSD.md 5.6 — Fast Refresh 디자인 루프) (2026-07-18)

**한 일**
- 이터레이션 20의 다음 후보 ② 채택(①합치기는 OpenCV 재크롭 + 개발 빌드 전용 검증이라 더 무겁고, ③TSD 개정은 사람 승인 대기): **위젯 미리보기를 앱 일반 화면에 복제**(TSD.md 5.6 · 기획서 3.9 완화 전략 — 위젯 레이아웃 변경이 재빌드일 수 있으니 디자인 반복은 앱 화면 Fast Refresh로, 빌드는 최종 검증에만).
- `src/widgets/letter-widget-design.ts` 신설 — **디자인 토큰 공유 모듈**(색·여백·반경·글자 크기·온보딩 문구·최소 크기 180×110dp). `LetterWidget.tsx`가 인라인 값 대신 이 토큰을 쓰도록 교체(레이아웃 구조·clickAction 변경 0 — 값의 출처만 이동). `LetterWidget` 자체는 앱 화면에 렌더 불가(FlexWidget 등은 위젯 트리 전용 + Expo Go에서 라이브러리 로드 throw 가능)라 **토큰 공유가 정합 유지 수단**(채택 근거는 DECISIONS_NEEDED 14).
- `src/screens/WidgetPreviewScreen.tsx` 신설: 벽지 흉내 배경 위에 **최소 크기(180×110dp) 위젯 프레임**을 같은 토큰으로 복제(FlexWidget↔View, ImageWidget↔Image contain, TextWidget↔Text 대응 주석 명시). ① **"다른 조각 뽑기"** — 실제 위젯과 같은 `pickRandomLetterWidgetThumbnail()` 호출(= 30분 갱신 한 번과 같은 로직·이력 공유) → **뽑기·최근 K개 제외(TSD.md 5.2)가 개발 빌드 없이 Expo Go에서 검증 가능**해짐 ② **온보딩 카드 강제 토글**(편지가 있어도 0장 분기 디자인 확인 — 기획서 P0 빈 위젯 첫인상) ③ 풀 크기·표시 중 엔트리 키 캡션(어느 조각이 뽑혔는지 눈 확인용). 파일 접근 실패는 위젯 태스크 핸들러와 같은 온보딩 후퇴.
- `LetterListScreen.tsx` 제목 행에 "위젯 미리보기" 진입 링크, `App.tsx` 화면 상태에 `widgetPreview` 추가(BUILD #11).
- 새 의존성 0, 새 Expo API 0(기존 실측 모듈 letter-widget-thumbs + RN 기본 컴포넌트만 — docs 확인 대상 없음). 앱 본체 Expo Go에서 그대로 돈다(미리보기 화면 자체가 Expo Go 검증용).

**검증 결과 (게이트 3종)**
- `npx tsc --noEmit` — 통과 (에러 0)
- `npx expo-doctor` — 통과 (20/20 checks)
- `npx expo export -p android` — 통과 (번들 무에러, 697 modules)

**커밋:** (이 커밋) feat: 위젯 미리보기 앱 화면 복제 (디자인 토큰 공유 + 뽑기/온보딩 토글)

**사람이 눈으로 볼 것 (실기 확인 필요):** **Expo Go에서 바로** — ① 편지함 → "위젯 미리보기" → 저장된 편지 썸네일이 위젯 카드 모양(180×110dp·편지지 톤)으로 뜨는지 ② "다른 조각 뽑기" 연타 → 조각이 바뀌고 최근에 나온 조각이 바로 반복되지 않는지(풀 4개 이상일 때), 캡션의 풀 개수·엔트리 키가 맞는지 ③ 온보딩 카드 토글 → "첫 편지를 기다리는 중" 2줄 디자인 ④ 콘솔 에러 0. 개발 빌드 — 미리보기와 실제 홈 위젯이 같은 디자인으로 보이는지(토큰 공유 검증), LetterWidget 토큰 교체 후에도 위젯이 이전과 똑같이 그려지는지.

**다음 후보 (작은 순)**
1. 보정 액션 '합치기'(TSD.md 4.5 ①) — 인접 조각 병합. bbox 합집합으로 cleanedFull에서 재크롭 필요(OpenCV 또는 expo-image-manipulator crop) — 삭제보다 한 단계 무겁다.
2. 편지함 목록 썸네일(1단계 다듬기) — 목록 행에 저장 이미지 미리보기(위젯 썸네일 재사용 가능) — 기획서 6.4 박물관 코어의 소품.
3. TSD.md 5장 개정(react-native-android-widget 전제) + 6.3 processing_status 매핑(DECISIONS_NEEDED 9)·풀 편입 규칙(13)·미리보기 방식(14) 명문화 — 사람 승인 후.

---

## 이터레이션 20 — 확정 시 위젯 갱신 연결 (확정 조각의 위젯 풀 편입 — 결정 4의 완성) (2026-07-18)

**한 일**
- 이터레이션 19의 다음 후보 ② 채택(①합치기보다 작고 제품 가치가 큼): **세그멘테이션 확정 → 위젯 풀 반영** — 위젯이 "편지 통째 썸네일"이 아니라 **확정된 문장 조각**을 보여주게 되는 순간(TSD.md 5.2 "전체 문장 풀 = 스캔해 확정한 모든 조각", 기획서 결정 4).
- `letter-widget-thumbs.ts`: **풀 편입 규칙(채택 근거는 DECISIONS_NEEDED 13)** — 확정 조각 1개 이상이면 그 편지의 통짜 썸네일을 지우고 `<letterId>__<granularity>-<idx>.jpg` 조각 썸네일로 **교체**(공존 시 같은 편지 이중 노출), ★통짜 후퇴면 cleanedFull로 통짜 썸네일 재생성(재확정 후에도 편지가 풀에서 안 빠지게). `syncLetterWidgetThumbnailsAfterSegmentation` 신설 + 다운스케일 로직을 `writeThumbFile` 헬퍼로 공용화(720px·JPEG 0.85 그대로). **최근 표시 이력 키를 letterId → 풀 엔트리 키**(TSD.md 5.2 "직전 표시 조각" — 통짜 키 = letterId라 기존 이력 파일과 하위 호환, 마이그레이션 0). `deleteLetterWidgetThumbnail` → `deleteLetterWidgetThumbnails`(통짜 + 조각 전부 삭제 — 편지 삭제 시 조각 썸네일 잔존 방지, LetterDetailScreen 호출부 갱신).
- `segmentation-store.ts`: `persistSegmentationResult`가 영구화 파일 위치(`PersistedSegmentationFiles`)를 반환 — 저장 로직 변경 0, 반환값만 추가.
- `SegmentationReviewPanel.tsx` 확정 흐름: persist 성공 → 위젯 풀 동기화(try/catch — **실패해도 확정은 유효**, 풀은 다음 확정 때 재동기화) → `updateLetterWidgetSafe()`(TSD.md 5.1 즉시 반영 — Expo Go에서는 no-op). 딥링크는 파일 이름 `__` 앞 letterId 파싱으로 여전히 "그 조각이 속한 편지 상세"(TSD.md 5.5) — LetterWidget 코드 변경 0(주석만 현행화).
- 새 의존성 0, 새 Expo API 0(expo-image-manipulator·expo-file-system 기존 실측 API 재사용 — docs 확인 대상 없음). 앱 본체 Expo Go 불변(확정 경로는 개발 빌드 전용, 위젯 호출은 no-op 안전 함수).

**검증 결과 (게이트 3종)**
- `npx tsc --noEmit` — 통과 (에러 0)
- `npx expo-doctor` — 통과 (20/20 checks)
- `npx expo export -p android` — 통과 (번들 무에러)

**커밋:** (이 커밋) feat: 확정 시 위젯 갱신 연결 (확정 조각의 위젯 풀 편입 + 이력 조각 단위)

**사람이 눈으로 볼 것 (실기 확인 필요):** 개발 빌드 — ① 조각 확정 직후 홈 위젯이 **줄 조각**(가로로 긴 손글씨 한 줄)으로 바뀌는지, 30분 갱신·재추가 때 같은 편지의 다른 조각/다른 편지로 도는지 ② 조각 위젯 탭 → 그 편지 상세가 뜨는지(딥링크 letterId 파싱) ③ 통짜 후퇴 재확정 → 위젯이 cleanedFull 통짜로 돌아오는지 ④ 편지 삭제 → 그 편지의 조각 썸네일이 위젯에서 사라지는지. Expo Go — 앱 본체 평소대로(확정 경로 진입 불가), 콘솔 에러 0.

**다음 후보 (작은 순)**
1. 보정 액션 '합치기'(TSD.md 4.5 ①) — 인접 조각 병합. bbox 합집합으로 cleanedFull에서 재크롭 필요(OpenCV 또는 expo-image-manipulator crop) — 삭제보다 한 단계 무겁다.
2. 위젯 미리보기를 앱 화면에 복제(TSD.md 5.6) — LetterWidget 레이아웃을 앱 일반 화면에서 같은 풀로 렌더(Fast Refresh 루프로 디자인 확정, Expo Go에서도 검증 가능한 소품).
3. TSD.md 5장 개정(react-native-android-widget 전제) + 6.3 processing_status 매핑(DECISIONS_NEEDED 9)·풀 편입 규칙(13) 명문화 — 사람 승인 후.

---

## 이터레이션 19 — 보정 액션 첫 구현: 삭제 (후보 "빼기"/"되살리기" 토글) (2026-07-18)

**한 일**
- 이터레이션 18의 다음 후보 ① 채택: TSD.md 4.5 보정 액션 5종 중 **④ 삭제**(얼룩·노이즈 가짜 조각 제거) — 5종 중 가장 값싼 것(순수 JS 필터링, OpenCV 재크롭 불필요)부터. `SegmentationReviewPanel.tsx`의 후보 목록(review 단계)에 행별 **"빼기" 토글**: 뺀 조각은 흐리게(취소선 번호 + 이미지 반투명) 남고 **"되살리기"로 원탭 복구**(확정 전엔 아무것도 안 사라져 확인 다이얼로그 없음 — 기획서 2.6 마찰 금지). 확정 버튼이 남은 조각만 새긴다(부분 제외 시 라벨 "남은 조각 N개로 새기기").
- **완료 조건(기획서 2.6) 유지:** 전부 빼면 확정 버튼 숨김 + 안내("조각을 전부 뺐어요 — 통째로만 저장할 수 있어요") + ★통짜 버튼만. `confirmResult`를 wholeOnly 불리언 → `segmentsToKeep` 배열로 바꿔 통짜 후퇴(빈 배열)와 부분 확정이 한 경로 — status 매핑(항목 9) 그대로.
- **재번호 안 함(채택 근거는 DECISIONS_NEEDED 12):** 남는 조각의 index(→ segment.idx·`line-<index>.jpg`·bbox)는 유지 — idx는 순서 용도뿐이라 갭 무해, 후보 화면 번호와 저장물 대응 유지. `persistSegmentationResult`는 받은 segments만 영구화하므로 **저장 계층 변경 0.**
- 새 의존성 0, 새 Expo API 0(RN 기본 컴포넌트 + 로컬 상태만 — docs 확인 대상 없음). 앱 본체 Expo Go 불변(패널 진입 전 흐름 변화 없음).

**검증 결과 (게이트 3종)**
- `npx tsc --noEmit` — 통과 (에러 0)
- `npx expo-doctor` — 통과 (20/20 checks)
- `npx expo export -p android` — 통과 (번들 무에러, 695 modules)

**커밋:** (이 커밋) feat: 보정 액션 '삭제' — 후보 빼기/되살리기 토글 + 남은 조각만 확정

**사람이 눈으로 볼 것 (실기 확인 필요):** 개발 빌드 — ① 줄 나누기 → 후보에서 "빼기" → 행이 흐려지고 "되살리기"로 돌아오는지 ② 일부 뺀 채 "남은 조각 N개로 새기기" → '한 줄씩'에 남은 조각만 뜨는지(빠진 번호 갭은 정상) ③ 전부 빼면 확정 버튼이 사라지고 통짜 저장만 되는지(저장 후 status='cleaned' 안내). Expo Go — 앱 본체 평소대로(패널은 안내 후퇴 그대로), 콘솔 에러 0.

**다음 후보 (작은 순)**
1. 보정 액션 '합치기'(TSD.md 4.5 ①) — 인접 조각 병합. bbox 합집합으로 cleanedFull에서 재크롭이 필요(OpenCV 또는 expo-image-manipulator crop) — 삭제보다 한 단계 무겁다.
2. 세그멘테이션 확정 시 위젯 갱신 연결 — 확정/재확정 후 `updateLetterWidgetSafe` 호출(위젯 풀은 아직 통째 썸네일이라 지금은 no-op에 가깝다 — TSD.md 5.2 조각 풀 편입은 그 다음).
3. TSD.md 5장 개정(react-native-android-widget 전제) + 6.3 processing_status 매핑 명문화(DECISIONS_NEEDED 9) — 사람 승인 후.

---

## 이터레이션 18 — '한 줄씩' 보기 실동작 (확정 조각 segment_order 순 표시 + 다시 나누기) (2026-07-18)

**한 일**
- 이터레이션 17의 다음 후보 ① 채택: `src/screens/LineSegmentsView.tsx` 신설 — `processing_status='ready'`(조각 1개 이상 확정)면 '한 줄씩'에서 보정 패널 대신 **확정 조각(segment JOIN asset kind='segmentCrop', granularity='line')을 segment_order 순으로 세로 목록 표시**(TSD.md 4.6 "모드 전환은 렌더 시점의 이미지 선택"). 순서는 **segment_order(JSON 배열) 우선·idx 후퇴**(깨진 JSON·배열에 없는 id 방어 — 보정 액션 '순서 지정'이 나중에 이 배열을 고치는 계약이라 표시가 이를 따름). 스크럽·핀치 줌(TSD.md 6.5 완성형)은 다음 걸음(주석 명시 — DECISIONS_NEEDED 11).
- **"다시 나누기" 진입점 유지:** 조각 표시 하단 버튼 → 보정 패널(재확정 = 통째 교체, 항목 9) → 확정되면 자동으로 새 조각 표시 복귀(`reSegmenting` 로컬 상태 + onPersisted에서 해제). ★통짜 후퇴로 확정하면 status='cleaned'라 패널의 "통째로만 저장했어요" 안내가 남는다(4.6 "조각 없는 편지는 '통째로' 전용" 정합).
- `LetterDetailScreen.tsx`: 상세 쿼리에 `segment_order` 추가, '한 줄씩' 분기 3단(ready+표시 / 보정 패널 / 원본 없음 자리 문구). LineSegmentsView는 원본 이미지를 요구하지 않음(확정 조각만으로 그림). 'ready'인데 조각 0개인 비정상 상태는 "다시 나누기"만 노출(방어). `SegmentationReviewPanel.tsx` 확정 완료 문구를 실동작에 맞게 갱신("'한 줄씩' 보기에서 이 조각들을 만나요").
- 새 의존성 0, 새 Expo API 0(`getAllAsync`는 이터레이션 3에서 실측한 시그니처 그대로 — docs 확인 대상 없음).

**검증 결과 (게이트 3종)**
- `npx tsc --noEmit` — 통과 (에러 0)
- `npx expo-doctor` — 통과 (20/20 checks)
- `npx expo export -p android` — 통과 (번들 무에러, 695 modules)

**커밋:** (이 커밋) feat: '한 줄씩' 보기 실동작 (확정 조각 segment_order 순 표시 + 다시 나누기)

**사람이 눈으로 볼 것 (실기 확인 필요):** ① 개발 빌드 — 조각 확정(이터레이션 17 흐름) 후 '한 줄씩' 탭 → 조각이 위→아래 순서로 뜨는지, "다시 나누기" → 재확정 → 새 조각으로 바로 바뀌는지(통째 교체), 통짜 후퇴 후에는 '한 줄씩'이 보정 패널("통째로만 저장하기로 했어요")로 돌아가는지. ② Expo Go — 앱 본체가 평소대로 돌고(모든 편지가 'raw'라 이 화면은 안 뜸 — 보정 패널 그대로) 콘솔 에러 0인지.

**다음 후보 (작은 순)**
1. 보정 액션 1개부터(TSD.md 4.5) — 가장 값싼 삭제(후보 목록에서 가짜 조각 빼고 확정) 또는 합치기(인접 병합)를 SegmentationReviewPanel 후보 목록에 추가.
2. 세그멘테이션 확정 시 위젯 갱신 연결 — 확정/재확정 후 updateLetterWidgetSafe 호출(위젯 풀은 아직 통째 썸네일이라 지금은 no-op에 가깝다 — TSD.md 5.2 조각 풀 편입은 그 다음).
3. TSD.md 5장 개정(react-native-android-widget 전제) + 6.3 processing_status 매핑 명문화(DECISIONS_NEEDED 9) — 사람 승인 후.

---

## 이터레이션 17 — 세그멘테이션 보정 UI 1보: 실행 → 후보 목록 → 확정/★통짜 후퇴 (2026-07-18)

**한 일**
- 이터레이션 16의 다음 후보 ① 채택: `src/screens/SegmentationReviewPanel.tsx` 신설 — LetterDetailScreen '한 줄씩' 자리 화면에 ① "손글씨 줄 나누기" 실행(`segmentLetterImage`) ② 줄 조각 후보 목록(번호 + 크롭 이미지, 위→아래 순서) ③ "이 조각들로 새기기" 확정 = **`persistSegmentationResult` 첫 호출부** ④ **★"이 편지는 통째로만 저장"**(기획서 2.6 탈출구 — 상시 개방·원탭, 조각 폐기 후 cleanedFull만 영구화). 완료 조건도 2.6 그대로(유효 조각 1개 이상 또는 통짜 저장 — 조각 0개면 통짜 버튼만 노출). 보정 액션 5종(합치기/나누기/박스 조절/삭제/순서)과 오버레이 표시는 다음 걸음(TODO 주석 명시 — DECISIONS_NEEDED 10).
- **Expo Go 우아한 후퇴:** `segmentLetterImage`가 throw하는 안내("세그멘테이션은 개발 빌드에서만 동작해요…")를 에러 화면 문구로 그대로 표시 + 실행 버튼 밑에 "개발 빌드 전용" 캡션 — 앱 본체는 계속 돈다.
- `LetterDetailScreen.tsx`: 상세 쿼리에 `processing_status` 추가, 확정 후 `rowVersion` 트리거로 letter 행 재조회. 패널 시작 안내를 상태별로(`ready` = "다시 나누면 통째 교체", `cleaned` = "통째로만 저장하기로 했어요" — 항목 9 매핑). 원본 이미지 없는 편지·'한 문장씩'(0단계 종속)은 기존 자리 문구 유지.
- 새 의존성 0, 새 Expo API 0(RN 기본 컴포넌트 + 기존 실측 모듈만 — docs 확인 대상 없음).

**검증 결과 (게이트 3종)**
- `npx tsc --noEmit` — 통과 (에러 0)
- `npx expo-doctor` — 통과 (20/20 checks)
- `npx expo export -p android` — 통과 (번들 무에러, 694 modules)

**커밋:** (이 커밋) feat: 세그멘테이션 보정 UI 1보 (실행→후보 목록→확정/통짜 후퇴)

**사람이 눈으로 볼 것 (실기 확인 필요):** ① Expo Go — 상세 → '한 줄씩' → "손글씨 줄 나누기" 탭 → 안내 문구 후퇴가 뜨고 앱이 계속 도는지(콘솔 에러 0). ② 개발 빌드 — 실행 → 후보 목록이 뜨는지, "이 조각들로 새기기" 후 segment 행·`segments/<letterId>/` 파일이 생기고 재진입 시 "이미 확정돼 있어요"로 바뀌는지, "통째로만 저장" 경로도 동일 확인(**persistSegmentationResult 첫 실사용**). ③ 재확정(다시 나누기 → 새기기)이 통째 교체로 동작하는지(항목 9).

**다음 후보 (작은 순)**
1. '한 줄씩' 보기 실동작 — 확정 조각이 있으면(processing_status='ready') 보정 패널 대신 segment_order 순으로 조각 이미지 표시(TSD.md 4.6) + "다시 나누기" 진입점 유지.
2. 보정 액션 1개부터(TSD.md 4.5) — 가장 값싼 삭제(가짜 조각 제거) 또는 합치기(인접 병합)를 후보 목록에 추가.
3. TSD.md 5장 개정(react-native-android-widget 전제) + 6.3 processing_status 매핑 명문화(DECISIONS_NEEDED 9) — 사람 승인 후.

---

## 이터레이션 16 — segment 테이블 + 세그멘테이션 확정 산출물 영구화 계층 (2026-07-18)

**한 일**
- 이터레이션 15의 다음 후보 ② 채택: **segment 테이블 추가(TSD.md 6.3) + 확정 산출물 문서 폴더 이동·영구화 저장 계층** — 보정 UI(후보 ①)의 전제(세그먼트 결과를 저장·읽을 곳)라서 순서를 이렇게 정했다.
- `src/db.ts`: TSD.md 6.3 그대로 **segment 테이블 + idx_segment_letter 인덱스** 추가(`CREATE TABLE IF NOT EXISTS` — 기존 설치본도 다음 실행 때 얻는다). favorite(Phase 1)는 여전히 안 만듦. REFERENCES 절은 스키마 그대로 두되 PRAGMA foreign_keys는 안 켬 — 삭제는 명시 DELETE(DECISIONS_NEEDED 9).
- `src/segmentation-store.ts` 신설: `persistSegmentationResult(db, letterId, result)` — 보정 UI 확정 시점에 ① 캐시 후보 파일을 문서 폴더 `segments/<letterId>/`로 move ② asset(kind='cleanedFull'/'segmentCrop')·segment 행 INSERT(bbox는 JSON, ocr_text는 항상 NULL — 결정 2) ③ letter의 cleaned_asset_id·segment_order(JSON 배열)·processing_status 갱신(조각 있으면 'ready', 통짜 후퇴면 'cleaned') — 전부 한 트랜잭션. 재확정 = 통째 교체. 보조 함수 `deleteSegmentationRows`(트랜잭션 없음 — 호출자가 감쌈)·`deleteSegmentationDir` 분리 export.
- `LetterDetailScreen.tsx` 삭제 흐름 연결(TSD.md 6.5 삭제 시맨틱): 트랜잭션에 `deleteSegmentationRows`(letter 행 삭제보다 앞 — cleaned_asset_id를 letter에서 되읽음), 파일 정리에 `deleteSegmentationDir`(try/catch — 고아 파일만). 호출부 없던 시절의 잠재 구멍을 미리 막음.
- 코드 작성 전 API 실측(설치본 expo-file-system SDK 57): `File.move(destination): Promise<void>`·`File.size: number`(NativeFileSystem.types.d.ts), `Directory.delete()`가 네이티브 `deleteRecursively()`(FileSystemPath.kt — 내용까지 삭제). 새 의존성 0, app.json 변경 0. `persistSegmentationResult` 호출부는 아직 없음 — 보정 UI(다음)가 첫 호출자.

**검증 결과 (게이트 3종)**
- `npx tsc --noEmit` — 통과 (에러 0)
- `npx expo-doctor` — 통과 (20/20 checks)
- `npx expo export -p android` — 통과 (번들 무에러)

**커밋:** (이 커밋) feat: segment 테이블 + 세그멘테이션 확정 산출물 영구화 계층

**사람이 눈으로 볼 것 (실기 확인 필요):** ① Expo Go에서 앱 본체(저장·상세·삭제)가 평소대로 도는지 — segment 테이블은 빈 채로 초기화만 되고 삭제 흐름의 segment 정리는 no-op이어야 정상. ② 기존 설치본(이전 DB)에서 앱 재실행 시 segment 테이블이 조용히 생기는지. ③ DECISIONS_NEEDED 9(processing_status 매핑·명시 삭제) 리뷰 — TSD 개정 때 명문화 필요.

**다음 후보 (작은 순)**
1. 보정 UI 뼈대(기획서 2.6·TSD.md 4.5) 1보 — LetterDetailScreen '한 줄씩' 자리 화면에 "세그멘테이션 실행(개발 빌드 전용)" 진입점: segmentLetterImage 실행 → 후보 조각 목록 표시 → "이대로 확정"(persistSegmentationResult 첫 호출) + ★통짜 후퇴 버튼. 합치기/나누기 등 보정 액션은 그 다음. Expo Go에선 안내 문구 후퇴(이미 throw 메시지 있음).
2. '한 줄씩' 보기 실동작 — segment 테이블에 확정 조각이 있으면 LetterDetailScreen이 segment_order 순으로 조각 이미지를 그리기(TSD.md 4.6). (1과 합치면 커서 분리)
3. TSD.md 5장 개정(react-native-android-widget 전제로) + 6.3 processing_status 의미 명문화(DECISIONS_NEEDED 9) — 사람 승인 후.

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

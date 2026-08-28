# Lullaby Scene 1.1.13

## 주요 변경 사항

- 야간 열차 여정의 차륜 리듬을 분석해 루프 크로스페이드를 박자에 맞는 9.48초 지점으로 조정했습니다. 웹과 Android가 같은 타이밍을 사용합니다.
- 야간 페리 출항 초반에 실제 페리에서 녹음된 CC0 기적을 추가했습니다. 항법 신호의 긴 기적 기준인 4~6초에 맞춰 한 번만 울리고, 고역 감쇠와 짧은 항만 잔향으로 수면을 방해하지 않도록 거리를 두었습니다.
- 페리 도착 단계는 기존의 파도와 항만 도착음을 유지합니다. 보편적인 도착 기적 규정이 없어 별도의 기적은 반복하지 않습니다.

## 업데이트

- Android 버전: 1.1.13 (versionCode 22)
- 기존 1.1.x와 동일한 지속형 Android 릴리즈 키로 서명되어 기존 앱 위에 업데이트할 수 있습니다.
- 프로덕션 승격 전 웹 패리티 검사와 Android 단위 테스트를 다시 검증합니다.

---

## What's Changed

- Aligns the Night Train wheel-rhythm loop to its measured 9.48-second beat-matched crossfade point, shared by web and Android.
- Adds one sleep-safe, distant CC0 ferry horn near the start of cast-off. The single 4.8-second prolonged blast follows the 4–6 second signal duration and uses softened highs plus a short harbor reflection.
- Keeps the existing wave and harbor arrival recording without adding a repeated arrival horn, since there is no universal arrival-blast rule.

## Update

- Android version: 1.1.13 (versionCode 22)
- Signed with the same persistent Android release key used by existing 1.1.x releases for in-place updates.
- Production promotion re-verifies web parity checks and Android unit tests before merge.

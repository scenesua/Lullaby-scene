# Lullaby Scene 1.1.14

## 주요 변경 사항

- 야간 페리 출항 기적의 잔향 출력 게인 때문에 실제 소리가 거의 묻히던 문제를 수정했습니다.
- 출항 7초 지점부터 4.8초 동안 기적이 선명하게 들리도록 조정하고, 해당 구간에만 페리 배경음을 약 4dB 낮춰 자연스러운 거리감과 가청성을 함께 확보했습니다.
- 야간 열차의 박자에 맞춘 9.48초 크로스페이드와 기존 여정 동작은 그대로 유지합니다.

## 업데이트

- Android 버전: 1.1.14 (versionCode 23)
- 기존 1.1.x와 동일한 지속형 Android 릴리즈 키로 서명되어 기존 앱 위에 업데이트할 수 있습니다.
- 프로덕션 승격 전 웹 패리티 검사와 Android 단위 테스트를 다시 검증합니다.

---

## What's Changed

- Fixes an echo output-gain error that made the Night Ferry cast-off horn nearly inaudible in the final mix.
- Makes the 4.8-second horn clearly audible from 7 seconds into cast-off, while ducking the ferry ambience by about 4 dB only around the horn for natural distance and clarity.
- Keeps the Night Train's beat-matched 9.48-second crossfade and all other journey behavior unchanged.

## Update

- Android version: 1.1.14 (versionCode 23)
- Signed with the same persistent Android release key used by existing 1.1.x releases for in-place updates.
- Production promotion re-verifies web parity checks and Android unit tests before merge.

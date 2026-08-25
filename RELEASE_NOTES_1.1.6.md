# Lullaby Scene 1.1.6

## 주요 변경 사항

- HOOD Night를 포함한 모든 여정의 지속 배경음을 두 재생 채널이 겹쳐지는 equal-power 크로스페이드 방식으로 전환했습니다.
- 루프 경계에서 들리던 `치직`, `퍽` 소리와 순간적으로 음원이 꺼지는 듯한 끊김을 웹과 Android 양쪽에서 완화했습니다.
- 각 여정의 긴 배경음은 8초 동안 자연스럽게 교차하며, 출발·도착·단계 전환 효과음은 기존처럼 한 번만 재생됩니다.
- Android에서도 음원에 지정된 크로스페이드 시간을 항상 따르도록 재생 정책을 수정해, 단일 파일이 잘못 무간격 루프로 처리되지 않게 했습니다.
- HOOD Night의 일반 강도 기본 총성을 웹과 동일한 3~6발 범위로 맞췄습니다.
- 웹 서비스 워커와 여정 스크립트의 캐시 버전을 갱신해 기존 방문자도 수정된 재생 로직을 받도록 했습니다.

## 업데이트

- Android 버전: 1.1.6 (versionCode 15)
- 기존 1.1.x와 동일한 지속형 Android 릴리즈 키로 서명되어 기존 앱 위에 업데이트할 수 있습니다.

---

## What's Changed

- Moves every Journey ambience bed, including HOOD Night, to a dual-player equal-power crossfade loop.
- Reduces loop-boundary pops, crackle, and momentary dropouts on both web and Android.
- Crossfades long Journey beds over eight seconds while keeping departure, arrival, and stage-transition effects as one-shot audio.
- Makes Android honor an asset's explicit crossfade duration even when a single file had previously been treated as a seamless native loop.
- Aligns HOOD Night's normal-intensity basic gunfire range with the web implementation at 3–6 shots.
- Refreshes service-worker and Journey runtime cache versions so returning visitors receive the corrected playback code.

## Update

- Android version: 1.1.6 (versionCode 15)
- Signed with the same persistent Android release key used by the existing 1.1.x releases for in-place updates.

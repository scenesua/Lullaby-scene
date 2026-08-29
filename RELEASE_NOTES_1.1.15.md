# Lullaby Scene 1.1.15

## 주요 변경 사항

- 장면 화면의 기본 밝기를 원본 사진 밝기와 정확히 맞췄습니다. 노출과 블룸은 원본 위에서만 부드럽게 올라갔다가 기준 밝기로 돌아옵니다.
- 웹과 Android의 장면 화면에서 정적인 밝기 변화 대신 느린 노출 호흡 효과를 적용하고, 움직임 감소 설정에서는 효과를 억제합니다.
- 13개 웹 언어의 장면, 믹서, 프리셋, 여정 단계와 상태 문구 누락을 보완했습니다.
- 언어 변경 시 한국어와 영어가 번갈아 표시되거나, 재생 중인 여정 버튼과 상태가 준비 상태로 덮이는 문제를 수정했습니다.
- 열차를 포함한 7개 여정의 단계 순서와 재생 상태, 주요 브라우저 호환성 및 보안 검사를 다시 검증했습니다.

## 업데이트

- Android 버전: 1.1.15 (versionCode 24)
- 기존 1.1.x와 동일한 지속형 Android 릴리즈 키로 서명되어 기존 앱 위에 업데이트할 수 있습니다.
- 웹과 Android는 동일한 원본 밝기 기준과 번역 데이터를 사용합니다.

---

## What's Changed

- Restores the scene screen's default brightness to the original image. Exposure and bloom now rise above that baseline and return cleanly to it.
- Replaces flat brightness pulsing with a slow exposure-breathing effect on web and Android, while respecting reduced-motion preferences.
- Completes missing scene, mixer, preset, Journey phase, and status translations across all 13 web languages.
- Fixes language flicker and prevents active Journey controls or status text from being overwritten with the idle state.
- Re-validates all seven Journey timelines, major browsers, security hardening, and Android/web asset parity.

## Update

- Android version: 1.1.15 (versionCode 24)
- Signed with the same persistent Android release key used by existing 1.1.x releases for in-place updates.
- Web and Android now share the same original-image brightness baseline and translation coverage.

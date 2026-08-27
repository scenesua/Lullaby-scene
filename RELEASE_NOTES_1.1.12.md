# Lullaby Scene 1.1.12

## 주요 변경 사항

- 숲속 절 여정의 오디오 흐름을 다시 맞췄습니다. 1단계부터 숲길 발소리와 넓어진 대나무 숲 배경이 함께 들리고, 2단계부터 먼 법당의 싱잉볼이 이어집니다.
- 3단계에 진입하면 한국어 반야심경이 반드시 한 번 시작되고, 이후 목탁·멀리 걷는 자갈 발소리·반야심경 랜덤 이벤트가 서로 겹치지 않는 큐로 이어집니다.
- 대나무 숲은 음량을 더 낮추고 스테레오 폭을 넓힌 전용 소스를 사용하며, 튀는 피크를 부드럽게 제어했습니다. 싱잉볼은 디버그에서 확정한 최종 레벨과 중앙 위치를 실제 여정에도 동일하게 적용했습니다.
- 반야심경과 목탁에는 같은 법당 계열의 잔향을 적용했습니다. 여정용 반야심경은 기존의 먼 법당 방향감을 유지합니다.
- Mixer의 중복 `Forest Temple Singing Bowl` 항목을 제거해 일반 `Singing Bowl`만 남겼습니다.
- Mixer의 `반야심경 · 한국어 독송`은 공유마당의 공식 원본 녹음 전체를 기반으로 염불 음성 존재감을 높이고 법당 계열 잔향·에코와 다이내믹 제어를 적용했습니다. 인위적인 좌우 패닝은 적용하지 않으며 처음부터 끝까지 연속 루프합니다.
- 여정 단계명은 선택한 언어의 번역을 먼저 사용하고, 번역이 없을 때만 영어로 대체하도록 수정했습니다.
- 웹과 Android의 숲속 절 소스, 음량, 단계 전환 및 이벤트 동작을 같은 기준으로 맞췄습니다.

## 업데이트

- Android 버전: 1.1.12 (versionCode 21)
- 기존 1.1.x와 동일한 지속형 Android 릴리즈 키로 서명되어 기존 앱 위에 업데이트할 수 있습니다.

---

## What's Changed

- Forest Temple now starts both the listener-perspective path footsteps and the widened bamboo ambience in phase one, then brings in the distant temple singing bowl from phase two.
- Entering phase three always starts the Korean Heart Sutra once; afterwards moktak, distant gravel footsteps and sutra events continue through the non-overlapping temple event queue.
- The dedicated bamboo bed is quieter, wider and gently peak-controlled. The journey singing bowl uses the same final level and centered placement approved in debug.
- The Korean sutra and moktak share the same temple-room ambience; the journey sutra keeps its distant temple direction.
- Removes the duplicate `Forest Temple Singing Bowl` from Mixer and keeps the regular `Singing Bowl` source.
- Mixer `Heart Sutra · Korean` uses the complete official source recording with enhanced chant presence, temple-style room echo/reverb and dynamics, no artificial left/right panning, and continuous full-track looping.
- Journey phase labels now prefer the currently selected language and fall back to English only when a translation is unavailable.
- Web and Android Forest Temple sources, levels, phase transitions and event behavior are aligned.

## Update

- Android version: 1.1.12 (versionCode 21)
- Signed with the same persistent Android release key used by existing 1.1.x releases for in-place updates.

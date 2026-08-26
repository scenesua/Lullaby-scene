# Lullaby Scene 1.1.7

## 주요 변경 사항

- Android의 여정 단계 전환 시간을 웹과 동일하게 여정별로 조정했습니다. 열차, 페리, 우주선, 잠수함의 출발·도착 소리가 각 장면 특성에 맞는 속도로 배경음에 자연스럽게 이어집니다.
- HOOD Night가 같은 배경음을 자기 자신과 교차시키며 단계 경계에서 순간적으로 작아지던 문제를 제거했습니다.
- 항공기 3.5초, 나머지 여정 배경음 8초의 이중 equal-power 루프를 실제 음원 앞뒤 파형으로 재검증해 루프 경계의 순간 무음과 클릭 조건을 확인했습니다.
- HOOD Night 경찰 사이렌에 접근·통과·이탈 방향 이동과 도플러 속도 변화를 추가하고, 사건 위치를 향해 출동한 뒤 멀어지도록 다듬었습니다.
- 경찰 사이렌의 끝부분을 자연스럽게 페이드아웃하고, 개 짖는 이벤트를 더 선명한 CC0 녹음으로 교체해 거리 범위와 존재감을 조정했습니다.
- 총격, 고함, 유리 파손 등 HOOD 이벤트의 최소 거리와 공간 이동을 조정하고 웹과 Android의 이벤트 동작을 맞췄습니다.
- 여정 단계와 상태 문구의 한국어·영어 전환을 정리하고 Mixer에서 여정 이벤트 소스를 구분하기 쉽게 다듬었습니다.

## 업데이트

- Android 버전: 1.1.7 (versionCode 16)
- 기존 1.1.x와 동일한 지속형 Android 릴리즈 키로 서명되어 기존 앱 위에 업데이트할 수 있습니다.

---

## What's Changed

- Matches Android's departure and arrival transitions to the journey-specific timing already used on the web for Train, Ferry, Spacecraft, and Submarine.
- Removes a HOOD Night volume dip caused by crossfading the ambience bed against itself at stage boundaries.
- Revalidates the 3.5-second Aircraft loop and 8-second dual-player equal-power loops for every other Journey against the actual head and tail waveforms.
- Gives HOOD police sirens directional approach, pass-by, departure, and Doppler-rate movement toward the incident location.
- Adds a natural siren-tail fade and replaces the dog event with a clearer CC0 recording with a wider, more audible distance range.
- Aligns HOOD event distance and spatial behavior across Android and web, including gunfire, voices, and breaking glass.
- Refines Korean and English Journey state copy and improves Journey-event grouping in the Mixer.

## Update

- Android version: 1.1.7 (versionCode 16)
- Signed with the same persistent Android release key used by the existing 1.1.x releases for in-place updates.

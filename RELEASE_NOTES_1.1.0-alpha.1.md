# Lullaby Scene v1.1.0-alpha.1

이번 버전은 Lullaby Scene 2.0 방향의 첫 오디오 기반 프리릴리즈입니다. 완성형 2.0이 아니라, 기존 v1.0.3의 수면/환경음 재생 구조를 유지하면서 장면형 오디오 시스템으로 확장하기 위한 기반을 먼저 적용했습니다.

## 주요 변경 사항

### 랜덤 이벤트 재생 안정화
- 소스 또는 마스터 음소거 후 해제했을 때 랜덤 이벤트 스케줄러가 영구 정지할 수 있던 문제를 수정했습니다.
- mute/fade는 이벤트를 일시적으로 들리지 않게만 하고, pause/stop/release만 스케줄러 수명을 종료하도록 분리했습니다.
- 이벤트별 가중치와 cooldown을 지원해 드문 사건과 자주 발생하는 사건을 자연스럽게 섞을 수 있습니다.
- 같은 이벤트가 바로 연속해서 선택되는 현상을 줄였습니다.

### 기존 v1.0.3 에셋 재검토 기반
- 기존 에셋을 삭제하지 않고 runtime override로 선별 사용하도록 변경했습니다.
- 기술적으로 반복 가능하더라도 장면상 부자연스러운 짧은 열차 루프와 주기적 천둥은 primary continuous 재생에서 제외할 수 있도록 했습니다.
- 기존 파일은 향후 event/scene-only 레이어로 다시 잘라 재활용할 수 있도록 보존합니다.

### 확장형 오디오 매니페스트
- 기존 sound_library.json을 직접 훼손하지 않고 continuous/event 확장팩을 병합할 수 있습니다.
- 실제 APK에 존재하지 않는 staged asset은 런타임에서 자동 제외됩니다.
- 이후 검증된 음원 파일을 선언된 경로에 추가하면 별도 Kotlin 수정 없이 자동 활성화할 수 있습니다.

### 신규 프로젝트 생성 이벤트
- Fireplace crackle 이벤트 3종
- Train rail/body impact 이벤트 1종
- 생성 방식, SHA-256, 샘플레이트, 채널, 길이를 provenance ledger에 기록했습니다.

### 오디오 검증 도구
- 검증된 Public Domain/CC0 원본을 SHA-256으로 고정해 가져오는 importer를 추가했습니다.
- FFmpeg 기반 48 kHz Vorbis 변환, 음원 감사 및 provenance/license report 생성을 지원합니다.
- 향후 Rainy Night Train, Cabin in a Storm, Passenger Aircraft Cabin 등 scene asset을 같은 방식으로 확장할 수 있습니다.

## 현재 포함 범위

이번 프리릴리즈 APK에는 저장소에 실제로 커밋된 에셋만 포함됩니다. 추가로 확보해 둔 열차 주행, 강한 비, 천둥, 실내 강풍, cabin creak 등의 검증 음원은 importer/manifest 경로가 준비되어 있지만 아직 모두 패키징된 것은 아닙니다.

따라서 이 버전의 목적은 완성된 신규 장면팩 제공보다는 다음을 먼저 확인하는 것입니다.

- 기존 v1.0.3 재생 기능 회귀 여부
- 장시간 재생 안정성
- mute/unmute 후 랜덤 이벤트 정상 복귀
- weighted/cooldown 이벤트 동작
- 기존 에셋 override가 예상대로 적용되는지

## 알려진 제한 사항

- Passenger Aircraft Cabin을 포함한 신규 장면 UI/Scene State/Scene Arc는 아직 완성되지 않았습니다.
- 일부 v1.0.3 자산은 기존 provenance가 unknown이라 공개 2.0 전에 라이선스를 재확인하거나 검증된 음원으로 교체할 예정입니다.
- release APK는 현재 프로젝트 설정상 debug signing key로 서명됩니다. 테스트/프리릴리즈 설치용이며 스토어 최종 배포 서명본이 아닙니다.

## 설치

Android 8.0(API 26) 이상을 대상으로 합니다.

이 버전은 프리릴리즈입니다. v1.0.3을 유지하고 싶은 경우 기존 APK를 별도로 보관하는 것을 권장합니다.

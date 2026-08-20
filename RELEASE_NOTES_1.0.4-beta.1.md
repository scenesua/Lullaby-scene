# Lullaby Scene 1.0.4 beta 1

안드로이드 앱의 체감 버벅임과 불필요한 백그라운드 작업을 줄이는 성능 최적화 프리릴리즈입니다. 기능과 믹스 동작은 유지하면서 재생 엔진, MediaSession 상태 전달, Compose 재구성 경로를 정리했습니다.

## 주요 변경 사항

- 소스마다 만들던 전용 오디오 스레드를 앱 전체 공유 재생 스레드 하나로 통합했습니다.
- 연속 소스의 ExoPlayer를 실제 재생 시점에 지연 생성하고, 단일 seamless 루프는 ExoPlayer 1개만 사용하도록 줄였습니다.
- 여러 소스를 한 번에 켤 때 호출 스레드를 막던 동기식 플레이어 생성 대기를 제거했습니다.
- 짧은 이벤트 음원 로딩을 IO 스레드로 이동해 프리셋 적용과 소스 활성화 순간의 멈칫거림을 줄였습니다.
- 마스터 볼륨 드래그는 UI에서 즉시 반응하고 MediaSession 명령은 약 25 Hz로 합쳐 보내도록 변경했습니다.
- 엔진 snapshot JSON 직렬화와 UI측 역직렬화를 메인 스레드 밖으로 이동했습니다.
- 취침 타이머 상태 갱신을 2 Hz에서 1 Hz로 줄이고, 타이머 변화가 믹서·프리셋·설정 화면 전체를 다시 그리지 않도록 상태 구독을 분리했습니다.
- 소스 카탈로그, 매니페스트, trim gain, 활성 소스 수를 캐시해 반복 검색과 임시 컬렉션 생성을 줄였습니다.
- 믹서 행이 전체 엔진 snapshot 대신 자기 소스 상태만 받도록 바꿔 불필요한 Compose 재구성을 줄였습니다.
- 동일한 상태의 중복 publish 및 중복 명령을 건너뛰고, ViewModel 종료 시 MediaController와 재접속 작업을 확실히 정리합니다.
- 오디오 fade 자체는 부드러운 갱신 주기를 유지하면서 UI/MediaSession publish 빈도만 낮췄습니다.

## 테스트 권장 항목

프리셋을 연속으로 바꾸기, 여러 소스를 동시에 켜고 끄기, 마스터 볼륨을 빠르게 드래그하기, 취침 타이머 실행 중 화면 이동, 백그라운드 재생 후 앱 복귀를 특히 확인해 주세요.

---

## What's Changed

This Android prerelease focuses on reducing UI jank and unnecessary background work without changing the intended mix or playback behavior.

- Replaced per-source audio threads with one shared playback thread.
- Lazily creates continuous ExoPlayers and uses only one player for a single seamless loop.
- Removed synchronous player construction waits that could stall preset/source activation.
- Loads short event samples on IO instead of the service/UI thread.
- Keeps master-volume drag feedback local while coalescing MediaSession commands to about 25 Hz.
- Moves full engine snapshot JSON serialization and parsing off the main thread.
- Reduces sleep-timer snapshot frequency from 2 Hz to 1 Hz and isolates timer updates from unrelated Compose screens.
- Caches source catalog, manifest, trim-gain and active-source lookups to remove hot-path allocations and repeated scans.
- Narrows mixer row state so unrelated source changes can skip recomposition.
- Skips duplicate engine publishes/commands and releases controller/reconnect work with the ViewModel.
- Keeps smooth audio fade updates while lowering UI/MediaSession publication frequency.

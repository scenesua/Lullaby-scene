# Lullaby Scene 1.1.0

## 주요 변경 사항

- `Passenger Aircraft Cabin`, `Overnight Train Journey`, `Night Ferry Journey`, `Spacecraft Drift`, `Submarine Voyage`까지 다섯 개의 잠의 여정을 제공합니다.
- 사용자가 정한 전체 수면 시간 안에서 출발, 장거리 이동, 접근과 도착이 순서대로 진행되며 이전·다음 단계 이동과 타임라인 탐색을 지원합니다.
- 엔진 존재감, 활동감, 움직임의 질감, 밤의 깊이를 조절하는 Semantic Macro Control을 각 여정에 맞게 적용했습니다.
- 항공기 오디오의 합성 저역과 주기적인 음량 흔들림을 제거하고, 실제 기내 질감을 유지하도록 톤 처리와 루프 구성을 개선했습니다.
- Tone, Body, Space, Dynamics, Output과 10밴드 EQ를 한곳에서 관리하는 FX 화면을 추가했습니다. 설정은 앱에 저장되며 0%에서는 해당 처리가 바이패스됩니다.
- 환경음 랜덤 이벤트의 반복, 재생 간격과 음소거 복귀 동작을 개선하고 문제가 확인된 일부 기존 루프를 재생 목록에서 제외했습니다.
- Android 재생 엔진의 오디오 스레드와 플레이어 수를 줄이고 자산 로딩, 상태 인코딩, 타이머·장면 갱신이 UI 스레드를 방해하지 않도록 정리했습니다.
- 동일한 EQ·FX 상태를 반복 적용하지 않도록 해 장시간 재생 시 불필요한 DSP 작업과 기기별 오디오 끊김 가능성을 줄였습니다.
- 웹 플레이어에서도 다섯 개 여정, 타임라인, 매크로, 믹서, 취침 타이머와 저장된 장면을 사용할 수 있습니다.
- 웹의 Journey 전환을 짧게 교차 페이드하고, 빠른 탐색에서 오래된 재생 요청이 뒤늦게 살아나는 문제를 막았습니다.
- 서비스워커 갱신 시 대형 오디오 전체를 한꺼번에 내려받지 않도록 해 재생 중 네트워크 경쟁과 초기 캐시 부담을 줄였습니다.
- GitHub Releases 기반 업데이트 확인과 선택형 프리릴리즈 채널, Android/Web 장면 레시피 공유를 포함합니다.

## 참고

- 이 릴리즈에는 1.1.0-alpha.1부터 alpha.4까지 검증한 기능과 안정화 변경이 모두 포함됩니다.
- Forest Night, Beach/Ocean, City Night는 기존 심플 씬과 역할이 겹쳐 새로운 Journey로 추가하지 않았습니다.
- Rainy Cafe와 Fireplace는 향후 Living Scene 확장 후보로 유지합니다.
- 이번 GitHub Release의 APK는 요청에 따라 아직 서명하지 않은 개발용 산출물입니다. 기존 설치본 위에 업데이트하려면 후속 서명 릴리즈가 필요합니다.

---

## What's Changed

- Ships five Sleep Journeys: `Passenger Aircraft Cabin`, `Overnight Train Journey`, `Night Ferry Journey`, `Spacecraft Drift`, and `Submarine Voyage`.
- Fits departure, long travel, approach, and arrival into the selected sleep duration, with timeline seeking and previous/next phase controls.
- Adds journey-specific semantic controls for engine presence, activity, motion texture, and night depth.
- Removes synthetic low-end and periodic gain wobble from the aircraft scene while preserving more of the original cabin recording.
- Adds a persistent FX screen for Tone, Body, Space, Dynamics, Output, and the existing 10-band EQ. Zero-valued processing remains bypassed.
- Improves random-event spacing, repetition, and mute recovery, and removes confirmed-problematic legacy loops from playback rotation.
- Reduces Android playback threads and player allocation while moving asset loading, snapshot encoding, timer work, and scene updates away from UI-critical paths.
- Skips redundant EQ and FX writes to reduce unnecessary DSP work and device-specific glitches during long playback.
- Brings all five Journeys, timeline controls, macros, Mixer, Sleep Timer, and saved scenes to the web player.
- Crossfades Journey role changes and prevents stale play requests from resurfacing after rapid seeking.
- Stops service-worker updates from preloading the entire audio library, reducing cache pressure and network competition during playback.
- Includes GitHub Releases update checks, an opt-in prerelease channel, and Android/Web scene-recipe sharing.

## Notes

- This release rolls up the features and stability work tested from 1.1.0-alpha.1 through alpha.4.
- Forest Night, Beach/Ocean, and City Night remain Simple Scenes instead of becoming redundant Journeys.
- Rainy Cafe and Fireplace remain candidates for future Living Scene work.
- As requested, the APK attached to this GitHub Release is currently an unsigned developer artifact. A later signed release is required for in-place updates over existing installs.

---

## 主な変更点

- `Passenger Aircraft Cabin`、`Overnight Train Journey`、`Night Ferry Journey`、`Spacecraft Drift`、`Submarine Voyage`の5つの睡眠ジャーニーを追加しました。
- 指定した睡眠時間の中で出発、長距離移動、接近、到着が順番に進み、タイムライン移動と前後フェーズ操作に対応します。
- エンジンの存在感、活動感、動きの質感、夜の深さを各ジャーニーに合わせて調整できます。
- 航空機シーンの合成低域と周期的な音量揺れを取り除き、元の機内録音の質感をより保つよう改善しました。
- Tone、Body、Space、Dynamics、Output、10バンドEQをまとめたFX画面を追加し、設定を保存できるようにしました。
- Androidの再生スレッド、プレイヤー生成、アセット読み込み、状態更新を整理し、同じEQ・FX値の不要な再適用も省きました。
- Webプレイヤーに5つのジャーニーと各種操作を追加し、フェーズ切り替えの短いクロスフェードと高速シーク時の競合防止を実装しました。
- Service Worker更新時に全オーディオを一括取得しないよう変更し、再生中の通信競合とキャッシュ負荷を減らしました。

## 備考

- 1.1.0-alpha.1からalpha.4までに検証した機能と安定化内容を統合したリリースです。
- Forest Night、Beach/Ocean、City Nightは重複するJourneyにはせず、Simple Sceneとして維持します。
- Rainy CafeとFireplaceは将来のLiving Scene候補として残しています。
- 今回のGitHub Releaseに添付するAPKは、要望により未署名の開発用成果物です。既存インストールへの上書き更新には、後続の署名済みリリースが必要です。

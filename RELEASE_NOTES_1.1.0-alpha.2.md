# Lullaby Scene 1.1.0-alpha.2

## 주요 변경 사항

- 앱을 열면 믹서보다 장면을 먼저 고를 수 있도록 새로운 `씬` 화면을 기본 화면으로 추가했습니다.
- 첫 번째 살아있는 장면으로 `Passenger Aircraft Cabin`을 추가하고 실제 여객기 기내 녹음을 수면용 기내 질감으로 가공해 적용했습니다.
- 기존 30분·60분·120분 Scene Arc 대신, 사용자가 4시간부터 12시간까지 30분 단위로 전체 수면·여정 시간을 정할 수 있도록 변경했습니다.
- 여객기 장면은 출발 지상 이동 → 이륙 → 상승 → 장거리 순항 → 하강 → 최종 접근 → 착륙 후 지상 이동 순서로 진행되며, 출발·도착 구간은 수면시간에 비례해 늘어나지 않고 가운데 순항 시간이 전체 시간에 맞춰 조정됩니다.
- 좌석벨트 사인은 출발·이륙·상승과 도착 전 구간에 맞춰 상태가 바뀌며, 순항 중에는 가벼운 난기류와 작은 기내 활동이 일정한 반복이 아닌 랜덤 간격으로 더해집니다.
- 엔진 존재감, 기내 활동감, 난기류, 밤의 깊이를 조절하는 Semantic Macro Control을 추가했습니다.
- 엔진의 거리감이 음량과 고역 감쇠에 함께 반영되고, 비행 단계와 랜덤 이벤트가 내부 공간·톤 처리에 자연스럽게 반영됩니다.
- 앱 실행 후 GitHub Releases의 새 안정 버전을 자동으로 확인하고, 설정 화면에서도 직접 업데이트를 확인할 수 있도록 했습니다.
- 새 버전이 있으면 릴리즈 노트를 확인한 뒤 APK를 내려받아 검증하고 Android 설치 화면으로 이어갈 수 있으며, 알림을 24시간 숨길 수도 있습니다.

## 참고

- 현재 포함된 실제 항공기 음원은 사용자가 제공한 기내 녹음을 가공한 베드입니다. 전용 이륙·착륙·좌석벨트 차임 녹음은 아직 포함하지 않았으며, 해당 단계는 현재 상태 변화와 내부 DSP로 표현됩니다.
- 기존 믹서, 프리셋, 백그라운드 재생, 취침 타이머, EQ 및 음원별 볼륨 조절은 계속 사용할 수 있습니다.
- 현재 내부 공간 처리는 거리·음량·고역 감쇠 중심의 첫 구현이며, 완전한 HRTF/바이노럴 공간 렌더러는 아닙니다.
- 업데이트 확인은 안정 릴리즈 채널을 기준으로 하므로 프리릴리즈끼리는 자동 업데이트 대상으로 표시되지 않습니다.
- 이번 APK는 테스트용 서명으로 빌드된 프리릴리즈입니다.

---

## What's Changed

- Added a new scene-first home screen so the app opens with places to enter rather than the mixer alone.
- Added `Passenger Aircraft Cabin` as the first living scene, using a real passenger-cabin recording processed into a sleep-friendly cabin bed.
- Replaced the old 30/60/120-minute Scene Arc with a whole sleep/journey duration selectable from 4 to 12 hours in 30-minute steps.
- The aircraft journey now follows taxi-out → takeoff → climb → long cruise → descent → final approach → post-landing taxi. Departure and arrival phases keep bounded absolute durations while the cruise section expands to fit the selected total time.
- The seat-belt state follows departure and arrival windows, while light turbulence and small cabin-activity events are distributed at randomized intervals during cruise instead of repeating on a fixed cycle.
- Added semantic controls for engine presence, cabin activity, turbulence, and night depth.
- Added internal spatial/tone processing so engine distance changes both level and high-frequency detail, with flight phases and random events temporarily shaping the same acoustic model.
- Added an automatic stable-release check through GitHub Releases after launch, plus a manual update check in Settings.
- When a newer stable version is available, the app can show release notes, download and verify the APK, hand it to Android's installer, and suppress the prompt for 24 hours.

## Notes

- The currently packaged aircraft audio is a processed bed made from the user-provided cabin recording. Dedicated takeoff, landing, and seat-belt chime recordings are not packaged yet; those phases currently use state and DSP changes.
- The existing mixer, presets, background playback, sleep timer, EQ, and per-source volume controls remain available.
- The current internal spatial processing is the first distance/tone implementation and is not yet a full HRTF/binaural renderer.
- Update checks follow the stable release channel, so prereleases do not automatically update one another.
- This APK is a prerelease build signed with the current test signing configuration.

---

## 主な変更点

- アプリ起動時にミキサーではなく場所から選べるよう、新しい `シーン` 画面を最初の画面として追加しました。
- 最初のリビングシーンとして `Passenger Aircraft Cabin` を追加し、実際の旅客機の機内録音を睡眠向けの機内ベッドとして加工して使用しています。
- 従来の30分・60分・120分の Scene Arc を廃止し、4時間から12時間まで30分単位で睡眠／旅程全体の長さを選べるようにしました。
- 航空機シーンは地上走行 → 離陸 → 上昇 → 長距離巡航 → 降下 → 最終進入 → 着陸後の地上走行の順に進みます。出発・到着側の区間は睡眠時間に比例して引き伸ばさず、中央の巡航時間が選択した総時間に合わせて変化します。
- シートベルトサインは出発・到着側の区間に合わせて変化し、巡航中には軽い揺れや小さな機内活動が固定周期ではなくランダムな間隔で加わります。
- エンジンの存在感、機内の活動感、揺れ、夜の深さを調整する Semantic Macro Control を追加しました。
- エンジンの距離が音量と高域の減衰の両方に反映され、飛行段階やランダムイベントも内部空間・トーン処理へ一時的に反映されます。
- 起動後に GitHub Releases の新しい安定版を自動確認し、設定画面から手動でも更新を確認できるようにしました。
- 新しい安定版がある場合はリリースノートを確認し、APK をダウンロード・検証して Android のインストール画面へ進めます。通知は24時間非表示にもできます。

## 備考

- 現在収録されている航空機音源は、ユーザー提供の機内録音を加工したベッドです。離陸・着陸・シートベルトチャイム専用の録音はまだ収録しておらず、現段階では状態変化と内部 DSP で表現します。
- 従来のミキサー、プリセット、バックグラウンド再生、スリープタイマー、EQ、音源ごとのボリューム調整は引き続き利用できます。
- 現在の内部空間処理は距離・音量・高域減衰を中心とした最初の実装で、完全な HRTF／バイノーラルレンダラーではありません。
- 更新確認は安定版リリースチャンネルを対象とするため、プレリリース同士は自動更新対象として表示されません。
- この APK は現在のテスト用署名設定でビルドされたプレリリースです。

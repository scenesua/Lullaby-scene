# Lullaby Scene 1.1.0-alpha.2

## 주요 변경 사항

- 앱을 열면 믹서보다 장면을 먼저 고를 수 있도록 새로운 `씬` 화면을 기본 화면으로 추가했습니다.
- 첫 번째 살아있는 장면으로 `Passenger Aircraft Cabin`을 추가하고 실제 여객기 기내 녹음을 수면용 순항 질감으로 가공해 적용했습니다.
- 장면이 `기내에 자리 잡는 중 → 장거리 순항 → 잠잠해지는 기내 → 깊은 밤` 순서로 천천히 변화하는 Scene State Engine을 추가했습니다.
- 장면의 흐름을 고정 순항 또는 30분·60분·120분으로 선택할 수 있는 Scene Arc를 추가했습니다.
- 엔진 존재감, 기내 활동감, 난기류, 밤의 깊이를 조절하는 Semantic Macro Control을 추가했습니다.
- 엔진의 거리감이 음량과 고역 감쇠에 함께 반영되고, 밤이 깊어질수록 더 부드럽게 들리도록 내부 공간·톤 처리를 추가했습니다.
- 앱 실행 후 GitHub Releases의 새 안정 버전을 자동으로 확인하고, 설정 화면에서도 직접 업데이트를 확인할 수 있도록 했습니다.
- 새 버전이 있으면 릴리즈 노트를 확인한 뒤 APK를 내려받아 검증하고 Android 설치 화면으로 이어갈 수 있으며, 알림을 24시간 숨길 수도 있습니다.

## 참고

- 기존 믹서, 프리셋, 백그라운드 재생, 취침 타이머, EQ 및 음원별 볼륨 조절은 계속 사용할 수 있습니다.
- 현재 내부 공간 처리는 거리·음량·고역 감쇠 중심의 첫 구현이며, 완전한 HRTF/바이노럴 공간 렌더러는 아닙니다.
- 업데이트 확인은 안정 릴리즈 채널을 기준으로 하므로 프리릴리즈끼리는 자동 업데이트 대상으로 표시되지 않습니다.
- 이번 APK는 테스트용 서명으로 빌드된 프리릴리즈입니다.

---

## What's Changed

- Added a new scene-first home screen so the app opens with places to enter rather than the mixer alone.
- Added `Passenger Aircraft Cabin` as the first living scene, using a real passenger-cabin recording processed into a sleep-friendly cruise texture.
- Added a Scene State Engine that slowly moves through `Settling → Long Cruise → Drowsy Cabin → Deep Night`.
- Added Scene Arc choices for steady cruise or 30, 60, and 120 minute progressions.
- Added semantic controls for engine presence, cabin activity, turbulence, and night depth.
- Added internal spatial/tone processing so engine distance changes both level and high-frequency detail, while deeper night settings soften the cabin further.
- Added an automatic stable-release check through GitHub Releases after launch, plus a manual update check in Settings.
- When a newer stable version is available, the app can show release notes, download and verify the APK, hand it to Android's installer, and suppress the prompt for 24 hours.

## Notes

- The existing mixer, presets, background playback, sleep timer, EQ, and per-source volume controls remain available.
- The current internal spatial processing is the first distance/tone implementation and is not yet a full HRTF/binaural renderer.
- Update checks follow the stable release channel, so prereleases do not automatically update one another.
- This APK is a prerelease build signed with the current test signing configuration.

---

## 主な変更点

- アプリ起動時にミキサーではなく場所から選べるよう、新しい `シーン` 画面を最初の画面として追加しました。
- 最初のリビングシーンとして `Passenger Aircraft Cabin` を追加し、実際の旅客機の機内録音を睡眠向けの巡航テクスチャとして加工して使用しています。
- `機内に落ち着く → 長距離巡航 → 静かな機内 → 深夜` へゆっくり変化する Scene State Engine を追加しました。
- 固定巡航、30分、60分、120分から流れを選べる Scene Arc を追加しました。
- エンジンの存在感、機内の活動感、揺れ、夜の深さを調整する Semantic Macro Control を追加しました。
- エンジンの距離が音量と高域の減衰の両方に反映され、夜が深くなるほど柔らかく聞こえる内部空間・トーン処理を追加しました。
- 起動後に GitHub Releases の新しい安定版を自動確認し、設定画面から手動でも更新を確認できるようにしました。
- 新しい安定版がある場合はリリースノートを確認し、APK をダウンロード・検証して Android のインストール画面へ進めます。通知は24時間非表示にもできます。

## 備考

- 従来のミキサー、プリセット、バックグラウンド再生、スリープタイマー、EQ、音源ごとのボリューム調整は引き続き利用できます。
- 現在の内部空間処理は距離・音量・高域減衰を中心とした最初の実装で、完全な HRTF／バイノーラルレンダラーではありません。
- 更新確認は安定版リリースチャンネルを対象とするため、プレリリース同士は自動更新対象として表示されません。
- この APK は現在のテスト用署名設定でビルドされたプレリリースです。

# Lullaby Scene 1.1.0-alpha.1

## 주요 변경 사항

- 환경음의 작은 사건들이 더 자연스럽게 들리도록 랜덤 이벤트 재생 방식을 개선했습니다.
- 음소거 후 다시 소리를 켰을 때 일부 랜덤 이벤트가 더 이상 재생되지 않던 문제를 수정했습니다.
- 같은 이벤트가 지나치게 연속해서 반복되지 않도록 조정하고, 드문 소리는 충분한 간격을 두고 나타나도록 개선했습니다.
- 기존 환경음 자산을 다시 검토해 반복감이 강하거나 장면에 어울리지 않는 일부 루프를 재생 목록에서 조정했습니다.
- 벽난로의 작은 장작 튀는 소리와 열차의 레일·차체 충격음을 새로운 랜덤 이벤트로 추가했습니다.
- 앞으로 비, 천둥, 바람, 열차 및 장면 전용 환경음을 더 쉽게 확장할 수 있도록 오디오 자산 구조를 정리했습니다.
- 아직 추가되지 않은 확장 음원이 있어도 현재 포함된 소리만으로 안전하게 재생되도록 안정성을 높였습니다.

## 참고

- 이번 버전은 새로운 장면 시스템을 준비하기 위한 프리릴리즈이며, Passenger Aircraft Cabin을 포함한 신규 장면은 아직 완성되지 않았습니다.
- 기존 프리셋, 백그라운드 재생, 취침 타이머 및 음원별 볼륨 조절은 계속 사용할 수 있습니다.
- 이번 APK는 테스트용 서명으로 빌드된 프리릴리즈입니다.

---

## What's Changed

- Improved random event playback so small ambient details occur more naturally.
- Fixed an issue where some random events could stop permanently after muting and unmuting audio.
- Reduced immediate repetition of the same event and added longer spacing for intentionally rare sounds.
- Reviewed the existing ambience library and adjusted several loops that felt overly repetitive or unsuitable for continuous playback.
- Added new fireplace crackle and train rail/body impact events.
- Reorganized the audio asset foundation to make future rain, thunder, wind, train, and scene-specific ambience easier to expand.
- Improved playback safety so the app continues using the sounds that are actually packaged even when optional expansion assets are not yet included.

## Notes

- This is a prerelease preparing the foundation for the new scene system. New scenes, including Passenger Aircraft Cabin, are not complete yet.
- Existing presets, background playback, sleep timer, and per-source volume controls remain available.
- This APK is a prerelease build signed with the current test signing configuration.

---

## 主な変更点

- 小さな環境音イベントがより自然に発生するよう、ランダムイベント再生を改善しました。
- ミュートを解除した後、一部のランダムイベントが再生されなくなる場合がある問題を修正しました。
- 同じイベントがすぐに連続しにくくし、まれな音には十分な間隔を設けるよう調整しました。
- 既存の環境音素材を再確認し、繰り返し感が強いものや連続再生に適さない一部のループを調整しました。
- 暖炉の小さな薪のはぜる音と、列車のレール・車体の衝撃音を新しいランダムイベントとして追加しました。
- 今後、雨・雷・風・列車・シーン専用環境音を追加しやすいよう、オーディオ素材の構成を整理しました。
- 追加予定の音源がまだ含まれていない場合でも、現在収録されている音だけで安全に再生できるよう安定性を高めました。

## 備考

- このバージョンは新しいシーンシステムの基盤を準備するためのプレリリースです。Passenger Aircraft Cabin を含む新しいシーンはまだ完成していません。
- 既存のプリセット、バックグラウンド再生、スリープタイマー、音源ごとのボリューム調整は引き続き利用できます。
- この APK は現在のテスト用署名設定でビルドされたプレリリースです。

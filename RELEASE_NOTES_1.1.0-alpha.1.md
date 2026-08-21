# Lullaby Scene 1.1.0-alpha.1

## 주요 변경 사항

- 환경음의 작은 사건들이 더 자연스럽게 들리도록 랜덤 이벤트 재생 방식을 개선했습니다.
- 음소거 후 다시 소리를 켰을 때 일부 랜덤 이벤트가 더 이상 재생되지 않던 문제를 수정했습니다.
- 같은 이벤트가 지나치게 연속해서 반복되지 않도록 조정하고, 드문 이벤트에는 충분한 재생 간격을 둘 수 있도록 개선했습니다.
- 기존 환경음을 다시 검토해 문제가 확인된 일부 카페 및 도시 루프를 재생 목록에서 제외했습니다.
- 벽난로의 작은 장작 튀는 소리 3종과 열차의 레일·차체 충격음 1종을 새로운 랜덤 이벤트로 추가했습니다.
- 실제 앱에 포함된 음원만 재생 대상으로 사용하도록 자산 확인 과정을 보강했습니다.

## 참고

- 아직 음원이 추가되지 않았거나 작업이 완료되지 않은 신규 장면 및 확장 음원은 이번 버전에 포함하지 않았습니다.
- 기존 열차와 천둥 환경음은 대체 음원이 준비되기 전까지 기존 재생 방식을 유지합니다.
- 기존 프리셋, 백그라운드 재생, 취침 타이머 및 음원별 볼륨 조절은 계속 사용할 수 있습니다.
- 이번 APK는 테스트용 서명으로 빌드된 프리릴리즈입니다.

---

## What's Changed

- Improved random event playback so small ambient details occur more naturally.
- Fixed an issue where some random events could stop permanently after muting and unmuting audio.
- Reduced immediate repetition of the same event and added support for longer spacing between intentionally rare events.
- Reviewed the existing ambience library and removed several confirmed-problematic cafe and city loops from playback rotation.
- Added three new fireplace crackle events and one train rail/body impact event.
- Strengthened asset validation so only audio files actually packaged with the app are considered for playback.

## Notes

- New scenes and expansion audio that have not yet been added or completed are not included in this build.
- Existing train and thunder ambience remain on their previous playback setup until replacement audio is ready.
- Existing presets, background playback, sleep timer, and per-source volume controls remain available.
- This APK is a prerelease build signed with the current test signing configuration.

---

## 主な変更点

- 小さな環境音イベントがより自然に発生するよう、ランダムイベント再生を改善しました。
- ミュートを解除した後、一部のランダムイベントが再生されなくなる場合がある問題を修正しました。
- 同じイベントがすぐに連続しにくくし、まれなイベントには十分な再生間隔を設定できるよう改善しました。
- 既存の環境音素材を再確認し、問題が確認された一部のカフェおよび都市ループを再生対象から外しました。
- 暖炉の小さな薪のはぜる音3種と、列車のレール・車体の衝撃音1種を新しいランダムイベントとして追加しました。
- 実際にアプリへ収録されている音源だけを再生対象として扱うよう、素材確認処理を強化しました。

## 備考

- まだ音源が追加されていない、または作業が完了していない新規シーンや拡張音源は今回のビルドに含まれていません。
- 既存の列車と雷の環境音は、代替音源が準備されるまで従来の再生方式を維持します。
- 既存のプリセット、バックグラウンド再生、スリープタイマー、音源ごとのボリューム調整は引き続き利用できます。
- この APK は現在のテスト用署名設定でビルドされたプレリリースです。

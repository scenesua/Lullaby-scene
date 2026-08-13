# Lullaby Scene 1.0.3

## 주요 변경 사항

- 믹서 화면을 Lullaby Scene의 검정·노랑 색상에 맞춰 새롭게 다듬었습니다.
- 소스 상태와 음량을 한눈에 확인할 수 있도록 카드, 슬라이더, 활성 표시 및 카테고리 구성을 개선했습니다.
- 음소거한 소스를 다시 켤 수 없던 문제를 수정했습니다.
- 귀뚜라미 소리의 일정한 박자가 반복 경계에서 어긋나던 문제를 위상 정렬 루프로 수정했습니다.
- 파도, 바람, 천둥 및 싱잉볼 소리가 루프 경계에서 꺼졌다 다시 켜지는 것처럼 들리던 구간을 다시 가공했습니다.
- 재생 전환 중 오류가 발생해도 현재 소리를 불필요하게 중단하지 않고 다음 자산으로 복구하도록 안정성을 높였습니다.
- 새 루프 자산은 세 번의 반복 경계 검사와 무음·클릭·음량 급변 검사를 통과했습니다.

## 참고

- 음원별 사용자 볼륨과 독립 재생, 프리셋, 백그라운드 재생 및 취침 타이머 동작은 기존과 동일하게 유지됩니다.
- 실제 출력은 기기, 이어폰 및 스피커 특성에 따라 다를 수 있습니다.

---

## What's Changed

- Refined the mixer with Lullaby Scene's black-and-yellow visual identity.
- Improved source cards, sliders, active-state feedback, and category navigation for faster scanning.
- Fixed an issue that could prevent a muted source from being unmuted.
- Rebuilt the cricket loop with cadence-aware phase alignment so its rhythm remains consistent across the boundary.
- Reprocessed ocean, wind, thunder, and singing-bowl loops to remove audible dropouts at repeat boundaries.
- Improved playback recovery so a transition error does not unnecessarily silence the current ambience.
- Verified the new loop assets across three repeat boundaries for silence, clicks, and abrupt level changes.

## Notes

- Per-source user volume and independent playback, presets, background playback, and the sleep timer behave exactly as before.
- Actual output may vary depending on your device, earphones, and speakers.

---

## 主な変更点

- ミキサー画面を Lullaby Scene の黒と黄色のビジュアルに合わせて刷新しました。
- 音源カード、スライダー、再生状態の表示、カテゴリーナビゲーションを見やすく改善しました。
- ミュートした音源を再び解除できない場合がある問題を修正しました。
- コオロギ音のリズムがループ境界でずれる問題を、周期に合わせた位相整列ループで修正しました。
- 波、風、雷、シンギングボウルのループ境界で、一度音が消えて再開するように聞こえる区間を再加工しました。
- 切り替え中にエラーが発生しても、現在の環境音を不要に止めず次の音源へ復旧するよう安定性を高めました。
- 新しいループ音源は3回の反復境界について、無音、クリック、急激な音量変化の検査を完了しています。

## 備考

- 音源ごとのユーザーボリュームと個別再生、プリセット、バックグラウンド再生、スリープタイマーの動作は従来と同じです。
- 実際の出力は端末・イヤホン・スピーカーの特性により異なる場合があります。

# Lullaby Scene 1.1.0-alpha.2

## 주요 변경 사항

- 앱을 열면 믹서보다 장면을 먼저 고를 수 있도록 새로운 `씬` 화면을 기본 화면으로 추가했습니다.
- 첫 번째 살아있는 장면으로 `Passenger Aircraft Cabin`을 추가하고 실제 여객기 기내 녹음을 장면 베드로 적용했습니다.
- 여객기 씬의 `6h / 8h / 10h`는 추천 고정 버튼으로 유지하되, 직접 입력은 `HH:MM` 형식으로 1분 이상 원하는 시간을 그대로 사용할 수 있습니다. 4시간보다 짧은 여정은 비행 단계 전체가 같은 순서를 유지한 채 비례 압축됩니다.
- 장시간 여정은 출발 지상 이동 → 이륙 → 상승 → 장거리 순항 → 하강 → 최종 접근 → 착륙 후 지상 이동 순서로 진행되며, 순항 구간이 전체 시간에 맞춰 늘어납니다.
- 좌석벨트 사인은 출발·이륙·상승과 도착 전 구간에 맞춰 상태가 바뀌며, 긴 순항 중에는 수면 보호 규칙을 따르는 가벼운 난기류와 작은 기내 활동이 랜덤 간격으로 더해집니다.
- 엔진 존재감, 기내 활동감, 난기류, 밤의 깊이를 조절하는 Semantic Macro Control을 추가했습니다.
- 여객기 오디오에서 합성 브라운 노이즈 레이어와 주기적인 볼륨 흔들림을 제거하고, 환풍 보조 레이어와 씬 톤 처리를 훨씬 약하게 조정해 원본 기내 질감을 덜 가리도록 수정했습니다.
- `프리셋` 옆에 독립 `FX` 탭을 추가했습니다. Tone(Warmth/Air), Body, Dynamics(Glue), Output(Loudness), 기존 10밴드 EQ를 한 곳에서 관리할 수 있으며 각 섹션은 접고 펼칠 수 있습니다.
- FX 값은 앱에 저장되며 0%에서는 해당 처리가 바이패스됩니다. 기존 EQ는 설정 화면에서 FX 탭으로 이동했습니다.
- 앱 실행 후 GitHub Releases에서 업데이트를 자동 확인하고, 설정 화면에서도 직접 업데이트를 확인할 수 있도록 했습니다.
- 업데이트 설정에 `프리릴리즈도 확인` 토글을 추가했습니다. 기본값은 꺼짐이며, 켜면 정식 버전뿐 아니라 alpha·beta·RC 빌드도 새 버전으로 확인합니다.

## 참고

- 현재 포함된 항공기 베드는 아직 짧게 가공된 기존 소스입니다. 더 긴 스테레오 원본으로 교체하면 공간감과 질감을 추가로 개선할 수 있습니다.
- 전용 이륙·착륙·좌석벨트 차임·기장/승무원 안내 녹음은 아직 포함하지 않았습니다.
- 기존 믹서, 프리셋, 백그라운드 재생, 취침 타이머 및 음원별 볼륨 조절은 계속 사용할 수 있습니다.
- 이번 APK는 테스트용 서명으로 빌드된 프리릴리즈입니다.

---

## What's Changed

- Added a scene-first home screen and `Passenger Aircraft Cabin` as the first living scene.
- Aircraft `6h / 8h / 10h` choices are now scene-specific recommendations only. Direct `HH:MM` entry accepts any positive duration from one minute upward; journeys shorter than four hours proportionally compress the full phase order.
- Long journeys retain taxi-out → takeoff → climb → cruise → descent → approach → post-landing taxi, with cruise expanding to fit the requested total.
- Removed the synthetic brown-noise rumble and periodic gain wobble from the aircraft scene, and greatly reduced the ventilation support layer and scene tone shaping so the cabin recording remains clearer.
- Added a dedicated `FX` tab next to Presets. It contains collapsible Tone (Warmth/Air), Body, Dynamics (Glue), Output (Loudness), and the existing graphic 10-band EQ.
- FX settings persist across launches and each amount is bypassed at 0%. The EQ entry has moved out of Settings into the FX rack.
- Added semantic controls for engine presence, cabin activity, turbulence, and night depth, plus sleep-safe randomized cruise events for sufficiently long journeys.
- Added automatic GitHub Releases update checks and an optional prerelease channel toggle.

## Notes

- The packaged aircraft bed is still the short processed legacy source. Replacing it with a longer stereo recording remains the next major sound-quality improvement.
- Dedicated takeoff, landing, seat-belt chime, and captain/cabin-crew recordings are not packaged yet.
- Mixer, Presets, background playback, sleep timer, and per-source volume controls remain available.
- This APK is a prerelease build signed with the current test signing configuration.

---

## 主な変更点

- 起動時に場所から選べるシーン画面を追加し、最初のリビングシーンとして `Passenger Aircraft Cabin` を実装しました。
- 航空機シーンの `6h / 8h / 10h` はおすすめの固定ボタンとして残し、直接入力は `HH:MM` 形式で1分以上の任意の時間をそのまま使用できます。4時間未満では飛行段階全体を同じ順序のまま比例圧縮します。
- 長時間の旅程では地上走行 → 離陸 → 上昇 → 巡航 → 降下 → 進入 → 着陸後の地上走行を維持し、巡航区間が総時間に合わせて伸びます。
- 航空機音声から合成ブラウンノイズのランブルと周期的な音量揺れを削除し、換気音の補助レイヤーとトーン処理も大幅に弱めました。
- プリセットの隣に独立した `FX` タブを追加しました。Tone（Warmth/Air）、Body、Dynamics（Glue）、Output（Loudness）、既存の10バンドEQを折りたたみ式セクションで管理できます。
- FX設定は保存され、各量が0%のときはバイパスされます。EQは設定画面からFXタブへ移動しました。
- エンジンの存在感、機内活動、揺れ、夜の深さのマクロと、長い巡航向けの睡眠保護ランダムイベントを追加しました。

## 備考

- 現在の航空機ベッドはまだ短く加工された既存ソースです。より長いステレオ録音への交換が次の大きな音質改善点です。
- 離陸・着陸・シートベルトチャイム・機長／客室乗務員アナウンス専用音源はまだ収録していません。
- ミキサー、プリセット、バックグラウンド再生、スリープタイマー、音源別ボリュームは引き続き利用できます。
- このAPKは現在のテスト署名を使用したプレリリースです。

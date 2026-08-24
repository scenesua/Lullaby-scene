# Lullaby Scene 1.1.2

## 주요 변경 사항

- 여섯 번째 잠의 여정 `HOOD 나이트`를 Android와 웹에 추가했습니다. 일반 야간 도심 대신 낡은 브릭 워크업, 비상계단, 철망 농구장과 갈라진 골목이 이어지는 후드의 밤을 별도 장면으로 구성했습니다.
- HOOD 전용 심야 거리 베드와 방향을 바꾸며 지나가는 차량, 발소리, 차 문, 개 짖는 소리, 헬리콥터, 유리 파손, 고함, 총성, 경찰 사이렌 이벤트를 추가했습니다.
- HOOD 사건은 거리와 방향이 매번 달라지며, 총성 뒤 임의의 시간이 지나 고함과 지나가는 경찰 사이렌이 이어질 수 있도록 독립적인 사건 흐름으로 구성했습니다.
- 모든 여정에 랜덤 이벤트 켜기·끄기 스위치를 제공하고, 꺼진 상태에서는 사건 표시와 이벤트 음량도 함께 억제되도록 보완했습니다.
- 경찰 사이렌 이벤트 동안 붉은빛과 푸른빛이 화면을 가로질러 지나가도록 HOOD 전용 장면 조명을 추가했습니다.
- 장면 화면의 밝기와 블룸 최대치, 확산 범위를 높여 정지 배경의 호흡하는 빛 변화가 더 분명하게 보이도록 했습니다.
- Android의 짧은 사건음은 안정적으로 재생되도록 모바일 재생 한도에 맞춰 모노·단축 처리했습니다.

## 참고

- 이 버전은 1.1.0 및 1.1.1과 동일한 지속형 Android 릴리즈 키로 서명되어 기존 앱 위에 업데이트할 수 있습니다.
- HOOD의 총성, 고함, 유리 파손과 경찰 사이렌은 랜덤 이벤트 스위치로 언제든 끌 수 있습니다.

---

## What's Changed

- Adds `HOOD Night` as the sixth Sleep Journey on Android and the web, with a distinct worn brick walk-up block, fire escapes, fenced court, and patched streets rather than a generic night skyline.
- Adds a dedicated HOOD night bed plus direction-changing passing cars, footsteps, car door, dog, helicopter, broken glass, shouting, gunshot, and police-siren events.
- Gives HOOD its own causal incident flow with randomized distance and direction: a gunshot may be followed later by shouting and a passing siren.
- Adds a Random Events switch across Journeys and suppresses both event status and event-source gain when disabled.
- Adds moving red and blue scene illumination while a HOOD police siren passes.
- Raises the maximum brightness, bloom strength, and spread of the playback-reactive still-image lighting.
- Optimizes short Android event assets for reliable mobile playback.

## Notes

- This build uses the same persistent Android release key as 1.1.0 and 1.1.1 and can update them in place.
- HOOD gunshots, shouting, glass, and police-siren events can be disabled at any time with the Random Events switch.

---

## 主な変更点

- AndroidとWebに6番目の睡眠ジャーニー`HOOD Night`を追加しました。一般的な夜景ではなく、古いレンガ造りの建物、非常階段、フェンス付きコート、傷んだ路地を持つ独立したシーンです。
- HOOD専用の夜間環境音と、方向を変えて通過する車、足音、車のドア、犬、ヘリコプター、ガラス、叫び声、銃声、警察サイレンのイベントを追加しました。
- 銃声の後にランダムな間隔で叫び声や通過するサイレンが続く、距離と方向の異なる独自のイベント進行を追加しました。
- すべてのJourneyにランダムイベントのオン・オフを追加し、無効時はイベント表示と音量も抑制します。
- HOODの警察サイレン中に赤と青の光が画面を横切る演出を追加しました。
- 静止背景の明るさ、ブルームの最大値と広がりを強化しました。

## 備考

- 1.1.0および1.1.1と同じ継続利用のAndroidリリースキーで署名されるため、既存アプリへ上書き更新できます。
- HOODの強いイベントはランダムイベントスイッチでいつでも無効にできます。

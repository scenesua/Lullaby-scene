# Lullaby Scene 1.1.3

## 주요 변경 사항

- Android와 웹의 장면 화면에 35~145% 밝기 조절을 추가하고, 선택한 밝기를 다음 실행에도 유지하도록 했습니다.
- 세로형 모바일에서 장면 화면이 가로로 회전될 때 밝기 조절 패널도 함께 회전하며, 슬라이더의 터치 좌표와 44px 터치 영역을 보정했습니다.
- HOOD 총격 사건을 10~45초 동안 여러 종류의 권총·소총·산탄총·연발 총성이 교차하는 원거리 총격으로 확장했습니다.
- HOOD의 고함과 비명을 여러 음원으로 보강하고 최소 청취 거리를 적용해 사건이 바로 곁에서 발생하는 느낌을 줄였습니다.
- 큰 HOOD 사건의 빈도를 낮추고, 사건 후 18~115초 사이에 1~3대의 경찰 사이렌이 들릴 수 있도록 흐름과 음량을 조정했습니다.
- 짧은 사건음이 같은 음원을 연속 선택하지 않도록 Android 랜덤 재생을 보완했습니다.

## 참고

- 이 버전은 1.1.0~1.1.2와 동일한 지속형 Android 릴리즈 키로 서명되어 기존 앱 위에 업데이트할 수 있습니다.
- HOOD의 총성, 고함, 유리 파손과 경찰 사이렌은 랜덤 이벤트 스위치로 언제든 끌 수 있습니다.

---

## What's Changed

- Adds a persistent 35–145% Scene Screen brightness control on Android and the web.
- Rotates the brightness panel with the mobile landscape fallback and corrects its touch coordinates with a 44 px touch target.
- Expands HOOD incidents into distant 10–45 second exchanges using varied pistol, rifle, shotgun, and burst recordings.
- Adds varied distant shouts and screams, with a minimum listening distance so incidents no longer sound immediately nearby.
- Reduces major HOOD incident frequency and allows one to three audible police sirens to arrive 18–115 seconds after an incident.
- Prevents Android short-event playback from immediately repeating the same recording.

## Notes

- This build uses the same persistent Android release key as 1.1.0–1.1.2 and can update them in place.
- HOOD gunshots, shouting, glass, and police-siren events can be disabled at any time with the Random Events switch.

---

## 主な変更点

- AndroidとWebのシーン画面に、設定を保持する35～145%の明るさ調整を追加しました。
- 縦向き端末で横画面表示に切り替わる際、明るさパネルも一緒に回転し、タッチ座標と44pxの操作領域を補正しました。
- HOODの銃撃イベントを、拳銃・ライフル・散弾銃・連射音が交差する遠距離の10～45秒の銃撃戦へ拡張しました。
- 複数の遠い叫び声と悲鳴を追加し、最小距離を設けて至近距離に聞こえないよう調整しました。
- 大きなHOODイベントの頻度を下げ、事件後18～115秒の間に1～3台の警察サイレンが聞こえるよう調整しました。
- Androidの短いイベント音が同じ録音を連続再生しないよう改善しました。

## 備考

- 1.1.0～1.1.2と同じ継続利用のAndroidリリースキーで署名されるため、既存アプリへ上書き更新できます。
- HOODの強いイベントはランダムイベントスイッチでいつでも無効にできます。

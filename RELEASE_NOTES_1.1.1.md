# Lullaby Scene 1.1.1

## 주요 변경 사항

- Android 상단과 하단 탐색의 명칭을 `여정`과 `준비된 장면`으로 정리해 두 기능이 명확히 구분되도록 했습니다.
- Android에 여정과 준비된 장면용 전체화면 장면 화면을 추가했습니다. 장면 화면은 모바일에서 가로로 전환되며 원본 비율을 유지합니다.
- 다섯 개 여정과 준비된 장면에 맞춘 정지 배경을 추가하고, 재생 중 빛이 천천히 호흡하듯 변하는 밝기·블룸 효과를 적용했습니다.
- 웹 장면 화면의 이미지 레이어와 발광 레이어를 다시 조정해 화면 전체를 채우면서 밝기 변화가 더 분명하게 보이도록 개선했습니다.
- 웹에서 여정과 준비된 장면을 동시에 재생할 수 없도록 했습니다. 마지막에 시작한 재생만 유지되고 이전 재생과 버튼 상태는 함께 정지합니다.
- 기차, 페리, 우주선, 잠수함 여정의 루프와 전환 음원을 다듬고, 잠을 방해하던 튀는 소리와 과도한 존재감을 줄였습니다.
- 여정 소스와 새 환경음을 Mixer와 준비된 장면에서도 조합할 수 있도록 프리셋과 소스 구성을 확장했습니다.
- 웹 모바일 장면 화면 버튼, 다국어 제목 동기화, 서비스워커 캐시 갱신을 보완했습니다.

## 참고

- 이 버전은 1.1.0과 동일한 지속형 Android 릴리즈 키로 서명되어 기존 1.1.0 위에 업데이트할 수 있습니다.
- 전체화면 장면 화면은 정지 배경을 사용하며 영상 루프는 포함하지 않습니다.

---

## What's Changed

- Renames Android navigation to clearly separate `Journey` and `Ready-made` scenes.
- Adds a landscape full-screen scene display for Android Journeys and ready-made scenes while preserving the source image ratio.
- Adds scene-specific still backgrounds with a slow playback-aware breathing light and bloom effect.
- Strengthens the web scene display's full-screen light response and verifies that the visual layer covers the viewport.
- Makes Journey and ready-made playback mutually exclusive on the web; the most recently started mode stops the previous mode and synchronizes its controls.
- Refines Train, Ferry, Spacecraft, and Submarine beds and transitions to reduce intrusive tones, pops, and excess presence.
- Expands Mixer sources and ready-made presets using the Journey and newly added ambience material.
- Improves the mobile scene-screen control, localized title synchronization, and service-worker cache updates.

## Notes

- This build uses the same persistent Android release key as 1.1.0 and can update it in place.
- Full-screen scene displays currently use still backgrounds; video loops are not included.

---

## 主な変更点

- Androidのナビゲーション名を`Journey`と`Ready-made`に整理し、二つの機能を明確に区別しました。
- AndroidのJourneyと用意されたシーンに、画像比率を保つ横向き全画面シーン表示を追加しました。
- 各シーンの静止背景に、再生中ゆっくり呼吸するように変化する明るさとブルーム効果を追加しました。
- Webの全画面画像レイヤーと発光レイヤーを再調整し、画面全体を覆いながら明るさの変化がより明確に見えるよう改善しました。
- WebではJourneyと用意されたシーンの同時再生を防ぎ、最後に開始した再生だけを維持します。
- Train、Ferry、Spacecraft、Submarineのループとトランジションを調整し、目立つ音やポップノイズを抑えました。
- Journey素材と新しい環境音をMixerと用意されたシーンでも利用できるよう、ソースとプリセットを拡張しました。

## 備考

- 1.1.0と同じ継続利用のAndroidリリースキーで署名されるため、既存の1.1.0へ上書き更新できます。
- 全画面シーン表示は静止背景を使用し、動画ループは含まれていません。

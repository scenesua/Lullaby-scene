# Lullaby Scene 1.1.8

## 주요 변경 사항

- 밝은 낮의 숲속 절 여정을 추가했습니다. 숲과 새소리 위로 오른쪽 절 법당에서 싱잉볼과 목탁, 반야심경 독송이 은은하게 들립니다.
- 자갈길 발소리를 여러 걸음이 빠르게 반복되지 않도록 `저벅… 저벅…` 간격으로 재구성하고, 길 위의 임의 위치에서 드물게 나타나도록 조정했습니다.
- 목탁·자갈 발소리·반야심경은 하나의 이벤트 큐에서 서로 겹치지 않게 재생됩니다. 실제 포함된 소스만 후보가 되므로 보류된 경전 녹음은 랜덤 확률을 차지하지 않습니다.
- 숲속 절 심플 프리셋과 전용 장면 배경을 웹과 Android에 함께 추가했습니다.
- 웹사이트에 음원 및 시각 자료 출처 페이지를 추가하고, 이번에 사용한 CC0 원본과 편집 내용을 정리했습니다.
- 여정과 Mixer의 정렬을 통일해 숲속 절을 HOOD 바로 앞에 배치하고 HOOD를 항상 마지막 여정으로 유지합니다.
- 웹 캐시 버전을 갱신하고 운영 배포 검사에 숲속 절 배경·오디오·출처 페이지 검증을 추가했습니다.

## 업데이트

- Android 버전: 1.1.8 (versionCode 17)
- 기존 1.1.x와 동일한 지속형 Android 릴리즈 키로 서명되어 기존 앱 위에 업데이트할 수 있습니다.

---

## What's Changed

- Adds the bright daytime Forest Temple Journey, with forest and birds around the listener and singing bowl, moktak, and Heart Sutra recitation placed softly at the temple hall on the right.
- Rebuilds gravel footsteps into a sparse, slow walking pattern and places them at occasional positions along the path.
- Runs moktak, gravel footsteps, and Heart Sutra through one non-overlapping event queue. Only packaged sources enter the candidate pool, so deferred scripture recordings consume no probability.
- Adds a Forest Temple simple preset and dedicated scene background to both web and Android.
- Adds an audio and visual credits page with the CC0 originals and transformation notes used in this update.
- Keeps Forest Temple directly before HOOD and keeps HOOD last across Journey selectors and Mixer grouping.
- Refreshes the web application cache and extends production smoke checks to cover the Forest Temple background, audio, and credits page.

## Update

- Android version: 1.1.8 (versionCode 17)
- Signed with the same persistent Android release key used by the existing 1.1.x releases for in-place updates.

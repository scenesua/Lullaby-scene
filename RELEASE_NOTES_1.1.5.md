# Lullaby Scene 1.1.5

## 주요 변경 사항

- HOOD Night 총격전을 기본 총성 + 샷건 조합으로 정리했습니다. 반복 사격은 일반 강도에서 기본 총성 3~6발, 높은 강도에서 최대 8발까지 발생합니다.
- 기본 총성은 1~3발 묶음으로 나뉘며 발사 간격과 묶음 간 간격을 랜덤화해 `탕-타당`, `타다당-탕-탕`처럼 자연스러운 패턴이 나오도록 조정했습니다.
- 샷건은 사건 중 1~3발만 끼어들며 소총/권총/연발 전용 파일은 HOOD 총격 시퀀스에서 더 이상 선택되지 않습니다.
- 경찰 사이렌을 더 잘 들리게 보강하면서 거리감은 유지했고, 마지막 총성 이후 18~115초 뒤에 이어지도록 수정했습니다.
- 웹 플레이어에도 같은 총격 규칙을 적용했으며 빠른 연속 총성이 앞 소리를 끊지 않도록 기본 총성 8채널, 샷건 3채널의 폴리포니 재생을 적용했습니다.
- 웹 HOOD 런타임에 재검증 캐시 정책을 추가해 새 이벤트 로직이 오래된 브라우저 캐시에 남지 않도록 했습니다.

## 업데이트

- Android 버전: 1.1.5 (versionCode 14)
- 기존 1.1.x와 동일한 지속형 Android 릴리즈 키로 서명되어 기존 앱 위에 업데이트할 수 있습니다.

---

## What's Changed

- Reworks HOOD Night gunfights around only the basic gunshot and shotgun recordings. Basic fire uses 3–6 shots at normal intensity and up to 8 at high intensity.
- Groups basic shots into randomized 1–3 shot phrases so patterns such as single/double and triple/single/single emerge without simultaneous starts.
- Limits shotgun accents to 1–3 shots and removes rifle, pistol, and burst recordings from authored HOOD gunfight playback.
- Makes police sirens more audible while preserving distance and schedules them 18–115 seconds after the final gunshot.
- Brings the same behavior to the web player and adds 8-voice basic-gunshot / 3-voice shotgun polyphony so rapid shots keep their tails instead of restarting one media element.
- Adds revalidation for the HOOD web runtime to avoid stale cached event logic.

## Update

- Android version: 1.1.5 (versionCode 14)
- Signed with the same persistent Android release key used by the existing 1.1.x releases for in-place updates.

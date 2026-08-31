"""Fail on new Android lint errors; keep existing debt visible, not suppressed."""

import collections
import sys
import xml.etree.ElementTree as ET


def errors(path):
    result = collections.Counter()
    for issue in ET.parse(path).getroot().findall("issue"):
        if issue.get("severity") not in ("Error", "Fatal"):
            continue
        # Ignore line shifts, but preserve file, message, issue type and count.
        files = tuple(location.get("file", "").replace("\\", "/")
                      for location in issue.findall("location"))
        result[(issue.get("id"), issue.get("message"), files)] += 1
    return result


if __name__ == "__main__":
    base, head = (errors(path) for path in sys.argv[1:])
    introduced = head - base
    print(f"Android lint: base={base.total()}, head={head.total()}, "
          f"new={introduced.total()}, resolved={(base - head).total()}")
    for (issue_id, message, files), count in introduced.items():
        print(f"NEW ({count}) {issue_id}: {message} — {', '.join(files)}")
    sys.exit(bool(introduced))

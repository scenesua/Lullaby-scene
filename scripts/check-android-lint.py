"""Fail on new Android lint errors; keep existing debt visible, not suppressed."""

import collections
import sys
import xml.etree.ElementTree as ET


def errors(path, root=""):
    result = collections.Counter()
    for issue in ET.parse(path).getroot().findall("issue"):
        if issue.get("severity") not in ("Error", "Fatal"):
            continue
        # Ignore line shifts, but preserve file, message, issue type and count.
        prefix = root.replace("\\", "/").rstrip("/") + "/" if root else ""
        files = tuple(location.get("file", "").replace("\\", "/").removeprefix(prefix)
                      for location in issue.findall("location"))
        result[(issue.get("id"), issue.get("message"), files)] += 1
    return result


if __name__ == "__main__":
    base_path, head_path, base_root, head_root = sys.argv[1:]
    base, head = errors(base_path, base_root), errors(head_path, head_root)
    introduced = head - base
    print(f"Android lint: base={base.total()}, head={head.total()}, "
          f"new={introduced.total()}, resolved={(base - head).total()}")
    for (issue_id, message, files), count in introduced.items():
        print(f"NEW ({count}) {issue_id}: {message} — {', '.join(files)}")
    sys.exit(bool(introduced))

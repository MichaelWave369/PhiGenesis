"""Isolated fixed native-memory adapter; the caller supplies audited local roots."""
import json
import sys
from pathlib import Path

raw = sys.stdin.buffer.read(750001)
if len(raw) > 750000:
    raise ValueError("native request bound")
request = json.loads(raw)
if request["stage"] != "native-memory":
    raise ValueError("native memory adapter only")
sys.path[:0] = [str(Path(__file__).resolve().parent),
                str(Path(request["roots"]["PhiMemory9"]) / "src")]
from native_memory import intake

result = intake(request["input"])
result["measured"]["workerCalls"] = 1
print(json.dumps(result, sort_keys=True, separators=(",", ":"), allow_nan=False))

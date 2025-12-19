from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from threading import Lock


@dataclass
class LoadedPrompt:
    text: str
    mtime: float


_lock = Lock()
_cache: dict[Path, LoadedPrompt] = {}


def load_prompt(path: Path) -> str:
    """
    读取 prompt 文件并做简单缓存（基于 mtime）。
    """
    resolved = path.resolve()
    with _lock:
        cached = _cache.get(resolved)
        try:
            stat = resolved.stat()
        except FileNotFoundError:
            raise FileNotFoundError(f"Prompt file not found: {resolved}")
        mtime = float(stat.st_mtime)
        if cached is not None and cached.mtime == mtime:
            return cached.text

        text = resolved.read_text(encoding="utf-8")
        _cache[resolved] = LoadedPrompt(text=text, mtime=mtime)
        return text


__all__ = ["load_prompt"]


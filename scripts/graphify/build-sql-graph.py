#!/usr/bin/env python3
"""Build a Graphify map from repository SQL files in an isolated output directory."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_VERSION = "0.9.91"


def tracked_sql_files(root: Path) -> list[Path]:
    result = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "--", "*.sql"],
        cwd=root,
        check=True,
        capture_output=True,
        text=True,
    )
    files = []
    for value in result.stdout.splitlines():
        path = Path(value)
        if path.is_absolute() or ".." in path.parts:
            continue
        source = root / path
        if source.is_file():
            files.append(path)
    return sorted(set(files), key=lambda item: item.as_posix())


def build(root: Path, out_dir: Path, version: str) -> dict[str, int | str]:
    files = tracked_sql_files(root)
    if not files:
        raise RuntimeError("Nenhum arquivo SQL rastreado ou não ignorado foi encontrado.")
    out_dir = out_dir.resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="promo-gifts-sql-map-") as temp:
        corpus = Path(temp) / "sql-corpus"
        corpus.mkdir()
        for relative in files:
            target = corpus / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(root / relative, target)
        subprocess.run(
            [
                "uv", "tool", "run", "--from", f"graphifyy[sql]=={version}", "graphify", "extract",
                str(corpus), "--code-only", "--out", str(out_dir),
            ],
            cwd=root,
            check=True,
        )
    graph_path = out_dir / "graphify-out" / "graph.json"
    if not graph_path.is_file():
        raise RuntimeError(f"Graphify não produziu {graph_path}.")
    graph = json.loads(graph_path.read_text(encoding="utf-8"))
    return {
        "version": version,
        "sql_files": len(files),
        "nodes": len(graph.get("nodes", [])),
        "edges": len(graph.get("links", graph.get("edges", []))),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default="graphify-out/sql", help="Diretório separado de saída (gitignored).")
    parser.add_argument("--version", default=os.environ.get("GRAPHIFY_VERSION", DEFAULT_VERSION))
    args = parser.parse_args()
    result = build(ROOT, Path(args.out), args.version)
    print(
        f"[graphify-sql] v{result['version']}: {result['sql_files']} arquivos SQL; "
        f"{result['nodes']} nós; {result['edges']} relações; saída: {Path(args.out)}"
    )


if __name__ == "__main__":
    main()

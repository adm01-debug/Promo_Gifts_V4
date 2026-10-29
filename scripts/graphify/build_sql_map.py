#!/usr/bin/env python3
"""Build an isolated Graphify map for tracked SQL without polluting the code map."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


APPROVED_GRAPHIFY_VERSION = "0.9.97"


def run(command: list[str], *, cwd: Path | None = None, quiet: bool = False) -> str:
    result = subprocess.run(
        command,
        cwd=cwd,
        check=True,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    if result.stdout and not quiet:
        print(result.stdout, end="")
    return result.stdout


def main() -> int:
    root = Path(run(["git", "rev-parse", "--show-toplevel"]).strip())
    version_output = run(["graphify", "--version"]).strip()
    if version_output != f"graphify {APPROVED_GRAPHIFY_VERSION}":
        raise SystemExit(
            f"Versão Graphify não homologada: {version_output}. "
            f"Instale/teste {APPROVED_GRAPHIFY_VERSION} antes de gerar o mapa SQL."
        )

    tracked = run(["git", "ls-files", "-z", "--", "*.sql"], cwd=root, quiet=True)
    sql_paths = [Path(item) for item in tracked.split("\0") if item]
    sql_paths = [path for path in sql_paths if (root / path).is_file()]
    if not sql_paths:
        raise SystemExit("Nenhum arquivo SQL versionado foi encontrado.")

    with tempfile.TemporaryDirectory(prefix="promo-gifts-sql-graph-") as temporary:
        corpus = Path(temporary)
        for relative_path in sql_paths:
            destination = corpus / relative_path
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(root / relative_path, destination)

        run(["graphify", "update", str(corpus), "--force", "--no-cluster"])
        graph_path = corpus / "graphify-out" / "graph.json"
        run(
            [
                "graphify",
                "cluster-only",
                str(corpus),
                "--graph",
                str(graph_path),
                "--no-viz",
                "--no-label",
            ]
        )

        output_dir = root / "graphify-out" / "sql" / "graphify-out"
        output_dir.mkdir(parents=True, exist_ok=True)
        for filename in ("graph.json", "GRAPH_REPORT.md", "manifest.json"):
            source = corpus / "graphify-out" / filename
            if source.exists():
                shutil.copy2(source, output_dir / filename)

        graph = json.loads((output_dir / "graph.json").read_text(encoding="utf-8"))
        metadata = {
            "source_commit": run(["git", "rev-parse", "HEAD"], cwd=root).strip(),
            "graphify_version": APPROVED_GRAPHIFY_VERSION,
            "tracked_sql_files": len(sql_paths),
            "nodes": len(graph.get("nodes", [])),
            "links": len(graph.get("links", [])),
            "output": "graphify-out/sql/graphify-out/graph.json",
        }
        (output_dir / "build-metadata.json").write_text(
            json.dumps(metadata, indent=2) + "\n", encoding="utf-8"
        )

    print(json.dumps(metadata, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())

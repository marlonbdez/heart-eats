#!/usr/bin/env bash
# Regenera los SVG de los diagramas. Requiere plantuml y graphviz (brew install plantuml graphviz).
set -euo pipefail
cd "$(dirname "$0")"
plantuml -tsvg -charset UTF-8 0*.puml

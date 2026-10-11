#!/usr/bin/env bash
# Regenera el SVG del diagrama. Requiere plantuml y graphviz (brew install plantuml graphviz).
set -euo pipefail
cd "$(dirname "$0")"
plantuml -tsvg -charset UTF-8 casos-de-uso.puml

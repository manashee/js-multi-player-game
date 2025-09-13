#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "Building all artifacts..."
cd "$ROOT_DIR"
npm run build:all

echo "Launching three clients in separate macOS Terminal windows..."
osascript <<OSA
tell application "Terminal"
    do script "cd $ROOT_DIR && PLAYER_NAME=p npm run client:text"
    do script "cd $ROOT_DIR && npm run client:phaser"
    do script "cd $ROOT_DIR && npm run client:babylon"
end tell
OSA

echo "Launched."


#!/bin/sh
set -e

# Default mode is server
MODE="${MODE:-server}"

# Parse command line arguments for --mode flag
for arg in "$@"; do
  case $arg in
    --mode=*)
      MODE="${arg#*=}"
      shift
      ;;
  esac
done

echo "Starting Content Studio in ${MODE} mode..."

case $MODE in
  server)
    exec node /app/dist/server.mjs --mode=server "$@"
    ;;
  worker)
    exec node /app/dist/server.mjs --mode=worker "$@"
    ;;
  *)
    echo "Unknown mode: $MODE"
    echo "Valid modes: server, worker"
    exit 1
    ;;
esac

#!/bin/zsh
cd -- "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo 'ADT Agent needs Node.js 22 or later to run this local launcher.'
  echo 'You can also host the public folder on any static website host.'
  read -r 'reply?Press Return to close.'
  exit 1
fi
node server.mjs

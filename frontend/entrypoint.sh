#!/bin/sh

set -o allexport
if [ -f /etc/secrets/auth ]; then
  source /etc/secrets/auth
fi
set +o allexport

exec npm start

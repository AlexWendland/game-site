#!/bin/sh

set -o allexport
if [ -f /etc/secrets/auth ]; then
  source /etc/secrets/auth
fi
set +o allexport

# Dumb test to check if this worked
echo "NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL"

exec npm start

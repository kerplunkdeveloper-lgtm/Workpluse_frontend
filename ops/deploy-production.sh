#!/usr/bin/env bash
set -Eeuo pipefail

SHA="${1:?commit SHA required}"
API_URL="${2:?production API URL required}"
REPO="https://github.com/kerplunkdeveloper-lgtm/Workpluse_frontend.git"
APP_ROOT=/home/ubuntu/workpulse-frontend-production
RELEASES="$APP_ROOT/.releases"
CURRENT="$APP_ROOT/current"
PM2_NAME=workpulse-frontend-production
HEALTH_URL=http://127.0.0.1:3000/

[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || { echo 'Invalid commit SHA'; exit 2; }
[[ "$API_URL" =~ ^https://[^[:space:]]+$ ]] || { echo 'Production API URL must be HTTPS'; exit 3; }
mkdir -p "$RELEASES"
PREVIOUS=""
if [[ -L "$CURRENT" ]]; then PREVIOUS=$(readlink -f "$CURRENT"); fi
RELEASE="$RELEASES/$SHA"
[[ ! -e "$RELEASE" ]] || { echo 'Release already exists; refusing to overwrite'; exit 4; }
WORKDIR=$(mktemp -d /tmp/workpulse-frontend.XXXXXX)
trap 'rm -rf "$WORKDIR"' EXIT
git clone --quiet --no-checkout "$REPO" "$WORKDIR/source"
git -C "$WORKDIR/source" fetch --quiet --depth=1 origin "$SHA"
git -C "$WORKDIR/source" checkout --quiet --detach FETCH_HEAD
[[ "$(git -C "$WORKDIR/source" rev-parse HEAD)" == "$SHA" ]] || exit 5
mkdir -p "$RELEASE"
tar -C "$WORKDIR/source" --exclude=.git -cf - . | tar -C "$RELEASE" -xf -
if [[ -f "$APP_ROOT/.env.production" ]]; then ln -s "$APP_ROOT/.env.production" "$RELEASE/.env.production"; fi
(cd "$RELEASE" && npm ci && NEXT_PUBLIC_API_URL="$API_URL" npm run build)
ln -sfn "$RELEASE" "$CURRENT.next"
mv -Tf "$CURRENT.next" "$CURRENT"
restart_from() {
  local dir="$1"
  pm2 delete "$PM2_NAME" >/dev/null 2>&1 || true
  (cd "$dir" && NEXT_PUBLIC_API_URL="$API_URL" pm2 start npm --name "$PM2_NAME" -- start)
}
SWITCHED=1
rollback_on_error() {
  local rc=$?
  trap - ERR
  if [[ "${SWITCHED:-0}" == 1 ]]; then
    echo 'Deployment step failed; restoring previous application release' >&2
    pm2 delete "$PM2_NAME" >/dev/null 2>&1 || true
    if [[ -n "$PREVIOUS" && -d "$PREVIOUS" ]]; then
      ln -sfn "$PREVIOUS" "$CURRENT.next"; mv -Tf "$CURRENT.next" "$CURRENT"
      restart_from "$PREVIOUS" || true
    else
      rm -f "$CURRENT"
      restart_from "$APP_ROOT" || true
    fi
    pm2 save >/dev/null 2>&1 || true
  fi
  exit "$rc"
}
trap rollback_on_error ERR
restart_from "$RELEASE"
for _ in $(seq 1 30); do
  if curl --fail --silent --show-error "$HEALTH_URL" >/dev/null 2>&1; then
    pm2 save
    find "$RELEASES" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | tail -n +6 | cut -d' ' -f2- | while IFS= read -r old; do [[ "$old" == "$CURRENT" ]] || rm -rf -- "$old"; done
    SWITCHED=0
    trap - ERR
    echo "Frontend release $SHA healthy"
    exit 0
  fi
  sleep 2
done
echo 'Frontend health check failed; restoring previous application release'
trap - ERR
pm2 delete "$PM2_NAME" >/dev/null 2>&1 || true
if [[ -n "$PREVIOUS" && -d "$PREVIOUS" ]]; then
  ln -sfn "$PREVIOUS" "$CURRENT.next"; mv -Tf "$CURRENT.next" "$CURRENT"
  restart_from "$PREVIOUS"
else
  rm -f "$CURRENT"
  restart_from "$APP_ROOT"
fi
pm2 save
SWITCHED=0
exit 7

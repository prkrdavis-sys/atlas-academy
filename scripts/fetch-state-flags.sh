#!/bin/bash
# Downloads the 50 US state flag SVGs from Wikimedia Commons into public/flags/us-XX.svg
set -u
cd "$(dirname "$0")/.."
mkdir -p public/flags

declare -a ENTRIES=(
  "al|Flag_of_Alabama.svg"
  "ak|Flag_of_Alaska.svg"
  "az|Flag_of_Arizona.svg"
  "ar|Flag_of_Arkansas.svg"
  "ca|Flag_of_California.svg"
  "co|Flag_of_Colorado.svg"
  "ct|Flag_of_Connecticut.svg"
  "de|Flag_of_Delaware.svg"
  "fl|Flag_of_Florida.svg"
  "ga|Flag_of_Georgia_(U.S._state).svg"
  "hi|Flag_of_Hawaii.svg"
  "id|Flag_of_Idaho.svg"
  "il|Flag_of_Illinois.svg"
  "in|Flag_of_Indiana.svg"
  "ia|Flag_of_Iowa.svg"
  "ks|Flag_of_Kansas.svg"
  "ky|Flag_of_Kentucky.svg"
  "la|Flag_of_Louisiana.svg"
  "me|Flag_of_Maine.svg"
  "md|Flag_of_Maryland.svg"
  "ma|Flag_of_Massachusetts.svg"
  "mi|Flag_of_Michigan.svg"
  "mn|Flag_of_Minnesota.svg"
  "ms|Flag_of_Mississippi.svg"
  "mo|Flag_of_Missouri.svg"
  "mt|Flag_of_Montana.svg"
  "ne|Flag_of_Nebraska.svg"
  "nv|Flag_of_Nevada.svg"
  "nh|Flag_of_New_Hampshire.svg"
  "nj|Flag_of_New_Jersey.svg"
  "nm|Flag_of_New_Mexico.svg"
  "ny|Flag_of_New_York.svg"
  "nc|Flag_of_North_Carolina.svg"
  "nd|Flag_of_North_Dakota.svg"
  "oh|Flag_of_Ohio.svg"
  "ok|Flag_of_Oklahoma.svg"
  "or|Flag_of_Oregon.svg"
  "pa|Flag_of_Pennsylvania.svg"
  "ri|Flag_of_Rhode_Island.svg"
  "sc|Flag_of_South_Carolina.svg"
  "sd|Flag_of_South_Dakota.svg"
  "tn|Flag_of_Tennessee.svg"
  "tx|Flag_of_Texas.svg"
  "ut|Flag_of_Utah.svg"
  "vt|Flag_of_Vermont.svg"
  "va|Flag_of_Virginia.svg"
  "wa|Flag_of_Washington.svg"
  "wv|Flag_of_West_Virginia.svg"
  "wi|Flag_of_Wisconsin.svg"
  "wy|Flag_of_Wyoming.svg"
)

FAIL=0
for entry in "${ENTRIES[@]}"; do
  code="${entry%%|*}"
  file="${entry#*|}"
  out="public/flags/us-${code}.svg"
  if [ -s "$out" ] && head -c 200 "$out" | grep -qi "<svg\|<?xml"; then
    echo "skip us-${code} (exists)"
    continue
  fi
  url="https://commons.wikimedia.org/wiki/Special:FilePath/${file}"
  curl -fsSL -A "atlas-academy-asset-fetch/1.0 (educational game)" "$url" -o "$out"
  if [ $? -ne 0 ] || ! head -c 200 "$out" | grep -qi "<svg\|<?xml"; then
    echo "FAILED us-${code} ($file)"
    rm -f "$out"
    FAIL=1
  else
    echo "ok us-${code}"
  fi
  sleep 0.4
done
echo "DONE fail=$FAIL"
exit $FAIL

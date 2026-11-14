#!/usr/bin/env bash
# Pull a few frames out of a NASA SVS movie WITHOUT downloading the whole file.
# ffmpeg reads only the byte ranges it needs over HTTP.
#
#   ./frames.sh <movie_url> <out_dir> [N | "t1,t2,..."]
#
#   ./frames.sh "https://svs.gsfc.nasa.gov/vis/a000000/a005100/a005176/sst_anomaly_30_sec_4096x2048_2x1_30p.mp4" out 5
#   ./frames.sh "<url>" out "0.0,15.0,29.9"      # exact timestamps in seconds
#
# Needs ffmpeg and python3 on PATH (set FFMPEG=/path/to/ffmpeg to override).
# Frames are scaled to at most 1280 px wide and saved as f<k>_t<seconds>.jpg .
# Frame number = seconds x fps (the fps is printed on the INFO line).
set -u
URL="$1"; OUT="$2"; N="${3:-5}"
FF="${FFMPEG:-ffmpeg}"
mkdir -p "$OUT"
INFO=$("$FF" -hide_banner -rw_timeout 60000000 -i "$URL" 2>&1 | grep -E "Duration|Video:" | head -2)
DUR=$(echo "$INFO" | sed -n 's/.*Duration: \([0-9:.]*\).*/\1/p' | awk -F: '{print $1*3600+$2*60+$3}')
echo "INFO: $INFO"
echo "DURATION_S: $DUR"
if [[ "$N" == *","* || "$N" == *"."* ]]; then
  TS=$(echo "$N" | tr ',' ' ')
else
  TS=$(python3 -c "
d=float('$DUR' or 0); n=int('$N')
print(' '.join('%.2f' % (0.3 + (d-0.8)*k/max(n-1,1)) for k in range(n)) if d>1 else '0')")
fi
k=0
for t in $TS; do
  f="$OUT/f${k}_t${t}.jpg"
  "$FF" -hide_banner -loglevel error -rw_timeout 60000000 -ss "$t" -i "$URL" -frames:v 1 \
        -vf "scale='min(1280,iw)':-2" -q:v 4 -y "$f" 2>&1 | tail -1
  [ -s "$f" ] && echo "FRAME t=${t}s -> $f"
  k=$((k+1))
done

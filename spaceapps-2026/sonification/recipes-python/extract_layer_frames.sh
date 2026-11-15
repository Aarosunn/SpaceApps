#!/usr/bin/env bash
# extract_layer_frames.sh - cut 30 evenly spaced frames out of the cached NASA movies for the fire and
# global-heat layers. Run in WSL/Linux from the cache folder (spaceapps-2026/notes/feasibility/data/layers),
# with a Python environment that has imageio-ffmpeg (it ships an ffmpeg binary), or with ffmpeg on the PATH.
#
#   fires: SVS 5113 fires_frp_VIIRS_eq_nl_2048p30.mp4, 900 frames, 13 Nov 2024 to 13 Nov 2026 -> every 31st frame
#   heat:  SVS 5207 2023GISTEMP_Map_SOS.mp4, 900 frames, 6 per year from 1881 -> every 30th (5 years) plus the last
set -euo pipefail
FF=$(python -c 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())' 2>/dev/null || command -v ffmpeg)
mkdir -p fires heat
"$FF" -v error -y -i fires_frp_VIIRS_eq_nl_2048p30.mp4 -vf "select='not(mod(n\,31))',scale=1440:720:flags=area" -fps_mode passthrough fires/f_%02d.png
"$FF" -v error -y -i 2023GISTEMP_Map_SOS.mp4 -vf "select='not(mod(n\,30))+eq(n\,899)',scale=1440:720:flags=area" -fps_mode passthrough heat/f_%02d.png
echo "fires: $(ls fires | wc -l) frames, heat: $(ls heat | wc -l) frames"

#!/bin/sh
# Mixes build/vo.wav with room tone, period SFX (from ep1) and a low music bed → build/f03-test.mp4
set -e
cd "$(dirname "$0")"; A=../ep1/assets/audio/mp3; D=$(python3 -c "import json;print(json.load(open('build/timing.json'))['duration'])")
ffmpeg -y -v error -i build/silent.mp4 -i build/vo.wav \
  -f lavfi -t "$D" -i "anoisesrc=c=brown:a=0.05,lowpass=f=500,highpass=f=80" \
  -i $A/sfx-slam.mp3 -i $A/sfx-rumble.mp3 -i $A/sfx-whoosh.mp3 -i $A/sfx-ding.mp3 -i $A/sfx-ding.mp3 -i $A/sfx-pop.mp3 -i $A/sfx-slam.mp3 -i $A/sfx-whoosh.mp3 -i $A/bed.mp3 \
  -filter_complex "\
[2]volume=0.5,afade=t=in:d=1,afade=t=out:st=$(python3 -c "print($D-1.2)"):d=1.2[room];\
[3]adelay=600|600,volume=0.55[s1];[4]adelay=3150|3150,volume=0.5[s2];[5]adelay=9250|9250,volume=0.45[s3];\
[6]adelay=14400|14400,volume=0.6[s4];[7]adelay=18600|18600,volume=0.5[s5];[8]adelay=15950|15950,volume=0.6[s6];\
[9]adelay=22550|22550,volume=0.6[s7];[10]adelay=20000|20000,volume=0.35[s8];\
[11]atrim=0:$D,volume=0.10,afade=t=out:st=$(python3 -c "print($D-1.5)"):d=1.5[bed];\
[1]volume=1.0[vo];[vo][room][s1][s2][s3][s4][s5][s6][s7][s8][bed]amix=inputs=11:normalize=0,alimiter=limit=0.95[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest build/f03-test.mp4
echo "build/f03-test.mp4"

"""Verifie la duree/les pistes et extrait une image par chapitre pour controle visuel."""
from pathlib import Path
import subprocess,json
from PIL import Image,ImageDraw

root=Path(__file__).resolve().parents[1]
video=root/"demo/geodelivery-demo.mp4"
out=root/"docs/screenshots/qa/video-10min"
out.mkdir(parents=True,exist_ok=True)
probe=json.loads(subprocess.check_output(["ffprobe","-v","error","-show_streams","-show_format","-show_chapters","-of","json",str(video)],text=True,encoding="utf-8"))
assert abs(float(probe["format"]["duration"])-600)<.1
assert len(probe["chapters"])==20
assert {s["codec_type"] for s in probe["streams"]}>={"video","audio","subtitle"}
frames=[]
for i in range(20):
    t=i*30+16
    path=out/f"chapitre-{i+1:02}.png"
    subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-y","-ss",str(t),"-i",str(video),
        "-frames:v","1","-vf","scale=640:-1",str(path)],check=True)
    frames.append(path)
for start in (0,10):
    sheet=Image.new("RGB",(1280,2250),"#eff4ea")
    for j,path in enumerate(frames[start:start+10]):
        im=Image.open(path).convert("RGB")
        x=(j%2)*640;y=(j//2)*450+28
        sheet.paste(im,(x,y))
        ImageDraw.Draw(sheet).text((x+12,y-20),f"Chapitre {start+j+1:02} - {int((start+j)*30//60):02}:{int((start+j)*30%60):02}",fill="#123e35")
    dest=out/f"planche-{start//10+1}.png";sheet.save(dest);print(dest)
audio=subprocess.run(["ffmpeg","-hide_banner","-ss","30","-t","20","-i",str(video),"-vn","-af","volumedetect","-f","null","-"],capture_output=True,text=True,encoding="utf-8",errors="replace")
assert audio.returncode==0
lines=[l.strip() for l in audio.stderr.splitlines() if "mean_volume" in l or "max_volume" in l]
assert not any("mean_volume: -inf" in l for l in lines),"Piste de narration silencieuse"
result={"durationSeconds":float(probe["format"]["duration"]),"chapters":20,
    "audio":True,"subtitles":True,"sampledFrames":20,"audioVolumeCheck":lines,"resolution":[s for s in probe["streams"] if s["codec_type"]=="video"][0].get("width")}
(root/"docs/evidence/video-10min-qa.json").write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")
print(json.dumps(result,ensure_ascii=False))

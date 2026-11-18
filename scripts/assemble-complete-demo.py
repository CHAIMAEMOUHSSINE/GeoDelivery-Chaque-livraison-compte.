"""Assemble le screencast reel, la voix synthetique francaise, les sous-titres et les chapitres."""
from pathlib import Path
import json,subprocess,shutil

root=Path(__file__).resolve().parents[1]
evidence=json.loads((root/"docs/evidence/demo-complete-recording.json").read_text(encoding="utf-8"))
scenes=json.loads((root/"demo/scenario-10min.json").read_text(encoding="utf-8"))
video=Path(evidence["video"])
audio=root/"demo/geodelivery-narration-fr.m4a"
subtitles=root/"demo/geodelivery-demo-complete.srt"
output=root/"demo/geodelivery-demo.mp4"
backup=root/"demo/archive/geodelivery-demo-courte.mp4"
if output.exists() and not backup.exists():
    backup.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(output,backup)
metadata=root/"demo/narration/chapters.ffmetadata"
lines=[";FFMETADATA1","title=GeoDelivery — Démonstration complète de dix minutes","artist=GeoDelivery","comment=Captures réelles. Voix française synthétique."]
for i,scene in enumerate(scenes):
    title=scene["title"].replace("=","\\=").replace(";","\\;").replace("#","\\#")
    lines.extend(["[CHAPTER]","TIMEBASE=1/1000",f"START={i*30000}",f"END={(i+1)*30000}",f"title={title}"])
metadata.write_text("\n".join(lines)+"\n",encoding="utf-8")
command=["ffmpeg","-hide_banner","-loglevel","warning","-y",
    "-i",str(video),"-i",str(audio),"-f","srt","-i",str(subtitles),"-i",str(metadata),
    "-map","0:v:0","-map","1:a:0","-map","2:s:0","-map_metadata","3","-map_chapters","3",
    "-vf","fps=25,tpad=stop_mode=clone:stop_duration=2","-t","600",
    "-c:v","libx264","-preset","medium","-crf","23","-pix_fmt","yuv420p",
    "-c:a","aac","-b:a","128k","-af","loudnorm=I=-16:TP=-1.5:LRA=11",
    "-c:s","mov_text","-metadata:s:a:0","language=fra","-metadata:s:s:0","language=fra",
    "-metadata:s:a:0","title=Commentaire français — voix synthétique",
    "-metadata:s:s:0","title=Sous-titres français","-movflags","+faststart",str(output)]
subprocess.run(command,check=True)
probe=json.loads(subprocess.check_output(["ffprobe","-v","error","-show_format","-show_streams","-show_chapters","-of","json",str(output)],text=True,encoding="utf-8"))
assert abs(float(probe["format"]["duration"])-600)<.1
assert any(s["codec_type"]=="audio" for s in probe["streams"])
assert len(probe["chapters"])==20
result={"file":"demo/geodelivery-demo.mp4","durationSeconds":float(probe["format"]["duration"]),
    "sizeBytes":int(probe["format"]["size"]),"chapters":20,"language":"fr-FR","syntheticNarration":True,
    "subtitleTrack":True,"realApplicationRecording":True,"allInterfaces":evidence["interfaceCoverage"],
    "javascriptErrors":evidence["javascriptErrors"],"apiErrors":evidence["apiErrors"]}
(root/"docs/evidence/video-10min-final.json").write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")
print(json.dumps(result,ensure_ascii=False,indent=2))

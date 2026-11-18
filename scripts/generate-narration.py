"""Voix synthetique fr-FR-DeniseNeural ; seul le texte pedagogique est envoye au service TTS."""
from pathlib import Path
import asyncio,json,subprocess,math
import edge_tts

ROOT=Path(__file__).resolve().parents[1]
scenes=json.loads((ROOT/"demo/scenario-10min.json").read_text(encoding="utf-8"))
audio=ROOT/"demo/narration"
audio.mkdir(parents=True,exist_ok=True)
def run(*args):
    subprocess.run(args,check=True,stdout=subprocess.DEVNULL)
def probe(file):
    return float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1",str(file)],text=True).strip())
async def main():
    limiter=asyncio.Semaphore(3)
    async def one(i,scene):
        async with limiter:
            mp3=audio/f"{i+1:02}-{scene['id']}.mp3"
            if not mp3.exists() or mp3.stat().st_size<1000:
                await edge_tts.Communicate(scene["narration"],"fr-FR-DeniseNeural",rate="+3%").save(str(mp3))
            duration=probe(mp3)
            speed=max(1.0,duration/28.2)
            wav=audio/f"{i+1:02}.wav"
            run("ffmpeg","-hide_banner","-loglevel","error","-y","-i",str(mp3),"-af",
                f"atempo={speed:.5f},apad,atrim=duration=30,afade=t=out:st=29.7:d=0.3",
                "-ar","48000","-ac","1",str(wav))
            return {"scene":i+1,"id":scene["id"],"rawSpeechSeconds":duration,"speedFactor":speed,"segmentSeconds":30}
    results=await asyncio.gather(*(one(i,s) for i,s in enumerate(scenes)))
    listing=audio/"concat.txt"
    listing.write_text("\n".join(f"file '{(audio/f'{i+1:02}.wav').as_posix()}'" for i in range(len(scenes))),encoding="utf-8")
    output=ROOT/"demo/geodelivery-narration-fr.m4a"
    run("ffmpeg","-hide_banner","-loglevel","error","-y","-f","concat","-safe","0","-i",str(listing),
        "-c:a","aac","-b:a","128k","-t","600",str(output))
    def timestamp(t,sep=","):
        h=int(t//3600);m=int(t%3600//60);s=int(t%60);ms=round((t-int(t))*1000)
        return f"{h:02}:{m:02}:{s:02}{sep}{ms:03}"
    subtitles=[]
    for i,s in enumerate(scenes):
        # Sous-titres fractionnes pour eviter un paragraphe de 30 secondes.
        words=s["narration"].split()
        chunks=[" ".join(words[j:j+12]) for j in range(0,len(words),12)]
        for j,chunk in enumerate(chunks):
            start=i*30+j*28.5/len(chunks)
            end=i*30+(j+1)*28.5/len(chunks)
            subtitles.append(f"{len(subtitles)+1}\n{timestamp(start)} --> {timestamp(end)}\n{chunk}\n")
    (ROOT/"demo/geodelivery-demo-complete.srt").write_text("\n".join(subtitles),encoding="utf-8")
    (ROOT/"docs/evidence/narration-10min.json").write_text(json.dumps({
        "voice":"fr-FR-DeniseNeural","synthetic":True,"language":"fr-FR","durationSeconds":probe(output),
        "scenes":results},ensure_ascii=False,indent=2),encoding="utf-8")
    print(f"Narration francaise generee : {probe(output):.2f} secondes, {len(results)} chapitres.")
asyncio.run(main())

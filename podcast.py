import os
import uuid
import re
from gtts import gTTS
from pydub import AudioSegment
import requests
from io import BytesIO


def generate_tts(text: str, voice: str, speaker: str = None) -> AudioSegment:
    """
    Generate TTS audio for a block of text.
    Supports Azure (if configured) or gTTS fallback.
    """
    tts_provider = os.getenv("TTS_PROVIDER", "").lower()
    if tts_provider == "azure":
        azure_key = os.getenv("AZURE_TTS_KEY")
        azure_endpoint = os.getenv("AZURE_TTS_ENDPOINT")
        deployment = os.getenv("AZURE_TTS_DEPLOYMENT", "tts")
        api_version = os.getenv("AZURE_TTS_API_VERSION", "2025-03-01-preview")
        voice = voice or os.getenv("AZURE_TTS_VOICE", "alloy")

        headers = {"api-key": azure_key, "Content-Type": "application/json"}
        payload = {"model": deployment, "input": text, "voice": voice}

        resp = requests.post(
            f"{azure_endpoint}/openai/deployments/{deployment}/audio/speech?api-version={api_version}",
            headers=headers,
            json=payload,
            timeout=30
        )
        resp.raise_for_status()
        return AudioSegment.from_file(BytesIO(resp.content), format="mp3")
    
    else:
        # ---- Fallback → gTTS with regional accents ----
        if speaker == "Speaker 1":
            # Example: Indian English accent
            tts = gTTS(text=text, lang="en", tld="ca")  
        else:
            # Example: UK English accent
            tts = gTTS(text=text, lang="en", tld="co.uk")

        buf = BytesIO()
        tts.write_to_fp(buf)
        buf.seek(0)
        return AudioSegment.from_file(buf, format="mp3")

    # return out_path


def create_podcast_from_script(script_text: str, output_file: str):
    """
    Podcast generator for exactly 2 speakers:
    - Preserves dialogue order (S1 → S2 → S1 → S2…)
    - Generates separate audio for each line
    - Merges them into a continuous podcast
    """
    os.makedirs("output/audio", exist_ok=True)

    # Parse script into ordered list of (speaker, line)
    dialogue = []
    for line in script_text.split("\n"):
        line = line.strip()
        if not line or ":" not in line:
            continue

        speaker, text = line.split(":", 1)
        speaker_clean = re.sub(r"[*]+", "", speaker).strip().lower()
        text = text.strip()

        if speaker_clean in ["speaker 1", "s1"]:
            dialogue.append(("Speaker 1", text))
        elif speaker_clean in ["speaker 2", "s2"]:
            dialogue.append(("Speaker 2", text))
        else:
            print(f"⚠️ Skipping unrecognized speaker: {speaker}")

    segments = []

    # Generate audio per line, keeping order
    for speaker, text in dialogue:
        try:
            if speaker == "Speaker 1":
                voice = "en-US-GuyNeural"
                # print("Guy selected")
            else:
                # print("Jenny Selected")
                voice = "en-US-JennyNeural"

            seg = generate_tts(text, voice, speaker=speaker)
            if seg:  # only append if valid
                segments.append(seg)
                # Add a short pause between speakers
                segments.append(AudioSegment.silent(duration=400))
            else:
                print(f"⚠️ Skipping empty segment for: {speaker} - {text}")

        except Exception as e:
            print(f"❌ Error generating TTS for {speaker}: {e}")
            continue

    if not segments:
        raise RuntimeError("No dialogue lines parsed!")

    # Merge into final audio
    final_podcast = segments[0]
    for seg in segments[1:]:
        final_podcast += seg

    final_podcast.export(output_file, format="mp3")
    return output_file


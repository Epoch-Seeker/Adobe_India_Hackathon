from fastapi import FastAPI, File , UploadFile ,  Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import json
import uuid
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import List

from .models import load_models
from .document_utils import parse_documents_structurally, merge_chunks_with_empty_titles
from .analyzer import rank_sections 
from utils.gemini_model import gemini_generate_insights, model_answer , generate_key_insights , generate_counterpoints , generate_podcast_script , generate_did_you_know

# TTS imports
from gtts import gTTS
import azure.cognitiveservices.speech as speechsdk
from pydub import AudioSegment  

class PDFAnalysisRequest(BaseModel):
    persona: str
    task: str
    top_chunks: List[dict]

app = FastAPI()
embedding_model = load_models()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----- Optimized TTS helper -----
def generate_tts(text: str, voice: str, out_path: str):
    """
    Generate TTS audio for a large block of text.
    Uses Azure if available, else gTTS.
    """
    tts_provider = os.getenv("TTS_PROVIDER", "").lower()
    azure_key = os.getenv("AZURE_TTS_KEY")
    azure_endpoint = os.getenv("AZURE_TTS_ENDPOINT")

    if tts_provider == "azure" and azure_key and azure_endpoint:
        speech_config = speechsdk.SpeechConfig(subscription=azure_key, endpoint=azure_endpoint)
        speech_config.speech_synthesis_voice_name = voice
        audio_config = speechsdk.audio.AudioOutputConfig(filename=out_path)
        synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)
        synthesizer.speak_text_async(text).get()
    else:
        # gTTS fallback
        tts = gTTS(text=text, lang="en")
        tts.save(out_path)


def create_podcast_from_script(script_text: str, output_file: str):
    """
    Optimized podcast generator:
    - Groups all lines per speaker together
    - Generates fewer TTS calls (1 per speaker block)
    - Merges into single MP3
    """
    os.makedirs("output/audio", exist_ok=True)

    speaker_blocks = {"Speaker 1": [], "Speaker 2": []}
    current_speaker = None

    # Parse script into blocks by speaker
    for line in script_text.split("\n"):
        line = line.strip()
        if not line or ":" not in line:
            continue
        speaker, text = line.split(":", 1)
        speaker = speaker.strip()
        text = text.strip()

        if speaker in speaker_blocks:
            speaker_blocks[speaker].append(text)

    segments = []

    # Generate audio for each speaker block
    for speaker, texts in speaker_blocks.items():
        if not texts:
            continue
        combined_text = " ".join(texts)

        if "1" in speaker:
            voice = "en-US-GuyNeural"
        else:
            voice = "en-US-JennyNeural"

        temp_path = os.path.join("output/audio", f"{speaker}_{uuid.uuid4()}.mp3")
        generate_tts(combined_text, voice, temp_path)
        segments.append(AudioSegment.from_file(temp_path))

    if not segments:
        return None

    # Merge segments into one podcast
    final_podcast = segments[0]
    for seg in segments[1:]:
        final_podcast += seg

    final_podcast.export(output_file, format="mp3")
    return output_file
# -------------------------------

# ---------- New Upload Endpoint ----------
@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    os.makedirs("input", exist_ok=True)
    file_path = os.path.join("input", file.filename)
    with open(file_path, "wb") as f:
        f.write(await file.read())
    return {"filename": file.filename, "path": file_path}

@app.post("/delete_old/")
async def delete_old():
    folder = "input"    
    if not os.path.exists(folder):
        return {"message": "Input folder does not exist."}

    deleted_files = []
    for old_file in os.listdir(folder):
        old_path = os.path.join(folder, old_file)
        if os.path.isfile(old_path):
            os.remove(old_path)
            deleted_files.append(old_file)

    return {
        "message": "All old files deleted successfully.",
        "deleted_files": deleted_files
    }



@app.post("/analyze/")
async def analyze_pdfs(request: Request):
    form = await request.form()
    raw_json = form.get("input_json")
    input_json = json.loads(raw_json)

    persona = input_json["persona"]["role"]
    task = input_json["job_to_be_done"]["task"]
    documents = input_json["documents"]

    uploaded_files = form.getlist("files")
    os.makedirs("input", exist_ok=True)

    file_map = {}
    for file in uploaded_files:
        file_path = os.path.join("input", file.filename)
        with open(file_path, "wb") as f:
            f.write(await file.read())
        file_map[file.filename] = file_path

    file_paths = [file_map[doc["filename"]] for doc in documents]

    chunks = parse_documents_structurally(file_paths)
    chunks = merge_chunks_with_empty_titles(chunks)

    base_query = f"As a {persona}, my goal is to {task}."
    general_answer = model_answer(base_query, chunks)
    ranked_chunks = rank_sections(general_answer, chunks, embedding_model)

    output = {
        "metadata": {
            "input_documents": [doc["filename"] for doc in documents],
            "persona": persona,
            "job_to_be_done": task,
            "processing_timestamp": datetime.now(timezone.utc).isoformat()
        },
        "extracted_sections": [
            {
                "document": chunk["doc_name"],
                "page_number": chunk["page_num"],
                "section_title": chunk["title"],
                "importance_rank": chunk["importance_rank"]
            } for chunk in ranked_chunks
        ],
        "sub_section_analysis": [
            {
                "document": chunk["doc_name"],
                "section_title": chunk["title"],
                "page_number": chunk["page_num"],
                "refined_text": chunk["content"]
            } for chunk in ranked_chunks
        ]
    }

    output_path = os.path.join("output", f"{uuid.uuid4()}.json")
    os.makedirs("output", exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=4, ensure_ascii=False)

    return JSONResponse(content=output)

@app.post("/analyze/text/")
async def analyze_pdfs_text(request: Request):
    form = await request.form()
    raw_json = form.get("input_json")
    input_json = json.loads(raw_json)

    text = input_json["text"]

    uploaded_files = form.getlist("files")
    os.makedirs("input", exist_ok=True)

    file_paths = list(map(lambda p: os.path.join('input', p), os.listdir('input')))

    chunks = parse_documents_structurally(file_paths)
    chunks = merge_chunks_with_empty_titles(chunks)

    base_query = f"Find and return the most relevant and important titles related to {text}. Focus on accuracy, reliability, and context."

    general_answer = model_answer(base_query, chunks)
    ranked_chunks = rank_sections(general_answer, chunks, embedding_model)

    output = {
        # "extracted_sections": [
        #     {
        #         "document": chunk["doc_name"],
        #         "page_number": chunk["page_num"],
        #         "section_title": chunk["title"],
        #         "importance_rank": chunk["importance_rank"]
        #     } for chunk in ranked_chunks
        # ],
        "sub_section_analysis": [
            {
                "document": chunk["doc_name"],
                "section_title": chunk["title"],
                "page_number": chunk["page_num"],
                "refined_text": chunk["content"]
            } for chunk in ranked_chunks
        ]
    }

    # output_path = os.path.join("output", f"{uuid.uuid4()}.json")
    # os.makedirs("output", exist_ok=True)
    # with open(output_path, "w", encoding="utf-8") as f:
    #     json.dump(output, f, indent=4, ensure_ascii=False)
    # print(output)

    return JSONResponse(content=output)

@app.post("/generate_key_insights/")
async def generate_apikey_insights(request: Request):
    form = await request.form()
    raw_json = form.get("input_json")
    input_json = json.loads(raw_json)

    # text is the selected content from PDFs
    text = input_json["text"]

    full_output = generate_key_insights(text)

    # Parse output into a clean list
    key_insights = [
        line.strip("- ").strip()
        for line in full_output.split("\n")
        if line.strip()
    ]

    return JSONResponse(content={"key_insights": key_insights})

@app.post("/did_you_know/")
async def did_you_know(request: Request):
    form = await request.form()
    raw_json = form.get("input_json")
    input_json = json.loads(raw_json)

    text = input_json["text"]

    full_output = generate_did_you_know(text)

    result = [
        line.strip("- ").strip()
        for line in full_output.split("\n")
        if line.strip()
    ]

    return JSONResponse(content={"did_you_know": result})

    
@app.post("/generate_contradictions/")
async def generate_contradictions(request: Request):
    form = await request.form()
    raw_json = form.get("input_json")
    input_json = json.loads(raw_json)

    # Extract selected text
    text = input_json["text"]

    full_output =  generate_counterpoints(text)

    # Normalize response
    if not full_output or "no available" in full_output.lower():
        result = ["There is no available points for selected text"]
    else:
        result = [
            line.strip("- ").strip()
            for line in full_output.split("\n")
            if line.strip()
        ]
    return JSONResponse(content={"contradictions": result})

@app.post("/generate_podcast/")
async def generate_podcast(request: Request):
    form = await request.form()
    raw_json = form.get("input_json")
    input_json = json.loads(raw_json)

    text = input_json["text"]

    # ----- Step 1: Extract relevant document titles -----
    file_paths = list(map(lambda p: os.path.join('input', p), os.listdir('input')))
    chunks = parse_documents_structurally(file_paths)
    chunks = merge_chunks_with_empty_titles(chunks)

    base_query = f"Find and return the most relevant and important titles related to {text}. Focus on accuracy, reliability, and context."
    general_answer = model_answer(base_query, chunks)
    ranked_chunks = rank_sections(general_answer, chunks, embedding_model) 
    
    # ----- Step 2: Key Insights -----
    insights_output = generate_key_insights(text)
    key_insights = [
        line.strip("- ").strip()
        for line in insights_output.split("\n")
        if line.strip()
    ]

    # ----- Step 3: Contradictions / Counterpoints -----
    contradictions_output = generate_counterpoints(text)
    if not contradictions_output or "no available" in contradictions_output.lower():
        contradictions = ["There is no available points for selected text"]
    else:
        contradictions = [
            line.strip("- ").strip()
            for line in contradictions_output.split("\n")
            if line.strip()
        ]

    # ----- Step 4: Combine everything -----
    combined_parts = []

    for chunk in ranked_chunks:
        part = (
            f"📄 Document: {chunk['doc_name']}\n"
            f"🔖 Title: {chunk['title']}\n"
            f"📝 Content:\n{chunk['content']}\n"
            "--------------------------------------\n"
        )
        combined_parts.append(part)

    # Now attach insights and counterpoints
    combined_text = (
        "\n".join(combined_parts)
        + "\n\n💡 Key Insights:\n" + "\n".join(key_insights)
        + "\n\n⚖️ Counterpoints / Contradictions:\n" + "\n".join(contradictions)
    )

    # print(combined_text)
    podcast_script: str = generate_podcast_script(
        user_text= text , combined_text=combined_text
    )
    # print(podcast_script)
    podcast_file_path = os.path.join("output/audio", f"podcast_{uuid.uuid4()}.mp3")
    podcast_audio_path = create_podcast_from_script(podcast_script, podcast_file_path)

    # ----- Step 2: Return Only Podcast -----
    return JSONResponse(content={
        "podcast_script": podcast_script,
        "podcast_file": f"/get_audio/{os.path.basename(podcast_audio_path)}" if podcast_audio_path else None
    })

    
@app.post("/generate_follow_on_features")
def generate_follow_on_features(request: PDFAnalysisRequest):
    insights_data = []

    # Merge top 5 chunks into one text block
    combined_text = "\n\n".join([
        f"Document: {chunk['document']} | Section: {chunk['section_title']} | Page {chunk['page_number']}\n{chunk['refined_text']}"
        for chunk in request.top_chunks[:5]
    ])

    try:
        # Call Gemini once for all chunks
        insight_result = gemini_generate_insights(
            chunk={"refined_text": combined_text},
            persona=request.persona,
            task=request.task
        )

        insights_data.append({
            "documents": [chunk["document"] for chunk in request.top_chunks[:5]],
            "sections": [chunk["section_title"] for chunk in request.top_chunks[:5]],
            "pages": [chunk["page_number"] for chunk in request.top_chunks[:5]],
            "key_insights": insight_result.get("key_insights", []),
            "did_you_know": insight_result.get("did_you_know", []),
            "contradictions": insight_result.get("contradictions", []),
            "docs": insight_result.get("docs", []),
            "podcast_script": insight_result.get("podcast_script", "")
        })

        # Build podcast from Gemini script
        podcast_script = insight_result.get("podcast_script", "")
        podcast_file_path = os.path.join("output/audio", f"podcast_{uuid.uuid4()}.mp3")
        podcast_audio_path = create_podcast_from_script(podcast_script, podcast_file_path)

        # print(insights_data)

        return {
            "results": insights_data,
            "podcast_file": f"/get_audio/{os.path.basename(podcast_audio_path)}"
        }


    except Exception as e:
        return {"error": str(e)}


@app.get("/get_audio/{filename}")
def get_audio(filename: str):
    file_path = os.path.join("output/audio", filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="audio/mpeg")
    return JSONResponse({"error": "File not found"}, status_code=404)

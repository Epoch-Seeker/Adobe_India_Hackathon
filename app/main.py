from fastapi import FastAPI, File , UploadFile ,  Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import json
import uuid
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import List
from fastapi.staticfiles import StaticFiles

from .models import load_models
from .document_utils import parse_documents_structurally, merge_chunks_with_empty_titles
from .analyzer import  build_faiss_index , semantic_search
from utils.gemini_model import model_answer , generate_key_insights , generate_counterpoints , generate_podcast_script , generate_did_you_know
from podcast import create_podcast_from_script
 
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

# ---------- Endpoints ----------
@app.post("/upload/")#done
async def upload_file(file: UploadFile = File(...)):
    os.makedirs("input", exist_ok=True)
    file_path = os.path.join("input", file.filename)
    with open(file_path, "wb") as f:
        f.write(await file.read())
    return {"filename": file.filename, "path": file_path}

@app.post("/delete_old/")#done
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

@app.post("/delete_old_audio/")#done
async def delete_old_audio():
    folder = "output/audio"
    if not os.path.exists(folder):
        return {"message": "Audio folder does not exist."}

    deleted_files = []
    for old_file in os.listdir(folder):
        old_path = os.path.join(folder, old_file)
        if os.path.isfile(old_path):
            os.remove(old_path)
            deleted_files.append(old_file)

    return {
        "message": "All old audio files deleted successfully.",
        "deleted_files": deleted_files
    }

@app.post("/analyze/")#done
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

    # --- your existing logic ---
    chunks = parse_documents_structurally(file_paths)
    chunks = merge_chunks_with_empty_titles(chunks)
    base_query = f"As a {persona}, my goal is to {task}."

    index, all_sentences, sentence_meta = build_faiss_index(chunks , embedding_model)
    relevant_sentences = semantic_search(embedding_model , base_query, index, all_sentences, sentence_meta, top_k=50, threshold=0.6)

    # Group sentences by document and title
    doc_map = {}
    for i, sentence in enumerate(relevant_sentences):
        doc_name = sentence["document"]
        if doc_name not in doc_map:
            doc_map[doc_name] = {
                "filename": doc_name,
                "sections": []
            }
        doc_map[doc_name]["sections"].append({
            "title": sentence["section_title"],
            "page": sentence["page_number"],
            "importance_rank": i + 1,  # rank by FAISS score order
            "content": sentence["refined_text"],
            "relevance_score": round(sentence["score"], 3)
        })

    output = {
        "persona": persona,
        "task": task,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "documents": list(doc_map.values())
    }

    return JSONResponse(content=output)

@app.post("/analyze/text/")#done
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

    index, all_sentences, sentence_meta = build_faiss_index(chunks , embedding_model)
    output_chunks = semantic_search( embedding_model , text, index, all_sentences, sentence_meta, top_k=10, threshold=0.65)


    output = {"sub_section_analysis": output_chunks}
    return JSONResponse(content=output)

@app.post("/generate_key_insights/")#done
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
    # print(key_insights)

    return JSONResponse(content={"key_insights": key_insights})

@app.post("/did_you_know/")#done
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
    # print(result)

    return JSONResponse(content={"did_you_know": result})

@app.post("/generate_contradictions/")#done
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
    # print(result)
    return JSONResponse(content={"contradictions": result})

@app.post("/generate_podcast/")#done
async def generate_podcast(request: Request):
    form = await request.form()
    raw_json = form.get("input_json")
    input_json = json.loads(raw_json)

    text = input_json["text"]

    # ----- Step 1: Extract relevant document titles -----
    file_paths = list(map(lambda p: os.path.join('input', p), os.listdir('input')))
    chunks = parse_documents_structurally(file_paths)
    chunks = merge_chunks_with_empty_titles(chunks)

    index, all_sentences, sentence_meta = build_faiss_index(chunks , embedding_model)
    output_chunks = semantic_search( embedding_model , text, index, all_sentences, sentence_meta, top_k=10, threshold=0.65)
    
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

    for chunk in output_chunks:
        part = (
            f"📄 Document: {chunk['document']}\n"
            f"🔖 Title: {chunk['section_title']}\n"
            f"📝 Content:\n{chunk['refined_text']}\n"
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

@app.post("/generate_podcast_role/")#done
async def gnerate_podcast_role(request: Request):
    form = await request.form()
    raw_json = form.get("input_json")
    input_json = json.loads(raw_json)

    text = input_json["role"]
    detail = input_json["detail"]

    podcast_script: str = generate_podcast_script(
        user_text= text , combined_text=detail
    )
    # print(podcast_script)
    podcast_file_path = os.path.join("output/audio", f"podcast_{uuid.uuid4()}.mp3")
    podcast_audio_path = create_podcast_from_script(podcast_script, podcast_file_path)
    print(podcast_audio_path)

    # ----- Step 2: Return Only Podcast -----
    return JSONResponse(content={
        "podcast_script": podcast_script,
        "podcast_file": f"/get_audio/{os.path.basename(podcast_audio_path)}" if podcast_audio_path else None
    })

@app.get("/get_audio/{filename}")#done
def get_audio(filename: str):
    file_path = os.path.join("output/audio", filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="audio/mpeg")
    return JSONResponse({"error": "File not found"}, status_code=404)

# # # Serve assets
app.mount("/assets", StaticFiles(directory="frontend_build/assets"), name="assets")

# Serve main index.html
@app.get("/")
async def serve_index():
    return FileResponse("frontend_build/index.html")
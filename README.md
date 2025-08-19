# Adobe_India_Hackathon
 This repository contains our final submission for the Adobe India Hackathon. The solution focuses on building an AI-powered PDF understanding and analysis system, designed to extract, summarize, and analyze document content with precision.

---

## ✨ Features  

- 📂 **Bulk PDF Uploads** – Upload and manage multiple PDFs at once.  
- 📖 **View Anytime** – Access any uploaded PDF whenever you need.  
- 💡 **Smart Text Selection** – Highlight text and explore AI-powered insights via a light bulb menu:  
  - 🔎 Find relevant sections from **all uploaded PDFs** related to the selected text.  
  - 📑 Jump directly to pages by clicking on generated section titles.  
  - 📌 Generate **Key Insights** for deeper understanding.  
  - ❓ Generate **Did You Know** facts.  
  - ⚖️ Generate **Counterpoints** for balanced perspectives.  
  - 🎙️ Generate a **Podcast** on the selected text.  
- 🧑‍🤝‍🧑 **Persona + Task Based Analysis** – Provide a persona and task to get relevant sections across PDFs, and generate a **podcast** tailored to the context.  
- 🎨 **Dark/Light Theme Support** – Switch themes seamlessly for a better reading experience.  

---

## 🛠️ Tech Stack  

- **Backend**: FastAPI  
- **Frontend**: React (Vite)  
- **AI/LLM**: Gemini (Google)  
- **Text-to-Speech**: Google / Azure TTS  
- **Dockerized**: CPU-only, AMD64 architecture  

---

## ⚡ Setup & Usage  

### 🔨 Build the Docker Image  
Run in **bash**:  
```bash
docker build --platform linux/amd64 -t adobe_pdf_analyzer .
```

### ▶️ Run the Container
Run in **Powershell**:
```bash
docker run -v "path/to/json_file:/credentials" `
  -e ADOBE_EMBED_API_KEY=adobe_embed_api_key `
  -e LLM_PROVIDER=gemini `
  -e GOOGLE_APPLICATION_CREDENTIALS=/credentials/credential_file.json `
  -e GEMINI_MODEL=gemini-2.5-flash `
  -e TTS_PROVIDER=google `
  -e AZURE_TTS_KEY=azure_tts_key `
  -e AZURE_TTS_ENDPOINT=azure_tts_endpoint `
  -p 8080:8080 adobe_pdf_analyzer

```

✅ Running the above command will bring up the application accessible at:  
👉 [http://localhost:8080](http://localhost:8080)  

> ⚠️ **Note**:  
> - The **build command** runs in **bash**.  
> - The **run command** should be executed in **PowerShell** only.  

---

## 🧑‍💻 Team Contribution  

This project is built as part of the **Adobe India Hackathon Final Round**, combining **AI + PDF Intelligence + Interactive UI** to create a powerful research and document analysis tool.  

---

## 📌 Future Scope  

- Advanced semantic search across documents.  
- Multi-lingual support.  
- Collaborative annotations and podcast sharing.  

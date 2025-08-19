import os
import google.auth
import google.generativeai as genai

"""
Unified LLM Module (Google Gemini only)

Functions available:
- get_llm() -> returns an initialized Gemini chat model
- get_llm_response(prompt_text) -> quick raw chat interface
- generate_podcast_script(user_text, combined_text)
- generate_did_you_know(text)
- model_answer(base_query, chunks)
- generate_key_insights(text)
- generate_counterpoints(text)
"""


# ---------------- Core Model Selector ---------------- #

def get_llm():
    """
    Initializes the Vertex AI client using Application Default Credentials
    and returns a Gemini model instance.
    """
    try:
        # The google-auth library automatically finds the credentials from the
        # GOOGLE_APPLICATION_CREDENTIALS environment variable.
        credentials, project_id = google.auth.default()

        # If the project ID isn't set in the credentials, get it from an env var.
        project = project_id or os.getenv("GOOGLE_CLOUD_PROJECT")
        if not project:
            raise ValueError("Google Cloud Project ID not found. Set it in your credentials or via the GOOGLE_CLOUD_PROJECT environment variable.")

        # Configure the client with the credentials.
        genai.configure(
            credentials=credentials,
        )

        # Initialize and return the model. Using a specific version like 'gemini-1.5-flash-001' is recommended.
        model = genai.GenerativeModel(
            model_name='gemini-2.5-flash',
            system_instruction="You are a helpful assistant." # Optional system instruction
        )
        
        return model

    except Exception as e:
        print(f"An error occurred while initializing the LLM: {e}")
        return None

# ---------------- Helper Functions ---------------- #

def get_llm_response(prompt_text: str) -> str:
    """
    Performs a quick raw chat request with the LLM.
    """
    llm = get_llm()
    if not llm:
        return "Error: Could not initialize the language model."
    
    response = llm.generate_content(prompt_text)
    return response.text.strip()

def generate_podcast_script(user_text: str, combined_text: str) -> str:
    prompt = f"""
    You are a podcast scriptwriter.
    Create a podcast conversation between two speakers (Alice and Bob).
    The conversation should be engaging, informative, and easy to follow.
    Use the following sources for context:
    ---
    User request: {user_text}
    Document, insights & counterpoints: {combined_text}
    ---

    Format strictly like this:
    Alice : ...
    Bob : ...
    Alice : ...
    Bob : ...
    End the script naturally.
    """
    llm = get_llm()
    if not llm:
        return "Error: Could not initialize the language model."
        
    response = llm.generate_content(prompt)
    return response.text

def generate_did_you_know(text: str):
    prompt = f"""
    You are a smart assistant that generates short, engaging "Did you know?" facts.

    Instructions:
    - Use the provided text as inspiration.
    - give at least 2 did you knows (you can give more also).
    - If possible, connect the fact to general knowledge related to the text.
    - Always start with: 💡Did you know? ...
    - If no meaningful or factual point can be made, respond exactly with:
    "There is no available fact for selected text"

    Text: {text}
    """
    llm = get_llm()
    if not llm:
        return "Error: Could not initialize the language model."
        
    response = llm.generate_content(prompt)
    return response.text.strip()

def model_answer(base_query: str, chunks: list) -> str:
    all_titles = [chunk["title"] for chunk in chunks if chunk.get("title")]
    titles_text = "\n".join(f"- {t}" for t in all_titles)

    prompt = (
        f"You are given the following section titles from a set of documents:\n"
        f"{titles_text}\n\n"
        f"Your task:\n"
        f"1. From the above list, identify only the titles that are most relevant and useful for answering this query:\n'{base_query}'.\n"
        f"2. Ignore titles that are generic, unrelated, or low-value for this query.\n"
        f"3. Based *only* on the most relevant titles you selected, write a concise, high-level answer to the query.\n"
        f"4. Ensure your answer includes specific wording and key phrases from the selected titles, so embedding similarity matches.\n"
        f"5. Do not invent new topics beyond what appears in the selected titles.\n\n"
        f"Now, give your answer:"
    )
    llm = get_llm()
    if not llm:
        return "Error: Could not initialize the language model."
        
    response = llm.generate_content(prompt)
    return response.text.strip()

def generate_key_insights(text: str):
    prompt = f"""
    Analyze the following content and extract **5 to 7 concise, high-value insights**. 
    Focus on clarity, reliability, and actionable meaning.

    - Each insight should be a standalone point.
    - Avoid fluff, focus on value.

    Content:
    {text}
    """
    llm = get_llm()
    if not llm:
        return "Error: Could not initialize the language model."
        
    response = llm.generate_content(prompt)
    return response.text.strip()

def generate_counterpoints(text: str):
    prompt = f"""
    Analyze the following content and identify contradictions, counterpoints, or opposing perspectives 
    and give me in brief.
    Output in pure plain English (not markdown).
    
    - If there are genuine counterpoints, list them clearly.

    Content:
    {text}
    """
    llm = get_llm()
    if not llm:
        return "Error: Could not initialize the language model."
        
    response = llm.generate_content(prompt)
    return response.text.strip()


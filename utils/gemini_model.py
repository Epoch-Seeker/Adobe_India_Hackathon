import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage

# Load environment variables
load_dotenv()

# Initialize Gemini 2.5 Flash
model = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0.7,
    google_api_key=os.getenv("GOOGLE_API_KEY")
)

def generate_podcast_script(user_text: str, combined_text: str) -> str:
    """
    Generate a podcast script between two speakers using
    user_text (task/topic) and combined_text (docs+insights).
    """
    prompt = f"""
You are a podcast scriptwriter.
Create a podcast conversation between two speakers (S1 and S2).
The conversation should be engaging, informative, and easy to follow.
Use the following sources for context:
---
User request: {user_text}
Document insights & counterpoints: {combined_text}
---

Format strictly like this:
Speaker 1: ...
Speaker 2: ...
Speaker 1: ...
Speaker 2: ...
End the script naturally.
    """

    response = model.invoke([HumanMessage(content=prompt)])
    
    return response.content

def generate_did_you_know(text : str):
    prompt = f"""
    You are a smart assistant that generates short, engaging "Did you know?" facts.

    Instructions:
    - Use the provided text as inspiration.
    - give atleast 2 did you knows . you can give more also.
    - If possible, connect the fact to general knowledge related to the text.
    - Always start with: Did you know? ...
    - If no meaningful or factual point can be made, respond exactly with:
    "There is no available fact for selected text"

    Text: {text}
    """
    response = model.invoke([HumanMessage(content=prompt)])
    full_output = response.content.strip()

    return full_output


def gemini_generate_insights(chunk, persona, task):
    """
    Generate structured insights + podcast script from Gemini 2.5 Flash.
    """
    prompt = f"""
    As a {persona} whose goal is to {task}, analyze the following content and produce output in EXACTLY this structure:

    ===KEY_INSIGHTS===
    - 5 to 7 concise, high-value insights.

    ===DID_YOU_KNOW===
    - 2 to 4 surprising or less obvious "Did you know?" style facts.

    ===CONTRADICTIONS===
    - List contradictions, disagreements, or counterpoints (if any).
    - If none, write "None found".

    ===DOC_REFERENCES===
    - Mention which sections, ideas, or topics from the documents seem most useful/relevant.

    ===PODCAST===
    Speaker 1: ...
    Speaker 2: ...
    Speaker 1: ...
    (Natural back-and-forth covering the above insights, facts, contradictions, and story-like summary in ~2 minutes of speech.)
    
    Content:
    {chunk.get('refined_text', '')}
    """

    response = model.invoke([HumanMessage(content=prompt)])
    full_output = response.content.strip()

    # Initialize structured sections
    key_insights, did_you_know, contradictions, docs, podcast_script = [], [], [], [], ""

    # Extract sections safely
    def extract_section(text, start, end=None):
        if start not in text:
            return ""
        section = text.split(start, 1)[1]
        if end and end in section:
            section = section.split(end, 1)[0]
        return section.strip()

    key_insights = [
        line.strip("- ").strip() for line in extract_section(full_output, "===KEY_INSIGHTS===", "===DID_YOU_KNOW===").split("\n") if line.strip()
    ]
    did_you_know = [
        line.strip("- ").strip() for line in extract_section(full_output, "===DID_YOU_KNOW===", "===CONTRADICTIONS===").split("\n") if line.strip()
    ]
    contradictions = [
        line.strip("- ").strip() for line in extract_section(full_output, "===CONTRADICTIONS===", "===DOC_REFERENCES===").split("\n") if line.strip()
    ]
    docs = [
        line.strip("- ").strip() for line in extract_section(full_output, "===DOC_REFERENCES===", "===PODCAST===").split("\n") if line.strip()
    ]
    podcast_script = extract_section(full_output, "===PODCAST===")

    return {
        "key_insights": key_insights,
        "did_you_know": did_you_know,
        "contradictions": contradictions,
        "docs": docs,
        "podcast_script": podcast_script
    }


def model_answer(base_query: str, chunks: list) -> str:
    """
    Generates a general answer to the query by looking at all document section titles
    and selecting only the most useful ones for later cosine similarity search.
    """
    all_titles = [chunk["title"] for chunk in chunks if chunk.get("title")]
    titles_text = "\n".join(f"- {t}" for t in all_titles)

    prompt = (
        f"You are given the following section titles from a set of documents:\n"
        f"{titles_text}\n\n"
        f"Your task:\n"
        f"1. From the above list, identify only the titles that are most relevant and useful for answering this query:\n'{base_query}'.\n"
        f"2. Ignore titles that are generic, unrelated, or low-value for this query.\n"
        f"3. Based *only* on the most relevant titles you selected, write a concise, high-level answer to the query.\n"
        f"4. Ensure your answer includes specific wording and key phrases from the selected titles, so that embedding-based similarity search will match these titles to the relevant original document sections.\n"
        f"5. Do not invent new topics beyond what appears in the selected titles.\n\n"
        f"Now, give your answer:"
    )

    response = model.invoke([HumanMessage(content=prompt)])
    return response.content.strip()


def generate_key_insights(text : str):
    # Build prompt only for key insights
    prompt = f"""
    Analyze the following content and extract **5 to 7 concise, high-value insights**. 
    Focus on clarity, reliability, and actionable meaning.

    - Each insight should be a standalone point.
    - Avoid fluff, focus on value.

    Content:
    {text}
    """

    # Call model
    response = model.invoke([HumanMessage(content=prompt)])
    full_output = response.content.strip()

    return full_output

def generate_counterpoints(text : str):
    # Prompt for contradictions
    prompt = f"""
    Analyze the following content and identify contradictions, counterpoints, or opposing perspectives and 
    give me in brief.
    give output in pure plain english not in markdown form.
    
    - If there are genuine counterpoints, list them clearly.

    Content:
    {text}
    """

    # Call model
    response = model.invoke([HumanMessage(content=prompt)])
    full_output = response.content.strip()

    return full_output
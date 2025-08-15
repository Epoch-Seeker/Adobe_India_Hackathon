from pydantic import BaseModel
from typing import List, Dict

class DocumentItem(BaseModel):
    filename: str
    title: str

class ChallengeInfo(BaseModel):
    challenge_id: str
    test_case_name: str
    description: str

class Persona(BaseModel):
    role: str

class Job(BaseModel):
    task: str

class InputJSON(BaseModel):
    challenge_info: ChallengeInfo
    documents: List[DocumentItem]
    persona: Persona
    job_to_be_done: Job

 # includes doc_name, title, page_num, refined_text

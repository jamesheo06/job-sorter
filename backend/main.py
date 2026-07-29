from fastapi import FastAPI
from pydantic import BaseModel
from google import genai
import os
from dotenv import load_dotenv

load_dotenv()
# fastapi allows other programs to call your functions
app = FastAPI()
client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))

class AnalyzeRequest(BaseModel):
    resume: str
    job_description: str

# whenever someone sends a POST request to /analyze, run this function and send back its results 
@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    prompt = f"""You are helping a CS student evaluate a job posting.
The student is specifically interested in Software Engineering (SWE) and Machine Learning (ML) roles.
    
Resume:
{req.resume}

Job Description:
{req.job_description}

Consider whether this posting aligns with SWE/ML career goals, not just whether the skills technically overlap.

Return ONLY valid JSON, no other text, in this exact format:
{{"category: "Strong Apply" | "Consider" | "Skip", "confidence": 0-100, "matching_skills": [...], "missing_skills": [...]}}
"""
    
    response = client.models.generate_content(
        model = "gemini-3.5-flash-lite",
        contents = prompt
    )

    return {"raw": response.text}
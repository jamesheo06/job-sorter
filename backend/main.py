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

Resume:
{req.resume}

Job Description:
{req.job_description}

Return ONLY valid JSON, no other text, in this exact format:
{{"category: "Strong Apply" | "Consider" | "Skip", "confidence": 0-100, "matching_skills": [...], "missing_skills": [...]}}
"""
    response = client.models.generate_content(
        model = "gemini-flash-latest",
        contents = prompt
    )
    return {"raw": response.text}
from fastapi import FastAPI
from pydantic import BaseModel, ValidationError
from google import genai
import os, json
from dotenv import load_dotenv

load_dotenv()
# fastapi allows other programs to call your functions
app = FastAPI()
client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))

# defines the shape of input, 422 error if it doesn't match
class AnalyzeRequest(BaseModel):
    resume: str
    job_description: str

# defines the shape of the output
class AnalysisResult(BaseModel):
    category: str
    confidence: int
    matching_skills: list[str]
    missing_skills: list[str]

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
    # exception handling for LLM API call
    try:
        response = client.models.generate_content(
            model = "gemini-3.5-flash-lite",
            contents = prompt
        )
    except Exception as e:
        return {"error": "LLM request failed", "details": str(e)}

    # remove whitespace from beginning and end of string
    raw_text = response.text.strip()

    # strip markdown code fences if LLM adds them
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
        raw_text = raw_text.strip()

    
    # parsing means converting text into structured data format
    # here we are trying to parse the string into a Python dictionary
    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        return {"error": "Failed to parse LLM response", "raw": raw_text}
    
    # check if parsed json matches expected shape
    # **parsed unpacks the dictionary into the model's fields
    try:
        validated = AnalysisResult(**parsed)
    except ValidationError as e:
        return {"error": "LLM response did not match expected shape", "details": str(e), "raw": parsed}

    return validated
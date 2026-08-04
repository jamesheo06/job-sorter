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
    title: str | None = None
    company: str | None = None
    job_description: str

# defines the shape of the output
class AnalysisResult(BaseModel):
    reasoning: str
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

Before producing your final answer, carefully reason through the requirements:
- Some requirements are phrased as alternatives (e.g. "experience in one or more of X, Y, Z", "X or Y"). If the candidate satisfies ANY ONE of the listed alternatives, do NOT list the others as missing.
- Distinguish between required/must-have skills and preferred/bonus/nice-to-have skills (often signaled by phrases like "a plus", "bonus", "preferred", "nice to have"). Only list a skill as missing if it is a genuine requirement the candidate lacks — do not penalize missing bonus/preferred skills as heavily as missing core requirements.
- Be careful: a posting phrasing its core, central requirement in encouraging or beginner-friendly language (e.g. "we welcome candidates willing to learn X", "any experience level with X is fine") does NOT mean X is optional — it means the bar for X is lower, not that X is unnecessary. If the role's fundamental day-to-day work centers on a specific skill or technology (e.g. a role built around 3D/game-engine development), lacking that skill is a meaningful gap regardless of how welcoming the posting's tone is, and should weigh toward "Consider" rather than "Strong Apply", or "Skip" if the gap from the candidate's actual demonstrated experience is large.
- Consider whether this posting aligns with SWE/ML career goals overall, not just literal keyword overlap between resume and posting.

Return ONLY valid JSON, no other text, in this exact format:
{{
  "reasoning": "2-3 sentence explanation of the fit, referencing how you handled any OR-style or bonus requirements",
  "category": "Strong Apply",
  "confidence": 87,
  "matching_skills": ["Python", "FastAPI"],
  "missing_skills": ["C++"]
}}

Rules:
- category must be one of: "Strong Apply", "Consider", or "Skip"
- confidence must be an integer from 0 to 100
- matching_skills and missing_skills must be arrays of strings
- missing_skills should only include genuine gaps in required skills, not unmet "bonus" or "preferred" items unless there are many of them
- reasoning must come first in the JSON so you think it through before committing to the categorical fields
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
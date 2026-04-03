from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import os
import shutil
from pathlib import Path
import tempfile
import re

from src.pipeline import run_pipeline

# Initialize FastAPI app
app = FastAPI(
    title="Resume Analyzer API",
    description="API for analyzing resume-job description matching using RAG pipeline",
    version="1.0.0"
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Response models (Pydantic Models)
class AnalysisResponse(BaseModel):
    success: bool
    match_score: Optional[int] = None
    missing_skills: Optional[list[str]] = None
    improvement_suggestions: Optional[list[str]] = None
    recommended_skills: Optional[list[str]] = None
    raw_analysis: Optional[str] = None
    error: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    message: str

# Utility function to save uploaded files temporarily
def save_upload_file(upload_file: UploadFile, destination: Path) -> None:
    """Save uploaded file to destination path"""
    try:
        with destination.open("wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
    finally:
        upload_file.file.close()

# Parse LLM response to extract structured data
def parse_llm_response(response_text: str) -> dict:
    """
    Parse the LLM response to extract match score, missing skills, 
    suggestions, and recommendations
    """
    response_text = re.sub(r"\*\*","", response_text)
    result = {
        "match_score": None,
        "missing_skills": [],
        "improvement_suggestions": [],
        "recommended_skills": [],
        "cleaned_text": response_text
    }
    
    # Extract match score (looking for patterns like "Score: 75" or "75/100")
    score_pattern = r'(?:match\s+score|score)[:\s]*(\d+)'
    score_match = re.search(score_pattern, response_text, re.IGNORECASE)
    if score_match:
        result["match_score"] = int(score_match.group(1))
    
    # Split response into sections
    sections = {
        # "missing_skills": r'(?:missing\s+skills?|skills?\s+gap)[:\s]*(.*?)(?=\n\n|\d+\.|$)',
        # "improvements": r'(?:suggest(?:ed)?\s+improvements?|improvements?)[:\s]*(.*?)(?=\n\n|\d+\.|$)',
        # "recommendations": r'(?:recommend(?:ed)?\s+(?:additional\s+)?skills?|additional\s+skills?)[:\s]*(.*?)(?=\n\n|\d+\.|$)'
        
    "missing_skills": r'(?:missing\s+skills?|skills?\s+gap)[:\s]*([\s\S]*?)(?=\n\s*\n\s*\*\*|\n\s*\n\s*[A-Z]|$)',
    "improvements": r'(?:suggest(?:ed)?\s+improvements?|improvements?)[:\s]*([\s\S]*?)(?=\n\s*\n\s*\*\*|\n\s*\n\s*[A-Z]|$)',
    "recommendations": r'(?:recommend(?:ed)?\s+(?:additional\s+)?skills?|additional\s+skills?)[:\s]*([\s\S]*?)(?=\n\s*\n\s*\*\*|\n\s*\n\s*[A-Z]|$)'

    }
    
    for key, pattern in sections.items():
        match = re.search(pattern, response_text, re.IGNORECASE | re.DOTALL)
        if match:
            content = match.group(1).strip()
            # Extract bullet points or numbered items
            # items = re.findall(r'(?:^|\n)[\s-]*(?:\d+\.|\*|\-)\s*([^\n]+)', content)
            items = re.findall(r'(?:^|\n)\s*(?:\d+\.|\-|\*)\s*(.+)', content)
            items = [re.sub(r'\*\*', '', item).strip() for item in items]
            if not items:
                # If no bullets, split by newlines
                items = [line.strip() for line in content.split('\n') if line.strip()]
            
            if key == "missing_skills":
                result["missing_skills"] = items
            elif key == "improvements":
                result["improvement_suggestions"] = items
            elif key == "recommendations":
                result["recommended_skills"] = items
    
    return result

# API Endpoints

@app.get("/", response_model=HealthResponse)
async def root():
    """Root endpoint - API health check"""
    return HealthResponse(
        status="healthy",
        message="Resume Analyzer API is running"
    )

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        message="All systems operational"
    )

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_resume(
    resume: UploadFile = File(..., description="Resume PDF file"),
    job_description: UploadFile = File(..., description="Job description text file or PDF")
):
    """
    Analyze resume against job description
    
    Args:
        resume: PDF file containing the candidate's resume
        job_description: Text or PDF file containing the job description
        
    Returns:
        AnalysisResponse with match score, missing skills, and recommendations
    """
    
    # Validate file types
    if not resume.filename.endswith('.pdf'):
        raise HTTPException(
            status_code=400, 
            detail="Resume must be a PDF file"
        )
    
    if not (job_description.filename.endswith('.txt') or job_description.filename.endswith('.pdf')):
        raise HTTPException(
            status_code=400,
            detail="Job description must be a .txt or .pdf file"
        )
    
    # Create temporary directory for uploaded files
    temp_dir = tempfile.mkdtemp()
    
    try:
        # Save uploaded files
        resume_path = Path(temp_dir) / "resume.pdf"
        jd_path = Path(temp_dir) / f"job_description{Path(job_description.filename).suffix}"
        
        save_upload_file(resume, resume_path)
        save_upload_file(job_description, jd_path)
        
        # Run the pipeline
        raw_response = run_pipeline(str(resume_path), str(jd_path))
        raw_response = re.sub(r"\*\*", "", raw_response) # new line added on 03-04-2026
        # Parse the response
        parsed_data = parse_llm_response(raw_response)
        
        return AnalysisResponse(
            success=True,
            match_score=parsed_data["match_score"],
            missing_skills=parsed_data["missing_skills"],
            improvement_suggestions=parsed_data["improvement_suggestions"],
            recommended_skills=parsed_data["recommended_skills"],
            # raw_analysis=raw_response
            raw_analysis = parsed_data["cleaned_text"]
        )
        
    except Exception as e:
        return AnalysisResponse(
            success=False,
            error=f"Analysis failed: {str(e)}"
        )
        
    finally:
        # Cleanup temporary files
        shutil.rmtree(temp_dir, ignore_errors=True)

@app.post("/analyze-text", response_model=AnalysisResponse)
async def analyze_resume_with_text_jd(
    resume: UploadFile = File(..., description="Resume PDF file"),
    job_description_text: str = Form(..., description="Job description as plain text")
):
    """
    Analyze resume against job description provided as text
    
    Args:
        resume: PDF file containing the candidate's resume
        job_description_text: Job description as plain text string
        
    Returns:
        AnalysisResponse with match score, missing skills, and recommendations
    """
    
    # Validate file type
    if not resume.filename.endswith('.pdf'):
        raise HTTPException(
            status_code=400,
            detail="Resume must be a PDF file"
        )
    
    # Create temporary directory
    temp_dir = tempfile.mkdtemp()
    
    try:
        # Save resume
        resume_path = Path(temp_dir) / "resume.pdf"
        save_upload_file(resume, resume_path)
        
        # Save job description text to file
        jd_path = Path(temp_dir) / "job_description.txt"
        jd_path.write_text(job_description_text, encoding='utf-8')
        
        # Run the pipeline
        raw_response = run_pipeline(str(resume_path), str(jd_path))
        raw_response = re.sub(r"\*\*", "", raw_response) # new line added on 03-04-2026
        # Parse the response
        parsed_data = parse_llm_response(raw_response)
        
        return AnalysisResponse(
            success=True,
            match_score=parsed_data["match_score"],
            missing_skills=parsed_data["missing_skills"],
            improvement_suggestions=parsed_data["improvement_suggestions"],
            recommended_skills=parsed_data["recommended_skills"],
            raw_analysis=raw_response
        )
        
    except Exception as e:
        return AnalysisResponse(
            success=False,
            error=f"Analysis failed: {str(e)}"
        )
        
    finally:
        # Cleanup temporary files
        shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
    
    
    # yeaaa
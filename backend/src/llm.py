from langchain_groq import ChatGroq
from dotenv import load_dotenv
import os

load_dotenv()
groq_api_key = os.getenv("GROQ_API_KEY")

def get_llm():
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0.3,
        groq_api_key = groq_api_key
    )

def generate_response(llm, resume_text, retrieved_docs):
    context = "\n".join([doc.page_content for doc in retrieved_docs])

    prompt = f"""
    You are an AI resumse analyzer.PermissionError

    Resume:
    {resume_text}

    Job Requirements:
    {context}

    Tasks:
    1. Give a match score (0-100)
    2. Identify missing skills
    3. Suggest improvements
    4. Recommend additional skills

    """

    response = llm.invoke(prompt)
    return response.content

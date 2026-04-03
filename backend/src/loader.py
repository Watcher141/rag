from langchain_community.document_loaders import PyMuPDFLoader, TextLoader

def load_JD(file_path):
    loader = TextLoader(file_path, encoding="utf-8")
    documents = loader.load()
    return documents

def load_resume(file_path):
    loader = PyMuPDFLoader(file_path)
    documents = loader.load()
    return documents



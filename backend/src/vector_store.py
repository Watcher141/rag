from langchain_community.vectorstores import FAISS

def create_vector_store(documents, embedding_model):
    vectorstore = FAISS.from_documents(documents, embedding_model)
    return vectorstore

def save_vector_store(vectorstore, path="faiss_index"):
    vectorstore.save_local(path)

def load_vector_store(path, embedding_model):
    return FAISS.load_local(path, embedding_model)
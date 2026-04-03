from langchain_community.embeddings import HuggingFaceBgeEmbeddings

def get_embedding_model():
    return HuggingFaceBgeEmbeddings(
        model_name = "sentence-transformers/all-MiniLM-L6-v2"
    )
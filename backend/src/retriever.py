# this function converts the database into a searchable object
def get_retriever(vectorstore, k=5):
    return vectorstore.as_retriever(search_kwargs={"k":k})

# it takes the JD as reference and the Resume to query the JD
def retrieve_docs(retriever, query):
   return retriever.invoke(query)
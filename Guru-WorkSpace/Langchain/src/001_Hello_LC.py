from dotenv import load_dotenv
import os
from langchain_ollama import ChatOllama

load_dotenv()

def main():
    # Use your locally running Qwen model
    llm = ChatOllama(
        model="qwen-128k",
        base_url="http://localhost:11434",
        temperature=0.1
    )
    query = input("Enter the question: ")
    response = llm.invoke(query)
    print(response.content)

if __name__ == "__main__":
    main()
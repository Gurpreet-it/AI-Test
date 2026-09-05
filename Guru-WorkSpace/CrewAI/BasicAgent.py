# Test Ananlyst Agent
# 
# a senior QA with 15 years (JIRA MD)
#  of experience. Based on the feature, 
# it will just analyze the requirement
# and suggest a 5-10 testcases(p0 testcases).

from pathlib import Path

from crewai import Agent, Task, Crew, LLM
from dotenv import load_dotenv
import os


# By Default crew AI actually the brain which
# OpenAI - GROQ API Key


# Step 0 - Set up the Brain
# Step 1. - Define the Agent (identity)
# Step 2. - Give the Task to the Agent
# Step 3. Add them to the Crew
# Step 4. Kick Off Agent.

# Prompt vs Skill vs AI Agent

# Step 0 - Set up the Brain (Groq LLM)
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

# Use only values defined in the local .env file for connection settings.
groq_api_key = os.getenv("GROQ_API_KEY")
groq_model = os.getenv("GROQ_MODEL")
groq_base_url = os.getenv("GROQ_BASE_URL")

if not groq_api_key or not groq_model or not groq_base_url:
    raise RuntimeError(
        "Missing required Groq connection variables in .env: "
        "GROQ_API_KEY, GROQ_MODEL, and GROQ_BASE_URL must all be set."
    )

groq_model = groq_model.strip()
groq_base_url = groq_base_url.rstrip("/")
if "api.groq.com" in groq_base_url and "/openai/v1" not in groq_base_url:
    groq_base_url = groq_base_url + "/openai/v1"

groq_llm = LLM(
    model=groq_model,
    api_key=groq_api_key,
    base_url=groq_base_url,
    provider="openai",
)

# Step 1. - Define the Agent (identity)
qa_agent = Agent(
    role="QA Enginner",
    goal="Analyse the feature or the requirements, and create 5-10 test cases out of it.",
    backstory="You are a senior QA engineer with 15 years of experience in test planning and testcases creation",
    llm=groq_llm,
    verbose=True,
)

# Step 2 - Give the Task to the Agent
test_case_task = Task(
    description="Create 5-10 test cases",
    expected_output="A numbered list of 5-10 test cases with brief descriptions for a app.vwo.com Login page with the username, password and submit button with remember me functionality",
    agent=qa_agent
)

# Step 3. Add them to the Crew
crew = Crew(
    agents=[qa_agent],
    tasks=[test_case_task],
    verbose=True
)

# Step 4. kickOff
if __name__ == "__main__":
    result = crew.kickoff()
    print(result)
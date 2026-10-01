from jira import JIRA
import os
from dotenv import load_dotenv

load_dotenv('.env')

jira_url = os.getenv('JIRA_BASE_URL')
jira_email = os.getenv('JIRA_EMAIL')
jira_token = os.getenv('JIRA_TOKEN')

jira = JIRA(jira_url, basic_auth=(jira_email, jira_token))

try:
    issue = jira.issue('HMA-401957')
    print(f"✓ Issue: {issue.key}")
    print(f"✓ Summary: {issue.fields.summary}")
    print(f"✓ Type: {issue.fields.issuetype.name}")
    print(f"✓ Status: {issue.fields.status.name}")
    print(f"✓ Description: {issue.fields.description[:200] if issue.fields.description else '(none)'}")
except Exception as e:
    print(f"Error: {e}")

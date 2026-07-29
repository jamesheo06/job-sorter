import requests

resume = """Resume
"""

job_description = """Job posting
"""

response = requests.post(
    "http://localhost:8000/analyze",
    json={"resume": resume, "job_description": job_description}
)

print("Status code:", response.status_code)
print("Response:")
print(response.text)
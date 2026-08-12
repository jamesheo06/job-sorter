# Job Sorter

A Chrome extension + FastAPI backend that analyzes co-op/internship job postings against your resume using an LLM, and tells you whether to apply.

Built for the [UBC Science Co-op portal](https://scope.sciencecoop.ubc.ca) — click a posting, click Analyze, get a categorized recommendation (Strong Apply / Consider / Skip) with reasoning, matching skills, and missing skills, directly in the extension popup.

---

## How it works

```
UBC Co-op Portal posting
        │
        ▼
Chrome Extension (reads the page)
        │
        ▼
FastAPI Backend  →  LLM API (Google Gemini)
        │
        ▼
"Strong Apply / Consider / Skip" + reasoning, shown in the extension
```

The extension reads the DOM of the posting page you're already viewing — no scraping, no automation, just a content script extracting the title, company, and full posting text from a page you manually opened. That data is sent to a FastAPI backend, which prompts an LLM to compare it against your resume and returns a structured verdict.

---

## Features

- **On-click analysis** — no background polling or automatic calls, so LLM costs stay negligible (~$0.003/call)
- **Structured, validated output** — every LLM response is validated against a Pydantic schema (category, confidence, reasoning, matching/missing skills) before being returned
- **Resume storage** — paste your resume once, saved locally via `chrome.storage.local`, no need to re-enter it or hardcode it in source
- **Prompt handles real-world posting language**, including:
  - OR-style requirements (e.g. "experience in C, C++, or Python") — doesn't penalize you for missing listed alternatives once one is satisfied
  - Required vs. bonus/preferred skills — weighted differently rather than treated as equally important
  - Tone vs. substance — an encouraging, beginner-friendly posting for a role's core skill isn't treated as "this skill is optional"

---

## Tech Stack

- **Extension:** JavaScript, Chrome Extension APIs (Manifest V3) — `chrome.scripting`, `chrome.storage.local`, content script injection
- **Backend:** Python, FastAPI, Pydantic
- **LLM:** Google Gemini API
- **Storage:** SQLite *(in progress — analysis history persistence)*

---

## Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

Create a `.env` file in `backend/` with your Gemini API key:

```
GEMINI_API_KEY=your_key_here
```

Run the server:

```bash
uvicorn main:app --reload
```

### Extension

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `extension/` folder
5. Open a posting on the UBC Co-op portal, click the extension icon, paste your resume under "Resume settings" and save
6. Click **Analyze Job**

---

## Architecture Notes

The extension never talks to the LLM directly — it only ever calls the backend's `/analyze` endpoint. The backend is the only thing that knows which LLM provider is in use, isolated behind a single function call. This makes swapping providers (or comparing several) a contained backend change, not a rewrite across the whole project.

---

## Status

Core pipeline (extension → backend → LLM → result in popup) is fully working and has been validated against real postings.

**In progress:** SQLite-backed history, so previously analyzed postings show their last result instead of requiring a fresh check.

**Not built:** batch/automated analysis across multiple postings at once.

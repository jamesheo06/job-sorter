// document is the whole webpage
// .getElementById("analyzeBtn") - searches that page for an element whose id attribute is "analyzeBtn" and returns a reference to that DOM element
// DOM element is a JavaScript object representing one HTML tag on the page
const button = document.getElementById("analyzeBtn");
const resumeInput = document.getElementById("resumeInput");
const saveResumeBtn = document.getElementById("saveResumeBtn");
const resumeStatus = document.getElementById("resumeStatus");

const resultSection = document.getElementById("resultSection");
const resultCategory = document.getElementById("resultCategory");
const resultConfidence = document.getElementById("resultConfidence");
const resultReasoning = document.getElementById("resultReasoning");
const resultMatching = document.getElementById("resultMatching");
const resultMissing = document.getElementById("resultMissing");
const errorMessage = document.getElementById("errorMessage");

// Load saved resume into the textarea when the popup opens
// chrome.storage.local is Chrome's built-in key-value storage for extensions
// .get("resume", callback) - asks for the value stored under the key "resume"
// if (data.resume) - guards against empty case
chrome.storage.local.get("resume", (data) => {
	if (data.resume) {
		resumeInput.value = data.resume;
	}
});

// .set({ resume: resumeInput.value }, callback) - writes the textarea's current value under the key "resume"
// The callback then shows "Saved!", and setTimeout(..., 2000) clears it after 2 seconds
saveResumeBtn.addEventListener("click", () => {
	chrome.storage.local.set({ resume: resumeInput.value }, () => {
		resumeStatus.textContent = "Saved!";
		setTimeout(() => { resumeStatus.textContent = ""; }, 2000);
	});
});

// Takes the AnalysisResult object from the backend and writes it into the DOM
// .textContent - sets the visible text of an element (safer than innerHTML, no HTML parsing)
function renderResult(data) {
	resultCategory.textContent = data.category;
	resultConfidence.textContent = `Confidence: ${data.confidence}%`;
	resultReasoning.textContent = data.reasoning;

	// .map() builds an array of "<li>text</li>" elements, .join("") glues them into one string
	resultMatching.innerHTML = data.matching_skills.map(skill => `<li>${skill}</li>`).join("");
	resultMissing.innerHTML = data.missing_skills.map(skill => `<li>${skill}</li>`).join("");

	resultSection.classList.remove("hidden");
}

// .addEventListener("click", async () => { ... }) - when the element is clicked, run this function
// async - function is allowed to use 'await' inside it
button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "Analyzing...";

    resultSection.classList.add("hidden");
    errorMessage.classList.add("hidden");
    reasoningDetails.removeAttribute("open");

    try {
        // const { resume } = ... - destructing, pulls the resume field from the object
        // await chrome.storage.local.get("resume") - promise-based form
        // throw error when when key is never set or empty
        const { resume } = await chrome.storage.local.get("resume");
        if (!resume) {
			throw new Error("No resume saved yet. Add one in Resume settings above.");
		}

        // 1. Get the active tab
        // chrome.tabs.query() - asks Chrome to give a list of tabs matching the filters
        // { active: true, currentWindow: true } - whatever page you're looking at when you click the extension icon
        // const [tab] = ... - array destructuring, take first element of the array and call it tab
        // await - wait for chrome.tabs.query since it's asynchronous
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // 2. Inject content.js into that page so extractJobPosting() exists there
        // target: { tabId: tab.id } - determines which tab to run code in
        // files: ["content/content.js"] - determines what code to run
        // extractJobPosting() now exists and is callable
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content/content.js"],
        });

        // 3. Call extractJobPosting() on the page and get its return value back
        // func: - run this function on the page and give whatever it returns
        // const [{ result }] = ... - two destructing patterns stacked, get first array and from that object, pull out result field
        const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => extractJobPosting(),
        });

        // 4. Send the extracted data to your backend
        // fetch - standard web API for HTTP requests
        // POST request to backend (POST request is sending data, GET request is retreiving data from a server)
        // These requests are request methods in HTTP request
        // HTTP request is a digital message sent by a client to a server to ask for data or trigger an action
        // headers tells server what content we're sending, here it's JSON
        // JSON.stringify() - converts object into a JSON text string before sending it
        // this is done because 'body' has to be a string
        const response = await fetch("http://localhost:8000/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                resume: resume,
                title: result.title,
                company: result.company,
                job_description: result.rawText,
                posting_id: result.postingId,
            }),
        });

        // response at this point is metadata about the HTTP response
        // response.json() - actually reads and parses the response body as JSON, giving a real JS object
        const data = await response.json();
        console.log("Analysis result:", data);
        renderResult(data);

        button.textContent = "Analyze Job";
    } catch (err) {
        console.error("Analysis failed:", err);
        errorMessage.textContent = err.message;
        errorMessage.classList.remove("hidden");
        button.textContent = "Error - try again";
    } finally {
        button.disabled = false;
    }
});
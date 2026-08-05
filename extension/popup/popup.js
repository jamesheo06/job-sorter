// document is the whole webpage
// .getElementById("analyzeBtn") - searches that page for an element whose id attribute is "analyzeBtn" and returns a reference to that DOM element
// DOM element is a JavaScript object representing one HTML tag on the page
// .addEventListener("click", async () => { ... }) - when the element is clicked, run this function
// async - function is allowed to use 'await' inside it
const button = document.getElementById("analyzeBtn");

button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "Analyzing...";

    try {
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
        const RESUME_TEXT = `Resume`; // temporary, move to storage later

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
                resume: RESUME_TEXT,
                title: result.title,
                company: result.company,
                job_description: result.rawText,
            }),
        });

        // response at this point is metadata about the HTTP response
        // response.json() - actually reads and parses the response body as JSON, giving a real JS object
        const data = await response.json();
        console.log("Analysis result:", data);

        button.textContent = "Analyze Job";
    } catch (err) {
        console.error("Analysis failed:", err);
        button.textContent = "Error - try again";
    } finally {
        button.disabled = false;
    }
});
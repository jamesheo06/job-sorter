console.log("Job Sorter loaded!");

function extractJobPosting() {
    // querySelector() - finds the first matching element
    const header = document.querySelector(".dashboard-header__profile-information");

    // ?. - optional chaining, if the thing before it is null/undefined, stop and return undefined instead of crashing
    // ?? - returns default value when chain yields null/undefined, here returns empty string
    const titleRaw = header?.querySelector("h1")?.textContent.trim() ?? "";
    // .replace(/regex/, "replacement") - string cleanup
    const title = titleRaw.replace(/^\d+\s*-\s*/, "");

    // textContent retrieves raw text from HTML source code
    // innerText retreives only the visible text on the screen
    const companyRaw = header?.querySelector("h2")?.textContent.trim() ?? "";
    const company = companyRaw.replace(/\s+/g, " ").split(" - ")[0].trim();

    const panel = document.querySelector(".panel-body");
    const rawText = panel?.innerText.trim() ?? "";

    return { title, company, rawText };
}
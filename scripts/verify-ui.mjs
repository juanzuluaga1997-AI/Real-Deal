import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";

const root = process.cwd();
const outputDir = path.join(root, ".verification");
const chromeCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

function findBrowser() {
  const browserPath = chromeCandidates.find((candidate) => existsSync(candidate));

  if (!browserPath) {
    throw new Error("No supported Chromium browser was found for UI verification.");
  }

  return browserPath;
}

async function wait(milliseconds) {
  await new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function fetchJson(url, options, attempts = 20) {
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`Request failed for ${url}: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      lastError = error;
      await wait(300);
    }
  }

  throw lastError;
}

function createCdpClient(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  let commandId = 0;
  const pending = new Map();
  const events = [];

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);

    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);

      if (message.error) {
        reject(new Error(message.error.message));
      } else {
        resolve(message.result);
      }

      return;
    }

    events.push(message);
  });

  return {
    events,
    async open() {
      if (socket.readyState === WebSocket.OPEN) {
        return;
      }

      await new Promise((resolve, reject) => {
        socket.addEventListener("open", resolve, { once: true });
        socket.addEventListener("error", reject, { once: true });
      });
    },
    send(method, params = {}) {
      commandId += 1;
      const id = commandId;

      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close() {
      socket.close();
    },
  };
}

async function getBodyText(client) {
  const result = await client.send("Runtime.evaluate", {
    expression: "document.body.innerText",
    returnByValue: true,
  });

  return result.result.value;
}

async function waitForBodyText(client, expected, attempts = 30) {
  let bodyText = "";

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    bodyText = await getBodyText(client);

    if (bodyText.includes(expected)) {
      return bodyText;
    }

    await wait(300);
  }

  throw new Error(`Expected page text to include: ${expected}`);
}

async function clickButton(client, text, attempts = 10) {
  const expression = `
    (() => {
      const button = [...document.querySelectorAll("button")]
        .find((candidate) => candidate.textContent.trim() === ${JSON.stringify(text)});
      if (!button) return false;
      button.click();
      return true;
    })()
  `;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const result = await client.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
    });

    if (result.result.value) {
      return;
    }

    await wait(250);
  }

  throw new Error(`Could not find button with text: ${text}`);
}

async function clickByAriaLabel(client, label, attempts = 10) {
  const expression = `
    (() => {
      const button = document.querySelector(${JSON.stringify(`button[aria-label="${label}"]`)});
      if (!button) return false;
      button.click();
      return true;
    })()
  `;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const result = await client.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
    });

    if (result.result.value) {
      return;
    }

    await wait(250);
  }

  throw new Error(`Could not find button with aria-label: ${label}`);
}

async function setInputValue(client, id, value) {
  const expression = `
    (() => {
      const input = document.getElementById(${JSON.stringify(id)});
      if (!input) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(input, ${JSON.stringify(value)});
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    })()
  `;
  const result = await client.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
  });

  if (!result.result.value) {
    throw new Error(`Could not find input with id: ${id}`);
  }
}

async function setFormValue(client, selector, value) {
  const expression = `
    (() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) return false;
      const prototype =
        element instanceof HTMLSelectElement
          ? HTMLSelectElement.prototype
          : element instanceof HTMLTextAreaElement
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, "value").set;
      element.focus();
      setter.call(element, ${JSON.stringify(value)});
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    })()
  `;
  const result = await client.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
  });

  if (!result.result.value) {
    throw new Error(`Could not find field with selector: ${selector}`);
  }
}

async function assertSelectHasOption(client, selector, expected) {
  const expression = `
    (() => {
      const select = document.querySelector(${JSON.stringify(selector)});
      if (!select) return false;
      return [...select.options].some((option) => option.textContent.trim() === ${JSON.stringify(expected)});
    })()
  `;
  const result = await client.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
  });

  if (!result.result.value) {
    throw new Error(`Expected ${selector} to include option: ${expected}`);
  }
}

async function assertSelectDoesNotHaveOption(client, selector, unexpected) {
  const expression = `
    (() => {
      const select = document.querySelector(${JSON.stringify(selector)});
      if (!select) return false;
      return ![...select.options].some((option) => option.textContent.trim() === ${JSON.stringify(unexpected)});
    })()
  `;
  const result = await client.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
  });

  if (!result.result.value) {
    throw new Error(`Expected ${selector} to exclude option: ${unexpected}`);
  }
}

async function assertElementExists(client, selector) {
  const expression = `Boolean(document.querySelector(${JSON.stringify(selector)}))`;
  const result = await client.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
  });

  if (!result.result.value) {
    throw new Error(`Expected element to exist: ${selector}`);
  }
}

async function captureScreenshot(client, fileName) {
  const screenshot = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  const filePath = path.join(outputDir, fileName);
  await writeFile(filePath, Buffer.from(screenshot.data, "base64"));
  return filePath;
}

function assertText(text, expected) {
  if (!text.includes(expected)) {
    throw new Error(`Expected page text to include: ${expected}`);
  }
}

async function assertPdfEndpoint() {
  const response = await fetch("http://localhost:3000/api/report/pdf");
  const contentType = response.headers.get("content-type");
  const pdfText = Buffer.from(await response.arrayBuffer()).toString("latin1", 0, 8);

  if (!response.ok || contentType !== "application/pdf" || pdfText !== "%PDF-1.4") {
    throw new Error("PDF report endpoint did not return a valid PDF.");
  }
}

async function assertImportEndpoint() {
  const formData = new FormData();
  formData.append(
    "file",
    new Blob(
      [
        "Name,Role,Company,Email\nMorgan Lee,Investor,Harbor Fund,morgan@example.com\nRiley Park,CEO,Oakline,riley@example.com",
      ],
      { type: "text/csv" },
    ),
    "contacts.csv",
  );

  const response = await fetch("http://localhost:3000/api/imports/contacts", {
    method: "POST",
    body: formData,
  });
  const payload = await response.json();

  if (
    !response.ok ||
    payload.result?.recordCount !== 2 ||
    payload.result?.summary?.totalRowsProcessed !== 2 ||
    payload.result?.summary?.contactsImported !== 2 ||
    payload.result?.contacts?.[0]?.name !== "Morgan Lee"
  ) {
    throw new Error("Contact import endpoint did not parse the uploaded spreadsheet.");
  }
}

async function assertGmailEndpoint() {
  const statusResponse = await fetch("http://localhost:3000/api/integrations/gmail/status");
  const statusPayload = await statusResponse.json();
  const status = statusPayload.status;

  if (!statusResponse.ok || status?.provider !== "gmail" || status?.accountAddressStoredInCode !== false) {
    throw new Error("Gmail status endpoint did not return the expected privacy-safe status.");
  }

  if (!status.configured) {
    const response = await fetch("http://localhost:3000/api/integrations/gmail/sync", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        contacts: [
          {
            personId: "maya-chen",
            name: "Maya Chen",
            company: "Meridian Ventures",
          },
        ],
        lookbackDays: 365,
        maxMessagesPerContact: 2,
      }),
    });
    const payload = await response.json();

    if (!response.ok || payload.result?.summary?.messagesImported !== 2 || payload.result?.events?.[0]?.personId !== "maya-chen") {
      throw new Error("Gmail sync endpoint did not return deterministic relationship email history.");
    }
  }

  return status;
}

async function run() {
  await mkdir(outputDir, { recursive: true });

  const browserPath = findBrowser();
  const port = 9333;
  const userDataDir = path.join(tmpdir(), `real-deal-verify-${Date.now()}`);
  let browserExit;
  let browserStderr = "";
  const browser = spawn(browserPath, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    "--disable-gpu",
    "--disable-gpu-compositing",
    "--disable-gpu-rasterization",
    "--disable-accelerated-2d-canvas",
    "--disable-accelerated-video-decode",
    "--disable-crash-reporter",
    "--disable-breakpad",
    "--disable-extensions",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${userDataDir}`,
    "about:blank",
  ]);

  browser.stderr.on("data", (chunk) => {
    browserStderr += chunk.toString();
  });
  browser.on("exit", (code, signal) => {
    browserExit = { code, signal };
  });

  try {
    await wait(2000);
    try {
      await fetchJson(`http://127.0.0.1:${port}/json/version`);
    } catch (error) {
      throw new Error(
        `Chromium did not expose a debugging endpoint. Exit: ${JSON.stringify(browserExit)}. Stderr: ${browserStderr.trim()}. ${error.message}`,
      );
    }
    const target = await fetchJson(`http://127.0.0.1:${port}/json/new?http://localhost:3000`, { method: "PUT" });
    const client = createCdpClient(target.webSocketDebuggerUrl);
    await client.open();
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Log.enable");
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 950,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await wait(2500);

    let bodyText = await waitForBodyText(client, "Daily focus queue");
    assertText(bodyText, "Daily focus queue");
    assertText(bodyText, "Relationship map");
    assertText(bodyText, "Social Equity Score");
    assertText(bodyText, "Recommended next action");
    assertText(bodyText, "Hiring Network");
    assertText(bodyText, "Strategic Partners");
    assertText(bodyText, "Report");
    assertText(bodyText, "Save dashboard");
    assertText(bodyText, "Sync Gmail");
    assertText(bodyText, "Upload contacts");
    await assertElementExists(client, "#contact-search");
    await setFormValue(client, "#contact-search", "Marcus");
    await wait(500);
    bodyText = await getBodyText(client);
    assertText(bodyText, "Marcus Reed");
    await clickByAriaLabel(client, "Select Marcus Reed from search");
    await wait(600);
    bodyText = await getBodyText(client);
    assertText(bodyText, "Marcus Reed");
    assertText(bodyText, "Cloudlane");
    await clickButton(client, "Campaigns");
    await wait(700);
    bodyText = await getBodyText(client);
    assertText(bodyText, "Create campaign");
    await setFormValue(client, "#manual-campaign-title", "Advisor Network Sprint");
    await setFormValue(client, "#manual-campaign-stage", "Advisor activation");
    await setFormValue(client, "#manual-campaign-objective", "Activate advisors who can help sharpen the enterprise narrative.");
    await setFormValue(client, "#manual-campaign-next-action", "Send tailored advisor asks");
    await setFormValue(client, "#manual-campaign-owner", "Avery Hart");
    await setFormValue(client, "#campaign-contact-search", "Maya");
    await wait(500);
    await clickByAriaLabel(client, "Add Maya Chen to campaign");
    await wait(300);
    await clickButton(client, "Create campaign");
    await wait(900);
    bodyText = await getBodyText(client);
    assertText(bodyText, "Created campaign Advisor Network Sprint with 1 target contact.");
    assertText(bodyText, "Advisor Network Sprint");
    await clickButton(client, "Upload contacts");
    await wait(500);
    await setFormValue(client, "#import-method", "manual");
    await wait(400);
    await assertSelectHasOption(client, "select[name='campaign']", "Advisor Network Sprint");
    await clickButton(client, "Delete campaign");
    await wait(700);
    bodyText = await getBodyText(client);
    assertText(bodyText, "Deleted campaign Advisor Network Sprint. It has been removed from active campaign lists.");
    await assertSelectDoesNotHaveOption(client, "select[name='campaign']", "Advisor Network Sprint");
    await clickButton(client, "Close");
    await wait(300);
    const gmailStatus = await assertGmailEndpoint();
    await clickButton(client, "Sync Gmail");
    await wait(800);
    bodyText = await getBodyText(client);
    assertText(bodyText, "Gmail relationship sync");
    assertText(bodyText, "Read-only access");
    assertText(bodyText, "EMAIL LOOKBACK");
    if (!gmailStatus.configured) {
      await clickButton(client, "Run sync");
      await wait(1500);
      bodyText = await getBodyText(client);
      assertText(bodyText, "Synced");
      assertText(bodyText, "Email history");
      assertText(bodyText, "Re: Cloudlane relationship follow-up");
      assertText(bodyText, "Received");
      assertText(bodyText, "Gmail history");
    }
    await clickButton(client, "Close");
    await wait(300);
    await clickButton(client, "Upload contacts");
    await wait(500);
    bodyText = await getBodyText(client);
    assertText(bodyText, "IMPORT METHOD");
    await assertSelectHasOption(client, "#import-method", "Upload CSV, Excel, or document");
    await assertSelectHasOption(client, "#import-method", "Import public Google document");
    await assertSelectHasOption(client, "#import-method", "Add contact manually");
    assertText(bodyText, "Upload a document");
    assertText(bodyText, "Import summary");
    assertText(bodyText, "Prioritized contact preview");
    await assertImportEndpoint();
    await setFormValue(client, "#import-method", "manual");
    await wait(400);
    bodyText = await getBodyText(client);
    assertText(bodyText, "Add contact manually");
    assertText(bodyText, "Follow-up commitment");
    await setFormValue(client, "input[name='name']", "Grace Turner");
    await setFormValue(client, "input[name='email']", "grace@example.com");
    await setFormValue(client, "input[name='company']", "Brightwell Health");
    await setFormValue(client, "input[name='role']", "CIO");
    await setFormValue(client, "select[name='relationshipType']", "Customer");
    await setFormValue(client, "select[name='campaign']", "Enterprise Design Partners");
    await clickButton(client, "Add contact");
    await wait(2000);
    bodyText = await getBodyText(client);
    assertText(bodyText, "Processed 1 rows from Manual contact.");
    assertText(bodyText, "Imported 1 contact into the active relationship system.");
    assertText(bodyText, "Grace Turner");
    assertText(bodyText, "Customer Signal");
    await clickButton(client, "Close");
    await wait(300);
    await clickButton(client, "Save dashboard");
    await wait(500);
    bodyText = await getBodyText(client);
    assertText(bodyText, "Saved dashboard with 15 people in history.");
    assertText(bodyText, "Saved dashboard history");
    assertText(bodyText, "15 people captured");
    await assertPdfEndpoint();
    const dashboardScreenshot = await captureScreenshot(client, "dashboard.png");

    await clickButton(client, "Map");
    await wait(700);
    await clickByAriaLabel(client, "Open Marcus Reed");
    await wait(700);
    bodyText = await getBodyText(client);
    assertText(bodyText, "Marcus Reed");
    assertText(bodyText, "Cloudlane");
    const mapScreenshot = await captureScreenshot(client, "map.png");

    await clickButton(client, "Campaigns");
    await wait(700);
    await clickButton(client, "Cloud Partner Motion");
    await wait(700);
    bodyText = await getBodyText(client);
    assertText(bodyText, "Campaign list");
    assertText(bodyText, "Target people");
    assertText(bodyText, "Cloud Partner Motion");
    const campaignsScreenshot = await captureScreenshot(client, "campaigns.png");

    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await clickButton(client, "Dashboard");
    await wait(900);
    bodyText = await getBodyText(client);
    assertText(bodyText, "Daily focus queue");
    assertText(bodyText, "Relationship map");
    const mobileDashboardScreenshot = await captureScreenshot(client, "mobile-dashboard.png");

    await client.send("Page.navigate", { url: "http://localhost:3000/report" });
    await wait(1500);
    bodyText = await getBodyText(client);
    assertText(bodyText, "Real Deal Relationship Report");
    assertText(bodyText, "OUTPUT");
    assertText(bodyText, "Dashboard report");
    assertText(bodyText, "Download PDF");
    assertText(bodyText, "Open HTML");
    assertText(bodyText, "Email as PDF");
    await setInputValue(client, "report-recipient", "partner@example.com");
    await clickButton(client, "Email PDF");
    await wait(1000);
    bodyText = await getBodyText(client);
    assertText(bodyText, "Report PDF prepared for partner@example.com.");
    assertText(bodyText, "Daily focus queue");
    const htmlReportScreenshot = await captureScreenshot(client, "html-report.png");

    const errors = client.events.filter((event) => {
      if (event.method === "Runtime.exceptionThrown") {
        return true;
      }

      if (event.method === "Log.entryAdded") {
        return event.params?.entry?.level === "error";
      }

      return false;
    });

    if (errors.length > 0) {
      throw new Error(`Browser console reported ${errors.length} error event(s).`);
    }

    client.close();
    console.log(
      JSON.stringify(
        { dashboardScreenshot, mapScreenshot, campaignsScreenshot, mobileDashboardScreenshot, htmlReportScreenshot },
        null,
        2,
      ),
    );
  } finally {
    browser.kill();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

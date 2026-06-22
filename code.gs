// ============================================================
// SUBREDDIT ANALYSIS PIPELINE
// Data Fetcher: Arctic Shift API -> Google Sheets
//
// Pulls posts from any public subreddit using the Arctic Shift
// public Reddit archive API. No Reddit API key required.
//
// Full pipeline (comment fetcher, analysis layer, and interactive
// dashboard with Claude AI) available on request.
// Contact: shayanalee321@gmail.com
// ============================================================

const CONFIG = {
  subreddit: "personalfinance",   // change to any public subreddit
  postsPerBatch: 100,             // max 100 per Arctic Shift call
  targetPostCount: 500,           // total posts to collect
  requestDelay: 600,              // ms between API calls
  baseUrl: "https://arctic-shift.photon-reddit.com/api",
  postsSheet: "Posts",
};

const POST_HEADERS = [
  "post_id", "title", "author", "score", "upvote_ratio",
  "num_comments", "flair", "selftext", "url", "created_utc",
  "created_date", "created_hour", "created_day_of_week",
  "is_self", "permalink",
];

// ── ENTRY POINT ──────────────────────────────────────────────
/**
 * Run this to set up the Posts sheet and start fetching.
 * Safe to re-run -- clears and repopulates existing data.
 */
function setupAndFetch() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const postsSheet = getOrCreateSheet(ss, CONFIG.postsSheet);
  initSheet(postsSheet, POST_HEADERS);

  Logger.log(`Fetching posts from r/${CONFIG.subreddit}...`);
  const posts = fetchPosts();

  if (posts.length === 0) {
    Logger.log("No posts returned. Check subreddit name.");
    return;
  }

  writePostsToSheet(postsSheet, posts);
  Logger.log(`Done. ${posts.length} posts written to sheet.`);

  SpreadsheetApp.getActiveSpreadsheet().toast(
    `Pulled ${posts.length} posts from r/${CONFIG.subreddit}`,
    "Fetch Complete", 10
  );
}

// ── FETCH POSTS ──────────────────────────────────────────────
/**
 * Paginates through Arctic Shift using created_utc as a cursor.
 * Fetches newest posts first and works backwards.
 */
function fetchPosts() {
  const posts = [];
  let beforeDate = null;
  const maxBatches = Math.ceil(CONFIG.targetPostCount / CONFIG.postsPerBatch) + 3;

  for (let batch = 0; batch < maxBatches; batch++) {
    const params = {
      subreddit: CONFIG.subreddit,
      limit: CONFIG.postsPerBatch,
      sort: "desc",
    };

    if (beforeDate) params.before = beforeDate;

    const url = buildUrl(`${CONFIG.baseUrl}/posts/search`, params);
    Logger.log(`Batch ${batch + 1}: ${url}`);

    const response = safeGet(url);
    if (!response) break;

    const data = JSON.parse(response);
    const items = data.data;
    if (!items || items.length === 0) break;

    items.forEach((item) => posts.push(parsePost(item)));

    const oldest = items[items.length - 1].created_utc;
    beforeDate = new Date((oldest - 1) * 1000).toISOString();

    Logger.log(`Posts collected: ${posts.length}`);
    if (posts.length >= CONFIG.targetPostCount) break;

    Utilities.sleep(CONFIG.requestDelay);
  }

  return posts.slice(0, CONFIG.targetPostCount);
}

// ── PARSER ───────────────────────────────────────────────────
function parsePost(item) {
  const createdDate = new Date(item.created_utc * 1000);
  return {
    post_id:             item.id || "",
    title:               cleanText(item.title || ""),
    author:              item.author || "[deleted]",
    score:               item.score || 0,
    upvote_ratio:        item.upvote_ratio || 0,
    num_comments:        item.num_comments || 0,
    flair:               item.link_flair_text || "",
    selftext:            cleanText(item.selftext || ""),
    url:                 item.url || "",
    created_utc:         item.created_utc || 0,
    created_date:        formatDate(createdDate),
    created_hour:        createdDate.getHours(),
    created_day_of_week: getDayName(createdDate.getDay()),
    is_self:             item.is_self ? "TRUE" : "FALSE",
    permalink:           `https://reddit.com${item.permalink || ""}`,
  };
}

// ── SHEET HELPERS ────────────────────────────────────────────
function getOrCreateSheet(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function initSheet(sheet, headers) {
  sheet.clearContents();
  sheet.clearFormats();
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#1a1a2e");
  headerRange.setFontColor("#ffffff");
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

function writePostsToSheet(sheet, posts) {
  if (posts.length === 0) return;
  const rows = posts.map((p) => POST_HEADERS.map((k) => p[k] ?? ""));
  sheet.getRange(2, 1, rows.length, POST_HEADERS.length).setValues(rows);
}

// ── UTILITIES ────────────────────────────────────────────────
function buildUrl(base, params) {
  const query = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return `${base}?${query}`;
}

function safeGet(url) {
  try {
    const response = UrlFetchApp.fetch(url, {
      method: "GET",
      muteHttpExceptions: true,
      headers: {
        "User-Agent": "SubredditAnalysisPipeline/1.0 (Google Apps Script; public research)",
      },
    });
    const code = response.getResponseCode();
    if (code !== 200) {
      Logger.log(`HTTP ${code}: ${response.getContentText().substring(0, 200)}`);
      return null;
    }
    return response.getContentText();
  } catch (e) {
    Logger.log(`Request error: ${e.message}`);
    return null;
  }
}

function cleanText(text) {
  if (!text) return "";
  return text.replace(/\u0000/g, "").replace(/[\r\n\t]+/g, " ").trim().substring(0, 5000);
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDayName(dayIndex) {
  return ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][dayIndex] || "";
}

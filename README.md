# Subreddit Analysis Pipeline

An end-to-end data pipeline that pulls live Reddit data, runs sentiment and keyword analysis using the Claude AI API, and visualizes everything in a custom interactive dashboard built with Google Apps Script.

Built on r/personalfinance — 500 posts, 2,265 comments, fully analyzed.

![Dashboard Overview](<img width="1160" height="682" alt="Screenshot 2026-06-22 191513" src="https://github.com/user-attachments/assets/638ac1b5-aa15-4fae-949f-3aecdcb4e02d" />
)

---

## What it does

1. **Fetches** posts and comments from any public subreddit using the [Arctic Shift](https://arctic-shift.photon-reddit.com) public Reddit archive API — no Reddit API key required
2. **Stores** structured data in Google Sheets with clean columns for post metadata, comment bodies, timestamps, flair, and engagement metrics
3. **Analyzes** the dataset across four dimensions: sentiment (via Claude API), keyword frequency, flair/category breakdown, and top thread scoring
4. **Visualizes** everything in a custom dark-themed HTML dashboard rendered inside Google Sheets via HtmlService — no external hosting needed
5. **Powers an AI insight panel** where you can ask natural language questions about the data and get Claude-generated answers grounded in the actual numbers

---

## Dashboard

![Dashboard Screenshot](screenshots/dashboard-overview.png)

![Posts by Category and Top Threads](screenshots/dashboard-threads.png)

![Claude AI Insight Panel](screenshots/dashboard-ai.png)

The dashboard includes:

- **Stat cards** — posts analyzed, average score, average comments, average upvote ratio
- **Sentiment donut chart** — Positive / Neutral / Negative breakdown across all 500 posts, labeled by Claude Haiku
- **Top keywords** — frequency-ranked terms extracted from post titles and comment bodies, stopwords filtered
- **Posts by category** — flair breakdown showing which topics dominate the subreddit
- **Top threads** — ranked by a weighted score combining upvotes, comment count, and upvote ratio
- **Ask Claude panel** — type any question about the dataset and get a data-grounded answer in seconds

---

## Tech stack

| Layer | Tool |
|---|---|
| Data source | [Arctic Shift API](https://arctic-shift.photon-reddit.com) (public Reddit archive) |
| Storage | Google Sheets |
| Scripting | Google Apps Script |
| Sentiment analysis | Anthropic Claude API (claude-haiku) |
| Dashboard | Apps Script HtmlService (vanilla HTML/CSS/JS) |
| AI insight panel | Anthropic Claude API (claude-haiku) |

---

## Project structure

```
subreddit-analysis-pipeline/
├── Code.gs               # Fetches posts from Arctic Shift API into Google Sheets
├── CommentFetcher.gs     # Resume-able comment fetcher (50 posts per run, cursor-based)
├── Analysis.gs           # Sentiment, keywords, posting patterns, flair breakdown, top threads
├── Dashboard.gs          # Dashboard backend — data loaders and Claude API call handler
├── DashboardView.html    # Dashboard frontend — charts, panels, AI input
└── README.md
```

---

## How to run it yourself

### 1. Set up Google Sheets

Create a new Google Sheet. You can name it anything. Open **Extensions > Apps Script**.

### 2. Add the scripts

Create the following files in Apps Script and paste the corresponding code into each:

- `Code.gs` — replaces the default file
- `CommentFetcher.gs` — new script file
- `Analysis.gs` — new script file
- `Dashboard.gs` — new script file
- `DashboardView.html` — new HTML file

### 3. Add your Anthropic API key

In Apps Script, go to **Project Settings > Script Properties** and add:

| Property | Value |
|---|---|
| `ANTHROPIC_API_KEY` | your key starting with `sk-ant-...` |

You can get an API key at [console.anthropic.com](https://console.anthropic.com). Running sentiment on 500 posts with Claude Haiku costs roughly $0.05.

### 4. Fetch the data

Run `setupAndFetch()` from `Code.gs`. This pulls 500 posts from r/personalfinance and writes them to a Posts sheet. Takes 8 to 12 minutes depending on API response times.

### 5. Fetch comments

Run `initCommentCursor()` once from `CommentFetcher.gs`, then run `fetchNextCommentBatch()` repeatedly (10 times for 500 posts at 50 per batch). Each run takes about 5 minutes. A Config sheet tracks your progress automatically so you can resume anytime.

### 6. Run the analysis

Run each function from `Analysis.gs` in order:

```
runPostingPatterns()
runFlairBreakdown()
runTopThreads()
runKeywordFrequency()
runSentimentAnalysis()   ← hits Claude API
```

Results are written to an Analysis sheet. Sentiment columns are added directly to the Posts sheet.

### 7. Open the dashboard

Run `openDashboard()` from `Dashboard.gs`. The dashboard opens as a modal dialog inside your Google Sheet.

---

## Sample insights from r/personalfinance

- **85% average upvote ratio** across 500 posts — the community is highly engaged and agreeable
- **56% of posts are Neutral** in sentiment — most people are asking questions, not venting
- **Debt appears 265 times** across the dataset despite only 35 posts carrying the Debt flair, suggesting the topic bleeds into budgeting, housing, and planning discussions
- **Top thread** — *"Windfall and want to move somewhere rural, is it possible?"* — 427 upvotes, 336 comments
- **Money, pay, and credit** are the three most frequent non-generic keywords across all titles and comments

---

## Changing the subreddit

To run this on a different subreddit, open `Code.gs` and change:

```javascript
const CONFIG = {
  subreddit: "personalfinance",  // change this to any public subreddit
  ...
}
```

Good candidates: `r/financialindependence`, `r/cscareerquestions`, `r/entrepreneur`, `r/jobs`, `r/investing`

---

## Notes

- Arctic Shift is a free public API with no authentication required. Be respectful with request frequency — the scripts include a 600ms delay between calls by default.
- The dashboard runs entirely inside Google Sheets via HtmlService. No server, no hosting, no external dependencies.
- The comment fetcher is resume-able — if it times out mid-run, just run `fetchNextCommentBatch()` again and it picks up from where it left off.
- Sentiment analysis skips already-labeled posts so it is safe to re-run without double-spending API credits.

---

## License

MIT — use it, fork it, build on it.

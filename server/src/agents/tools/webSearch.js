const { chromium } = require('playwright');
const config = require('../../config');
const { chunkText } = require('../../rag/ingest');
const { gradeAll } = require('../../rag/grader');

const SEARCH_RESULTS = 5;
const PAGE_TIMEOUT_MS = 8000;
const MAX_PAGE_CHARS = 5000;
const MAX_CHUNKS_RETURNED = 5;

async function search(query) {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': config.serperApiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query }),
  });
  const data = await res.json();
  return (data.organic || []).slice(0, SEARCH_RESULTS).map(r => r.link).filter(Boolean);
}

async function scrapePage(browser, url) {
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS });
    const text = await page.evaluate(() => {
      document.querySelectorAll('script, style, nav, footer, header').forEach((el) => el.remove());
      return document.body.innerText;
    });
    return text.replace(/\s+/g, ' ').trim().slice(0, MAX_PAGE_CHARS);
  } finally {
    await page.close();
  }
}

async function scrapeSafely(browser, url) {
  try {
    const text = await scrapePage(browser, url);
    return text ? { url, text } : null;
  } catch (err) {
    console.error(`[webSearch] Failed to scrape "${url}": ${err.message}`);
    return null;
  }
}

async function run({ query, url } = {}) {
  if (!url && !config.serperApiKey) {
    throw new Error('SERPER_API_KEY is not configured');
  }

  const urls = url ? [url] : await search(query);
  if (urls.length === 0) return 'No search results found.';

  const browser = await chromium.launch();
  let scraped;
  try {
    scraped = await Promise.all(urls.map((u) => scrapeSafely(browser, u)));
  } finally {
    await browser.close();
  }

  const pages = scraped.filter(Boolean);
  if (pages.length === 0) return 'Could not extract any content from the page(s).';

  if (!query) {
    // Direct URL fetch with nothing to grade relevance against — return raw extracted text.
    return pages.map((p) => p.text).join('\n\n');
  }

  const chunks = pages.flatMap((p) => chunkText(p.text).map((text) => ({ text, source: p.url })));
  const graded = await gradeAll(chunks, query);
  if (graded.length === 0) return 'No relevant content found in search results.';

  return graded
    .slice(0, MAX_CHUNKS_RETURNED)
    .map((c) => `[Source: ${c.source}]\n${c.text}`)
    .join('\n\n');
}

module.exports = {
  id: 'webSearch',
  description: 'Search the web and read the most relevant results for a query, or fetch and read a specific URL',
  run,
};

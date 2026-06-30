const cheerio = require('cheerio');

async function run({ url }) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Nexus/1.0' } });
  const html = await res.text();
  const $ = cheerio.load(html);
  $('script, style, nav, footer, header').remove();
  return $('body').text().replace(/\s+/g, ' ').trim().slice(0, 5000);
}

module.exports = { id: 'scraper', description: 'Scrape text content from a web page (HTML only)', run };

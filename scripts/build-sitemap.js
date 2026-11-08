// Regenerates the /release/<slug>/ and /artist/<id>/ entries in sitemap.xml
// from assets/data/artists.json, so the sitemap always matches the real data
// (it was missing some releases and listing one that doesn't exist).
//
// Run:  npm run build:sitemap   (or: node scripts/build-sitemap.js)
// Then commit/upload the updated sitemap.xml.
//
// All other URLs (home, about, culture, ...) are kept exactly as they are.

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sitemapPath = path.join(root, 'sitemap.xml');
const dataPath = path.join(root, 'assets', 'data', 'artists.json');
const ORIGIN = 'https://artisttaanmusic.com';

function slugify(s) {
  if (!s) return '';
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const xml = fs.readFileSync(sitemapPath, 'utf8');

// Keep every existing <url> block that is NOT an artist/release page.
const blocks = xml.match(/<url>[\s\S]*?<\/url>/g) || [];
const keep = blocks.filter(function (b) {
  return !/<loc>[^<]*\/(release|artist)\/[^<]+<\/loc>/.test(b);
});

function entry(loc, priority) {
  return '  <url>\n    <loc>' + loc + '</loc>\n    <changefreq>monthly</changefreq>\n    <priority>' + priority + '</priority>\n  </url>';
}

const out = keep.map(function (b) { return '  ' + b.trim(); });

(data.artists || []).forEach(function (a) {
  if (a.id) out.push(entry(ORIGIN + '/artist/' + a.id + '/', '0.7'));
});

const seen = {};
(data.releases || []).forEach(function (r) {
  const s = slugify(r.title);
  if (!s || seen[s]) return; // one URL per slug
  seen[s] = true;
  out.push(entry(ORIGIN + '/release/' + s + '/', '0.6'));
});

const result = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  out.join('\n') + '\n</urlset>\n';

fs.writeFileSync(sitemapPath, result);
console.log('sitemap.xml written: ' + out.length + ' URLs (' + Object.keys(seen).length + ' releases, ' + (data.artists || []).length + ' artists)');

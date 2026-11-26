// Regenerates sitemap.xml from assets/data/artists.json
// Run: npm run build:sitemap   OR   node scripts/build-sitemap.js

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

// Keep non artist/release URL blocks from existing sitemap (culture posts etc.)
const blocks = xml.match(/<url>[\s\S]*?<\/url>/g) || [];
const keep = blocks.filter(function (b) {
  return !/<loc>[^<]*\/(release|artist)\/[^<]+<\/loc>/.test(b) &&
         !/<loc>[^<]*\/team-profile\/[^<]*<\/loc>/.test(b);
});

function entry(loc, priority, changefreq) {
  changefreq = changefreq || 'monthly';
  return '  <url>\n    <loc>' + loc + '</loc>\n    <changefreq>' + changefreq + '</changefreq>\n    <priority>' + priority + '</priority>\n  </url>';
}

const out = keep.map(function (b) { return '  ' + b.trim(); });

(data.artists || []).forEach(function (a) {
  if (a.id) out.push(entry(ORIGIN + '/artist/' + a.id + '/', '0.7', 'weekly'));
});

const seen = {};
(data.releases || []).forEach(function (r) {
  const s = (r.slug && String(r.slug).trim()) || slugify(r.title);
  if (!s || seen[s]) return;
  seen[s] = true;
  out.push(entry(ORIGIN + '/release/' + s + '/', '0.6', 'monthly'));
});

const result = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  out.join('\n') + '\n</urlset>\n';

fs.writeFileSync(sitemapPath, result);
console.log('sitemap.xml written: ' + out.length + ' URLs (' + Object.keys(seen).length + ' releases, ' + (data.artists || []).length + ' artists)');

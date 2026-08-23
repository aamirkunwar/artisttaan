// Main Worker script for artisttaanmusic.com
//
// This does three things:
//   1. POST /subscribe -> adds an email to your Brevo "Release Updates" list
//   2. POST /demo      -> emails your team the demo submission (with attachment)
//   3. Everything else -> serves your normal website files, unchanged
//
// Required environment variables (set in Cloudflare -> Settings -> Environment variables):
//   BREVO_API_KEY  - same key you used on Netlify
//   TEAM_EMAIL     - the inbox that should receive demo submissions, e.g. hello@artisttaanmusic.com
//   SENDER_EMAIL   - a verified "from" address in your Brevo account, e.g. noreply@artisttaanmusic.com

const BREVO_LIST_ID = 3; // your "Release Updates" list in Brevo

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/subscribe') {
      return handleSubscribe(request, env);
    }

    if (request.method === 'POST' && url.pathname === '/demo') {
      return handleDemo(request, env);
    }

    // Clean artist URLs: /artist/abir or /artist/abir/ -> serve artist/index.html
    // directly (the page itself reads the slug from the URL path). This has to be
    // done here in the Worker rather than via the _redirects file, because
    // Cloudflare does not apply _redirects rules to requests handled by Worker
    // code -- see https://developers.cloudflare.com/workers/static-assets/redirects/
    const artistSlugMatch = url.pathname.match(/^\/artist\/([^\/]+)\/?$/);
    if (artistSlugMatch && artistSlugMatch[1] !== 'index.html') {
      // Request the FOLDER path ("/artist/"), not the literal filename
      // ("/artist/index.html"). Requesting the filename directly triggers
      // Cloudflare's default html_handling redirect chain
      // (/artist/index.html -> 307 -> /artist -> 307 -> /artist/), which is
      // exactly what was sending every visitor back to the bare /artist/ URL.
      const assetUrl = new URL('/artist/', url.origin);
      const assetRequest = new Request(assetUrl.toString(), request);
      const assetResponse = await env.ASSETS.fetch(assetRequest);
      return renderArtistMeta(assetResponse, artistSlugMatch[1], url.origin, env);
    }

    // Clean culture-article URLs: /culture/<slug> or /culture/<slug>/ -> serve
    // culture/index.html directly (same single-page pattern as /artist/:slug/
    // above). "posts" is reserved since that's the real folder the raw .md
    // files live in (e.g. /culture/posts/my-post.md) -- that path has two
    // segments after /culture/ so this regex won't match it anyway, but it's
    // excluded explicitly for clarity.
    const cultureSlugMatch = url.pathname.match(/^\/culture\/([^\/]+)\/?$/);
    if (cultureSlugMatch && cultureSlugMatch[1] !== 'index.html' && cultureSlugMatch[1] !== 'posts') {
      const assetUrl = new URL('/culture/', url.origin);
      const assetRequest = new Request(assetUrl.toString(), request);
      const assetResponse = await env.ASSETS.fetch(assetRequest);
      return renderCultureMeta(assetResponse, cultureSlugMatch[1], url.origin);
    }

    // Anything else: serve the static website files as normal.
    return env.ASSETS.fetch(request);
  },
};

// ---------- Server-rendered artist meta tags ----------
//
// artist/index.html ships with empty <title>/meta description/canonical/OG
// tags and fills them in client-side via JS once artists.json loads. That's
// invisible to anything that doesn't execute JS -- notably link-preview bots
// (WhatsApp, iMessage, Instagram, Twitter/X, Slack) and it's also slower for
// search engines than plain HTML. This rewrites those tags (and the visible
// <h1> artist name) server-side before the response ever reaches the client,
// using Cloudflare's streaming HTMLRewriter so we don't have to buffer or
// re-parse the whole page. The client-side JS still runs afterwards and sets
// the same values again, so nothing changes if this ever fails open.
async function renderArtistMeta(assetResponse, slug, origin, env) {
  let artist;
  try {
    const dataRes = await env.ASSETS.fetch(new URL('/assets/data/artists.json', origin));
    if (!dataRes.ok) return assetResponse;
    const data = await dataRes.json();
    artist = (data.artists || []).find(function (a) { return a.id === slug; });
  } catch (e) {
    console.error('renderArtistMeta: could not load artists.json', e);
    return assetResponse;
  }

  if (!artist) return assetResponse; // Unknown slug -- let the client-side "Artist not found" state handle it.

  const pageUrl = origin + '/artist/' + artist.id + '/';
  const title = artist.name + ' — ARTISTTAAN';
  const ogTitle = artist.name + ' | ARTISTTAAN';
  const description = artist.full_bio || artist.bio || '';
  const shortDescription = artist.bio || description;
  const image = artist.square_photo ? origin + '/' + String(artist.square_photo).replace(/^\/+/, '') : '';

  const rewriter = new HTMLRewriter()
    .on('title#page-title', { element: function (el) { el.setInnerContent(title); } })
    .on('meta#meta-description', { element: function (el) { el.setAttribute('content', description); } })
    .on('link#canonical-url', { element: function (el) { el.setAttribute('href', pageUrl); } })
    .on('meta#og-url', { element: function (el) { el.setAttribute('content', pageUrl); } })
    .on('meta#og-title', { element: function (el) { el.setAttribute('content', ogTitle); } })
    .on('meta#og-description', { element: function (el) { el.setAttribute('content', shortDescription); } })
    .on('meta#twitter-title', { element: function (el) { el.setAttribute('content', ogTitle); } })
    .on('meta#twitter-description', { element: function (el) { el.setAttribute('content', shortDescription); } })
    .on('h1#hero-name', { element: function (el) { el.setInnerContent(artist.name); } });

  if (image) {
    rewriter
      .on('meta#og-image', { element: function (el) { el.setAttribute('content', image); } })
      .on('meta#twitter-image', { element: function (el) { el.setAttribute('content', image); } });
  }

  return rewriter.transform(assetResponse);
}

// ---------- Server-rendered culture-article meta tags ----------
//
// culture/index.html used to route articles through a #hash, which the
// server (and search engines, and link-preview bots) never sees, and even
// after switching to real /culture/<slug>/ paths, the raw HTML for that path
// still starts out as the generic "Culture" page until client-side JS loads
// the article and rewrites the tags. This does the same rewrite server-side,
// before the response leaves the Worker, by pulling the post's frontmatter
// straight from GitHub (the same source of truth the CMS commits to, so a
// newly-published post gets correct tags immediately without a redeploy).
const CULTURE_REPO_OWNER = 'aamirkunwar';
const CULTURE_REPO_NAME = 'artisttaan';
const CULTURE_REPO_BRANCH = 'main';

function parseFrontMatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: text };
  const meta = {};
  match[1].split('\n').forEach(function (line) {
    const i = line.indexOf(':');
    if (i === -1) return;
    const key = line.slice(0, i).trim();
    const val = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
    meta[key] = val;
  });
  const excerptMatch = match[1].match(/excerpt:\s*>-\n([\s\S]*?)(?=\n\w|$)/);
  if (excerptMatch) meta.excerpt = excerptMatch[1].replace(/^\s{2}/gm, '').replace(/\n/g, ' ').trim();
  return { meta: meta, body: match[2].trim() };
}

async function renderCultureMeta(assetResponse, slug, origin) {
  // Guard against a malicious/odd slug being used to build the GitHub URL.
  if (!/^[A-Za-z0-9._-]+$/.test(slug)) return assetResponse;

  let meta;
  try {
    const rawUrl =
      'https://raw.githubusercontent.com/' + CULTURE_REPO_OWNER + '/' + CULTURE_REPO_NAME +
      '/' + CULTURE_REPO_BRANCH + '/culture/posts/' + slug + '.md';
    const res = await fetch(rawUrl);
    if (!res.ok) return assetResponse; // Unknown slug -- let the client-side "not found" state handle it.
    const text = await res.text();
    meta = parseFrontMatter(text).meta;
  } catch (e) {
    console.error('renderCultureMeta: could not load post from GitHub', e);
    return assetResponse;
  }

  if (!meta || !meta.title) return assetResponse;

  const pageUrl = origin + '/culture/' + slug + '/';
  const title = meta.title + ' — ARTISTTAAN';
  const ogTitle = meta.title + ' | ARTISTTAAN';
  const description = meta.excerpt || "Interviews, articles, and hip-hop updates from ARTISTTAAN. The voice of India's underground.";
  const image = meta.cover ? origin + '/' + String(meta.cover).replace(/^\/+/, '') : origin + '/assets/images/logo/og-image.jpg';

  return new HTMLRewriter()
    .on('title#page-title', { element: function (el) { el.setInnerContent(title); } })
    .on('meta#meta-description', { element: function (el) { el.setAttribute('content', description); } })
    .on('link#canonical-url', { element: function (el) { el.setAttribute('href', pageUrl); } })
    .on('meta#og-url', { element: function (el) { el.setAttribute('content', pageUrl); } })
    .on('meta#og-title', { element: function (el) { el.setAttribute('content', ogTitle); } })
    .on('meta#og-description', { element: function (el) { el.setAttribute('content', description); } })
    .on('meta#og-image', { element: function (el) { el.setAttribute('content', image); } })
    .on('meta#twitter-title', { element: function (el) { el.setAttribute('content', ogTitle); } })
    .on('meta#twitter-description', { element: function (el) { el.setAttribute('content', description); } })
    .on('meta#twitter-image', { element: function (el) { el.setAttribute('content', image); } })
    .transform(assetResponse);
}

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'content-type': 'application/json' },
  });
}

// ---------- Newsletter signup ----------

async function handleSubscribe(request, env) {
  let data;
  try {
    data = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'Invalid request.' }, 400);
  }

  const email = (data.email || '').trim();
  const botField = data.botField || '';

  if (botField) {
    // Honeypot triggered by a bot -- pretend success, do nothing.
    return jsonResponse({ success: true });
  }

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!isValidEmail) {
    return jsonResponse({ error: 'Please enter a valid email address.' }, 400);
  }

  if (!env.BREVO_API_KEY) {
    console.error('BREVO_API_KEY is not set.');
    return jsonResponse({ error: 'Server is not configured. Please try again later.' }, 500);
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        listIds: [BREVO_LIST_ID],
        updateEnabled: true,
      }),
    });

    if (response.ok) {
      return jsonResponse({ success: true });
    }

    const errorData = await response.json().catch(function () { return {}; });

    if (errorData.code === 'duplicate_parameter') {
      return jsonResponse({ success: true, alreadySubscribed: true });
    }

    console.error('Brevo contacts API error:', response.status, errorData);
    return jsonResponse({ error: 'Could not subscribe right now. Please try again later.' }, 502);
  } catch (err) {
    console.error('Subscribe error:', err);
    return jsonResponse({ error: 'Something went wrong. Please try again later.' }, 500);
  }
}

// ---------- Demo submission ----------

async function handleDemo(request, env) {
  let form;
  try {
    form = await request.formData();
  } catch (e) {
    return jsonResponse({ error: 'Invalid submission.' }, 400);
  }

  // Honeypot field from the form -- if filled, silently pretend success.
  const botField = (form.get('bot-field') || '').toString();
  if (botField) {
    return jsonResponse({ success: true });
  }

  const artistName = (form.get('artistName') || '').toString().trim();
  const email = (form.get('email') || '').toString().trim();
  const instagram = (form.get('instagram') || '').toString().trim();
  const demoLink = (form.get('demoLink') || '').toString().trim();
  const about = (form.get('about') || '').toString().trim();

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!artistName || !isValidEmail || !about) {
    return jsonResponse({ error: 'Please fill in the required fields.' }, 400);
  }

  if (!env.BREVO_API_KEY || !env.TEAM_EMAIL || !env.SENDER_EMAIL) {
    console.error('Missing BREVO_API_KEY, TEAM_EMAIL, or SENDER_EMAIL.');
    return jsonResponse({ error: 'Server is not configured. Please try again later.' }, 500);
  }

  const htmlContent =
    '<h2>New Demo Submission</h2>' +
    '<p><strong>Artist Name:</strong> ' + escapeHtml(artistName) + '</p>' +
    '<p><strong>Email:</strong> ' + escapeHtml(email) + '</p>' +
    '<p><strong>Instagram:</strong> @' + escapeHtml(instagram) + '</p>' +
    '<p><strong>Demo Link:</strong> ' + escapeHtml(demoLink) + '</p>' +
    '<p><strong>About:</strong><br>' + escapeHtml(about).replace(/\n/g, '<br>') + '</p>';

  const emailPayload = {
    sender: { email: env.SENDER_EMAIL, name: 'ARTISTTAAN Website' },
    to: [{ email: env.TEAM_EMAIL }],
    replyTo: { email: email, name: artistName },
    subject: 'New Demo Submission - ' + artistName,
    htmlContent: htmlContent,
  };

  // Attach the demo file if one was uploaded, up to ~8MB.
  const file = form.get('attachment');
  if (file && typeof file === 'object' && file.size > 0) {
    const MAX_SIZE = 8 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return jsonResponse({ error: 'File is too large. Please keep it under 8MB.' }, 400);
    }
    const buffer = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(buffer);
    emailPayload.attachment = [
      { content: base64, name: file.name || 'demo-file' },
    ];
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (response.ok) {
      return jsonResponse({ success: true });
    }

    const errorData = await response.json().catch(function () { return {}; });
    console.error('Brevo email API error:', response.status, errorData);
    return jsonResponse({ error: 'Could not send your demo right now. Please try again later.' }, 502);
  } catch (err) {
    console.error('Demo submit error:', err);
    return jsonResponse({ error: 'Something went wrong. Please try again later.' }, 500);
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// Main Worker script for artisttaanmusic.com
//
// This does four things:
//   1. POST /subscribe                        -> adds an email to your Brevo "Release Updates" list
//   2. POST /demo                              -> emails your team the demo submission (with attachment)
//   3. GET  /api/spotify-top-tracks/:artistId  -> an artist's top 5 tracks, pulled live from Spotify
//   4. Everything else                         -> serves your normal website files, unchanged
//
// Required environment variables (set in Cloudflare -> Settings -> Environment variables):
//   BREVO_API_KEY          - same key you used on Netlify
//   TEAM_EMAIL             - the inbox that should receive demo submissions, e.g. hello@artisttaanmusic.com
//   SENDER_EMAIL           - a verified "from" address in your Brevo account, e.g. noreply@artisttaanmusic.com
//   SPOTIFY_CLIENT_ID      - from your app at developer.spotify.com/dashboard
//   SPOTIFY_CLIENT_SECRET  - from the same app

const BREVO_LIST_ID = 3; // your "Release Updates" list in Brevo -- used for both newsletter signups and demo submissions

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/subscribe') {
      return handleSubscribe(request, env);
    }

    if (request.method === 'POST' && url.pathname === '/demo') {
      return handleDemo(request, env);
    }

    const topTracksMatch = url.pathname.match(/^\/api\/spotify-top-tracks\/([^\/]+)\/?$/);
    if (request.method === 'GET' && topTracksMatch) {
      return handleSpotifyTopTracks(request, env, ctx, topTracksMatch[1]);
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

    // Clean team-member URLs: /team/<slug> or /team/<slug>/ -> serve
    // team-profile/index.html (NOT team/index.html, which is the team grid
    // page -- same split as /artists/ [grid] vs /artist/:slug/ [profile]
    // above). This regex requires a slug segment, so bare /team/ still falls
    // through untouched to the static team/index.html grid.
    const teamSlugMatch = url.pathname.match(/^\/team\/([^\/]+)\/?$/);
    if (teamSlugMatch && teamSlugMatch[1] !== 'index.html') {
      const assetUrl = new URL('/team-profile/', url.origin);
      const assetRequest = new Request(assetUrl.toString(), request);
      const assetResponse = await env.ASSETS.fetch(assetRequest);
      return renderTeamMeta(assetResponse, teamSlugMatch[1], url.origin, env);
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

    // Clean release URLs: /release/<slug> or /release/<slug>/ -> serve
    // release/index.html directly (same single-page pattern as /artist/:slug/
    // above). The Worker rewrites the meta tags server-side so search engines
    // and link-preview bots (WhatsApp, Slack, Twitter/X, etc.) see the real
    // song title/cover/description immediately, without executing JS.
    const releaseSlugMatch = url.pathname.match(/^\/release\/([^\/]+)\/?$/);
    if (releaseSlugMatch && releaseSlugMatch[1] !== 'index.html') {
      const assetUrl = new URL('/release/', url.origin);
      const assetRequest = new Request(assetUrl.toString(), request);
      const assetResponse = await env.ASSETS.fetch(assetRequest);
      return renderReleaseMeta(assetResponse, releaseSlugMatch[1], url.origin, env);
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

// ---------- Server-rendered team-member meta tags ----------
//
// Same pattern as renderArtistMeta above: team-profile/index.html ships with
// empty <title>/meta description/canonical/OG tags and fills them in
// client-side via JS once artists.json loads. This rewrites those tags (and
// the visible <h1> name) server-side first, so link-preview bots and search
// engines see the real name/role/photo immediately.
async function renderTeamMeta(assetResponse, slug, origin, env) {
  let member;
  try {
    const dataRes = await env.ASSETS.fetch(new URL('/assets/data/artists.json', origin));
    if (!dataRes.ok) return assetResponse;
    const data = await dataRes.json();
    member = (data.team || []).find(function (m) { return m.id === slug; });
  } catch (e) {
    console.error('renderTeamMeta: could not load artists.json', e);
    return assetResponse;
  }

  if (!member) return assetResponse; // Unknown slug -- let the client-side "not found" state handle it.

  const pageUrl = origin + '/team/' + member.id + '/';
  const title = member.name + ' — ARTISTTAAN';
  const ogTitle = member.name + ' | ARTISTTAAN';
  const description = member.full_bio || member.bio || '';
  const shortDescription = member.bio || description;
  const imageSrc = member.cover || member.photo;
  const image = imageSrc ? origin + '/' + String(imageSrc).replace(/^\/+/, '') : '';

  const rewriter = new HTMLRewriter()
    .on('title#page-title', { element: function (el) { el.setInnerContent(title); } })
    .on('meta#meta-description', { element: function (el) { el.setAttribute('content', description); } })
    .on('link#canonical-url', { element: function (el) { el.setAttribute('href', pageUrl); } })
    .on('meta#og-url', { element: function (el) { el.setAttribute('content', pageUrl); } })
    .on('meta#og-title', { element: function (el) { el.setAttribute('content', ogTitle); } })
    .on('meta#og-description', { element: function (el) { el.setAttribute('content', shortDescription); } })
    .on('meta#twitter-title', { element: function (el) { el.setAttribute('content', ogTitle); } })
    .on('meta#twitter-description', { element: function (el) { el.setAttribute('content', shortDescription); } })
    .on('h1#hero-name', { element: function (el) { el.setInnerContent(member.name); } });

  if (image) {
    rewriter
      .on('meta#og-image', { element: function (el) { el.setAttribute('content', image); } })
      .on('meta#twitter-image', { element: function (el) { el.setAttribute('content', image); } });
  }

  return rewriter.transform(assetResponse);
}

// ---------- Server-rendered release meta tags ----------
//
// Same pattern as renderArtistMeta above: release/index.html is a single
// dynamic template that fills in title/description/OG tags via client-side
// JS once artists.json loads. This rewrites those tags server-side first,
// matching the release by slugifying each release's title the same way the
// client-side JS and the Releases-grid links already do.
function slugify(s) {
  if (!s) return '';
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function renderReleaseMeta(assetResponse, slug, origin, env) {
  let release, artist;
  try {
    const dataRes = await env.ASSETS.fetch(new URL('/assets/data/artists.json', origin));
    if (!dataRes.ok) return assetResponse;
    const data = await dataRes.json();
    release = (data.releases || []).find(function (r) { return slugify(r.title) === slug; });
    if (release) {
      artist = (data.artists || []).find(function (a) { return a.id === release.artist_id; });
    }
  } catch (e) {
    console.error('renderReleaseMeta: could not load artists.json', e);
    return assetResponse;
  }

  if (!release) return assetResponse; // Unknown slug -- let the client-side "not found" state handle it.

  const pageUrl = origin + '/release/' + slug + '/';
  const type = (release.type || 'release').toLowerCase();
  const title = release.title + ' by ' + release.artist + ' | ARTISTTAAN';
  const description = 'Stream "' + release.title + '" by ' + release.artist + ' (' + (release.year || '') + ') — a ' + type + ' from ARTISTTAAN, India\'s hip-hop & indie music label.';
  const image = release.cover ? origin + '/' + String(release.cover).replace(/^\/+/, '') : origin + '/assets/images/logo/og-image.jpg';

  // Embed the already-fetched release (and matching artist) data directly into
  // the page as inline JSON. Without this, the browser has to fetch and parse
  // the ~40KB artists.json a SECOND time client-side (the Worker just fetched
  // it above) before it can paint the cover image, title, or about text --
  // that duplicate round trip was the main cause of the 3-4s delay before
  // content appeared. release/index.html's script reads window.__RELEASE_DATA__
  // first and only falls back to fetching if it's missing (e.g. local dev).
  const inlineData = '<script>window.__RELEASE_DATA__=' + JSON.stringify({ release: release, artist: artist || null }) + ';</script>';

  const rewriter = new HTMLRewriter()
    .on('title#page-title', { element: function (el) { el.setInnerContent(title); } })
    .on('meta#meta-description', { element: function (el) { el.setAttribute('content', description); } })
    .on('link#canonical-url', { element: function (el) { el.setAttribute('href', pageUrl); } })
    .on('meta#og-url', { element: function (el) { el.setAttribute('content', pageUrl); } })
    .on('meta#og-title', { element: function (el) { el.setAttribute('content', title); } })
    .on('meta#og-description', { element: function (el) { el.setAttribute('content', description); } })
    .on('meta#og-image', { element: function (el) { el.setAttribute('content', image); } })
    .on('meta#twitter-title', { element: function (el) { el.setAttribute('content', title); } })
    .on('meta#twitter-description', { element: function (el) { el.setAttribute('content', description); } })
    .on('meta#twitter-image', { element: function (el) { el.setAttribute('content', image); } })
    .on('h1#rel-title', { element: function (el) { el.setInnerContent(release.title); } })
    .on('head', { element: function (el) { el.append(inlineData, { html: true }); } });

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

  // A plain-text alternative alongside the HTML body. Spam filters commonly
  // score HTML-only emails (no text/plain part) as more suspicious, so this
  // is a small deliverability improvement, not just a fallback for old
  // email clients.
  const textContent =
    'New Demo Submission\n\n' +
    'Artist Name: ' + artistName + '\n' +
    'Email: ' + email + '\n' +
    'Instagram: @' + instagram + '\n' +
    'Demo Link: ' + demoLink + '\n\n' +
    'About:\n' + about;

  const emailPayload = {
    sender: { email: env.SENDER_EMAIL, name: 'ARTISTTAAN Website' },
    to: [{ email: env.TEAM_EMAIL }],
    replyTo: { email: email, name: artistName },
    subject: 'New Demo Submission - ' + artistName,
    htmlContent: htmlContent,
    textContent: textContent,
  };

  // Add the submitter to the Brevo "Demo Submissions" list. This runs
  // separately from (and doesn't block) the team-notification email below --
  // if Brevo's contacts API hiccups, we still want the team to get the demo,
  // so any failure here is just logged, not surfaced to the submitter.
  try {
    const contactResponse = await fetch('https://api.brevo.com/v3/contacts', {
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
        attributes: {
          ARTIST_NAME: artistName,
          INSTAGRAM: instagram,
          DEMO_LINK: demoLink,
        },
      }),
    });
    if (!contactResponse.ok) {
      const contactError = await contactResponse.json().catch(function () { return {}; });
      if (contactError.code !== 'duplicate_parameter') {
        console.error('Brevo contacts API error (demo):', contactResponse.status, contactError);
      }
    }
  } catch (err) {
    console.error('Brevo contacts add error (demo):', err);
  }

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

// ---------- Spotify top tracks ----------
//
// Pulls an artist's top tracks straight from Spotify's own Web API using the
// "Client Credentials" flow -- this is app-to-app authentication, not tied
// to any Spotify user login. Requires SPOTIFY_CLIENT_ID and
// SPOTIFY_CLIENT_SECRET (see the file header above).
//
// CURRENTLY UNREACHABLE: since Nov 27 2024, Spotify gated this exact
// endpoint (GET /artists/{id}/top-tracks) behind "Extended Quota Mode",
// which requires a registered business + 250k/mo active users + a launched
// consumer service. A normal Development-Mode Spotify app gets a 403 here
// no matter how correct the client ID/secret are, which the try/catch below
// turns into the 502 you'll see client-side. There is no code-side fix for
// this -- it's a Spotify access-tier restriction, not a bug. The artist
// page now renders top tracks from the hand-curated "top_tracks" array in
// assets/data/artists.json instead (see readme.md). This endpoint is left
// in place, unused, in case Extended Quota Mode is ever granted later.
//
// Note on "monthly listeners": Spotify's public API does not expose that
// number anywhere -- it only exists on open.spotify.com's own private
// frontend, so it isn't something this endpoint (or any legitimate
// integration) can pull in. Top tracks, however, is a fully supported
// public endpoint and is what this powers.

let cachedSpotifyToken = null; // { token, expiresAt } -- reused across requests within the same Worker isolate

async function getSpotifyToken(env) {
  if (cachedSpotifyToken && cachedSpotifyToken.expiresAt > Date.now()) {
    return cachedSpotifyToken.token;
  }
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
    throw new Error('Spotify credentials are not configured.');
  }
  const basic = btoa(env.SPOTIFY_CLIENT_ID + ':' + env.SPOTIFY_CLIENT_SECRET);
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + basic,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error('Could not get a Spotify access token (status ' + res.status + ').');
  const data = await res.json();
  cachedSpotifyToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000, // refresh a minute early, just in case
  };
  return cachedSpotifyToken.token;
}

// Pulls the Spotify artist ID out of a full profile URL, e.g.
// "https://open.spotify.com/artist/0XHapa0VH6XHwA3wlqextO?si=abc123"
// -> "0XHapa0VH6XHwA3wlqextO". Works with or without a trailing query string.
function extractSpotifyArtistId(spotifyUrl) {
  if (!spotifyUrl) return null;
  const match = String(spotifyUrl).match(/artist\/([A-Za-z0-9]+)/);
  return match ? match[1] : null;
}

function formatDuration(ms) {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes + ':' + String(seconds).padStart(2, '0');
}

async function handleSpotifyTopTracks(request, env, ctx, artistSlug) {
  // Cache the finished JSON response for a few hours -- top tracks don't
  // change often, and this keeps us well within Spotify's rate limits
  // regardless of how much traffic the site gets.
  const cache = caches.default;
  const cacheKey = new Request('https://artisttaanmusic.com/__cache/spotify-top-tracks/' + artistSlug);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  let artist;
  try {
    const dataRes = await env.ASSETS.fetch(new URL('/assets/data/artists.json', request.url));
    const data = await dataRes.json();
    artist = (data.artists || []).find(function (a) { return a.id === artistSlug; });
  } catch (e) {
    console.error('handleSpotifyTopTracks: could not load artists.json', e);
    return jsonResponse({ error: 'Could not load artist data.' }, 500);
  }

  if (!artist) return jsonResponse({ error: 'Unknown artist.' }, 404);

  const spotifyArtistId = extractSpotifyArtistId(artist.spotify_url);
  if (!spotifyArtistId) return jsonResponse({ error: 'No Spotify link on file for this artist.' }, 404);

  let token;
  try {
    token = await getSpotifyToken(env);
  } catch (e) {
    console.error('handleSpotifyTopTracks: token error', e);
    return jsonResponse({ error: 'Spotify is not configured yet.' }, 500);
  }

  let tracks;
  try {
    const res = await fetch(
      'https://api.spotify.com/v1/artists/' + spotifyArtistId + '/top-tracks?market=IN',
      { headers: { Authorization: 'Bearer ' + token } }
    );
    if (!res.ok) throw new Error('Spotify API returned status ' + res.status);
    const data = await res.json();
    tracks = (data.tracks || []).slice(0, 5).map(function (t) {
      return {
        name: t.name,
        album: t.album ? t.album.name : '',
        image: t.album && t.album.images && t.album.images[0] ? t.album.images[0].url : '',
        url: t.external_urls ? t.external_urls.spotify : '',
        duration: formatDuration(t.duration_ms),
      };
    });
  } catch (e) {
    console.error('handleSpotifyTopTracks: fetch error', e);
    return jsonResponse({ error: 'Could not load top tracks right now.' }, 502);
  }

  const response = new Response(JSON.stringify({ tracks: tracks }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'Cache-Control': 'public, max-age=21600', // 6 hours
    },
  });
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

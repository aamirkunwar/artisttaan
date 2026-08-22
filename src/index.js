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
      return env.ASSETS.fetch(assetRequest);
    }

    // Anything else: serve the static website files as normal.
    return env.ASSETS.fetch(request);
  },
};

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

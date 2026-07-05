// Netlify serverless function: receives email signups from the site and
// adds them to your Brevo ("Release Updates") contact list.
//
// The Brevo API key is read from the BREVO_API_KEY environment variable,
// which you set in Netlify (Site settings -> Environment variables).
// It is never exposed in the site's public code.

const BREVO_LIST_ID = 3; // your "Release Updates" list in Brevo

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed.' }) };
  }

  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request.' }) };
  }

  const email = (data.email || '').trim();
  const botField = data.botField || '';

  // Honeypot: bots fill hidden fields humans never see. Pretend success so
  // they don't learn anything, but don't actually contact Brevo.
  if (botField) {
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  }

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!isValidEmail) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Please enter a valid email address.' }) };
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('BREVO_API_KEY is not set in environment variables.');
    return { statusCode: 500, body: JSON.stringify({ error: 'Server is not configured. Please try again later.' }) };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        listIds: [BREVO_LIST_ID],
        updateEnabled: true,
      }),
    });

    if (response.ok) {
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    const errorData = await response.json().catch(function () { return {}; });

    // Brevo returns this when the email is already on the list -- treat as success.
    if (errorData.code === 'duplicate_parameter') {
      return { statusCode: 200, body: JSON.stringify({ success: true, alreadySubscribed: true }) };
    }

    console.error('Brevo API error:', response.status, errorData);
    return { statusCode: 502, body: JSON.stringify({ error: 'Could not subscribe right now. Please try again later.' }) };
  } catch (err) {
    console.error('Subscribe function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Something went wrong. Please try again later.' }) };
  }
};

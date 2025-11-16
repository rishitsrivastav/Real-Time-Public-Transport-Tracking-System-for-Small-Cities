const fetch = require('node-fetch');

// Calls OpenRouteService Directions API with given coordinates.
// coords: array of [lon, lat]
async function callDirectionsORS(coords) {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) throw new Error('Missing ORS_API_KEY in .env');

  // Use JSON endpoint and request encoded polyline geometry
  const url = 'https://api.openrouteservice.org/v2/directions/driving-car/json';

  const body = {
    // ORS v9+ ignores/does not support geometry_format in body; default JSON response returns encoded polyline string
    coordinates: coords,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ORS error ${res.status}: ${text}`);
  }

  const data = await res.json();
  // Expecting data.routes[0] with encoded geometry and summary
  const route = data && Array.isArray(data.routes) && data.routes[0];
  if (!route) throw new Error('ORS response missing routes[0]');

  const geometry = route.geometry; // encoded polyline string
  const summary = route.summary || {};
  const distance = summary.distance; // meters
  const duration = summary.duration; // seconds

  return { geometry, distance, duration };
}

// Retry wrapper with simple backoff
async function callORSWithRetry(coords, retries = 2) {
  let attempt = 0;
  let delay = 500; // ms
  while (true) {
    try {
      return await callDirectionsORS(coords);
    } catch (err) {
      if (attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, delay));
      attempt += 1;
      delay *= 2;
    }
  }
}

module.exports = { callORSWithRetry };
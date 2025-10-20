/**
 * Cloudflare Worker to proxy EMTA API requests and bypass CORS restrictions
 *
 * Deploy this to Cloudflare Workers:
 * 1. Go to https://dash.cloudflare.com/
 * 2. Click "Workers & Pages" in the left sidebar
 * 3. Click "Create Application" > "Create Worker"
 * 4. Replace the default code with this file's content
 * 5. Click "Deploy"
 * 6. Copy your worker URL (e.g., https://emta-proxy.your-username.workers.dev)
 * 7. Update the WORKER_URL in index.html to point to your worker
 */

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        }
      });
    }

    // Only allow GET requests
    if (request.method !== 'GET') {
      return new Response('Method not allowed', {
        status: 405,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    try {
      // Parse the incoming request URL
      const url = new URL(request.url);

      // Get all query parameters from the worker URL
      const params = url.searchParams;

      // Build the EMTA API URL with all parameters
      const emtaUrl = new URL('https://avalik.emta.ee/msm-public/v1/vehicle-tax/calculate');

      // Copy all query parameters to the EMTA API URL
      for (const [key, value] of params.entries()) {
        emtaUrl.searchParams.append(key, value);
      }

      // Make request to EMTA API
      const emtaResponse = await fetch(emtaUrl.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      // Check if the response is OK
      if (!emtaResponse.ok) {
        return new Response(JSON.stringify({
          error: `EMTA API returned status ${emtaResponse.status}`
        }), {
          status: emtaResponse.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        });
      }

      // Get the response data
      const data = await emtaResponse.json();

      // Return the data with CORS headers
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        }
      });

    } catch (error) {
      return new Response(JSON.stringify({
        error: `Worker error: ${error.message}`
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
  }
};

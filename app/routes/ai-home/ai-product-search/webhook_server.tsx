import { verifyOrderWebhook, displayOrder } from './orders.js';

export function loader() {
  return null;
}

export async function action({ request }: { request: Request }) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const rawBody = await request.text();
  if (!rawBody) {
    return new Response('Empty body', { status: 400 });
  }

  const headers = Object.fromEntries(request.headers.entries());
  const sharedSecret = process.env.CLIENT_SECRET;

  if (!verifyOrderWebhook(rawBody, headers, sharedSecret)) {
    return new Response('Invalid signature', { status: 401 });
  }

  try {
    const order = JSON.parse(rawBody);
    const topic = headers['x-shopify-topic'] ?? 'unknown';
    const webhookId = headers['x-shopify-webhook-id'] ?? 'unknown';

    console.log(`\n── ${topic} (${webhookId}) ─────────────────────`);
    displayOrder(order);

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error('Invalid Shopify order webhook payload:', error);
    return new Response('Invalid JSON', { status: 400 });
  }
}

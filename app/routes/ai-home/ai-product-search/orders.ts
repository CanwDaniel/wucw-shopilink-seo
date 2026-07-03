import { getMcpEndpoint } from './mcp.js';
import crypto from 'node:crypto';

// const AGENT_PROFILE = 'https://shopify.dev/ucp/agent-profiles/examples/2026-04-08/valid-with-capabilities.json';
const AGENT_PROFILE = 'https://wucw.top/cart-and-checkout.json';

export async function getOrderAccessToken() {
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  const res = await fetch('https://api.shopify.com/auth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials'
    })
  });

  const data = await res.json();
  if (!data.access_token) throw new Error(`Token mint failed: ${JSON.stringify(data)}`);

  console.log('\n── Order Token Minted ─────────────────────────────\n');
  console.log(`  Scope:   ${data.scope}`);
  console.log(`  Expires: ${new Date(Date.now() + data.expires_in * 1000).toLocaleTimeString()}`);

  return data.access_token;
}

export async function getOrder(token, orderId, checkoutUrl) {
  const origin = new URL(checkoutUrl).origin;
  const mcpEndpoint = await getMcpEndpoint(origin);

  const res = await fetch(mcpEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      id: 8,
      params: {
        name: 'get_order',
        arguments: {
          id: orderId,
          meta: { 'ucp-agent': { profile: AGENT_PROFILE } }
        }
      }
    })
  });

  const data = await res.json();

  if (data?.result?.isError) {
    const message = data.result.structuredContent?.messages?.[0];
    throw new Error(`get_order error: ${message?.code} (${message?.severity})`);
  }
  if (!data?.result?.structuredContent) {
    throw new Error(`get_order failed: ${JSON.stringify(data)}`);
  }

  return data.result.structuredContent;
}

export function displayOrder(order) {
  const total = order.totals.find(t => t.type === 'total')?.amount ?? 0;
  console.log('\n── Order Summary ──────────────────────────────────\n');
  console.log(`  ${order.label}`);
  console.log(`  Total:  ${formatMoney(total, order.currency)}`);
  console.log(`  Status page: ${order.permalink_url}\n`);

  console.log('  Items:');
  for (const line of order.line_items) {
    if (line.quantity.total === 0) continue;
    console.log(
      `    · ${line.item.title} (x${line.quantity.total}, ${line.status})`
    );
  }

  if (order.fulfillment.events.length > 0) {
    console.log('\n  Fulfillment timeline:');
    for (const event of order.fulfillment.events) {
      const when = new Date(event.occurred_at).toLocaleString();
      console.log(`    · ${event.type.padEnd(12)} ${when}`);
    }
  }

  if (order.adjustments.length > 0) {
    console.log('\n  Adjustments:');
    for (const adj of order.adjustments) {
      const amount = adj.totals[0]?.amount ?? 0;
      console.log(
        `    · ${adj.type.padEnd(14)} ${formatMoney(amount, order.currency)}`
      );
    }
  }
}

function formatMoney(minor, currency) {
  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency });
  const fractionDigits = formatter.resolvedOptions().maximumFractionDigits;
  const major = minor / Math.pow(10, fractionDigits);
  return formatter.format(major);
}

export function verifyOrderWebhook(rawBody, headers, sharedSecret) {
  const provided = headers['x-shopify-hmac-sha256'];
  if (!provided) return false;
  const computed = crypto
    .createHmac('sha256', sharedSecret)
    .update(rawBody)
    .digest('base64');
  const providedBuf = Buffer.from(provided, 'utf8');
  const computedBuf = Buffer.from(computed, 'utf8');
  if (providedBuf.length !== computedBuf.length) return false;
  return crypto.timingSafeEqual(providedBuf, computedBuf);
}
import { getMcpEndpoint } from './mcp.js';

// const AGENT_PROFILE = 'https://shopify.dev/ucp/agent-profiles/examples/2026-04-08/cart-and-checkout.json';
// const AGENT_PROFILE = 'https://ucp-agent-json.vercel.app/cart-and-checkout.json';
const AGENT_PROFILE = 'https://wucw.top/cart-and-checkout.json';

export async function createCart(variantId, checkoutUrl, buyerIp) {
  const origin = new URL(checkoutUrl).origin;
  const mcpEndpoint = await getMcpEndpoint(origin);
  
  const res = await fetch(mcpEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Shopify-Buyer-IP': buyerIp
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      id: 3,
      params: {
        name: 'create_cart',
        arguments: {
          cart: {
            line_items: [{ quantity: 1, item: { id: variantId } }]
          },
          meta: { 'ucp-agent': { profile: AGENT_PROFILE } }
        }
      }
    })
  });
  
  const data = await res.json();
  
  if (data?.result?.content?.[0]?.text) {
    data.result.content[0].text = JSON.parse(data.result.content[0].text);
  }
  if (!data.result) throw new Error(`create_cart failed: ${JSON.stringify(data)}`);
  
  // const cart = data.result.structuredContent?.cart ?? data.result.content[0].text.cart;
  const cart = data.result.structuredContent ?? data.result.content[0].text;

  const total = cart.totals?.find(t => t.type === 'total')?.amount ?? 0;

  console.log('\n── Create Cart ────────────────────────────────────\n');
  console.log(`  Cart ID:  ${cart.id}`);
  console.log(`  Total:    $${(total / 100).toFixed(2)}`);

  return cart.id;
}

export async function getCart(cartId, checkoutUrl, buyerIp) {
  const origin = new URL(checkoutUrl).origin;
  const mcpEndpoint = await getMcpEndpoint(origin);

  const res = await fetch(mcpEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Shopify-Buyer-IP': buyerIp },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      id: 4,
      params: {
        name: 'get_cart',
        arguments: {
          id: cartId,
          meta: { 'ucp-agent': { profile: AGENT_PROFILE } }
        }
      }
    })
  });

  const data = await res.json();
  
  if (!data.result) throw new Error(`get_cart failed: ${JSON.stringify(data)}`);
  const cart = data.result.structuredContent;
  const notFound = cart?.messages?.find(m => m.code === 'not_found');
  
  if (notFound) throw new Error('Cart not found or expired');
  const total = cart.totals?.find(t => t.type === 'total')?.amount ?? 0;

  console.log('\n── Get Cart ───────────────────────────────────────\n');
  console.log(`  Cart ID:  ${cart.id}`);
  console.log(`  Items:    ${cart.line_items.length}`);
  console.log(`  Total:    $${(total / 100).toFixed(2)}`);

  return cart;
}

export async function updateCart(cartId, cart, checkoutUrl, buyerIp) {
  const origin = new URL(checkoutUrl).origin;
  const mcpEndpoint = await getMcpEndpoint(origin);

  const res = await fetch(mcpEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Shopify-Buyer-IP': buyerIp },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      id: 5,
      params: {
        name: 'update_cart',
        arguments: {
          id: cartId,
          cart,
          meta: { 'ucp-agent': { profile: AGENT_PROFILE } }
        }
      }
    })
  });

  const data = await res.json();
  if (!data.result) throw new Error(`update_cart failed: ${JSON.stringify(data)}`);
  const updated = data.result.structuredContent?.cart;
  const total = updated.totals?.find(t => t.type === 'total')?.amount ?? 0;

  console.log('\n── Update Cart ────────────────────────────────────\n');
  console.log(`  Items:  ${updated.line_items.length}`);
  console.log(`  Total:  $${(total / 100).toFixed(2)}`);

  return updated;
}

import { randomUUID } from 'node:crypto';

export async function cancelCart(cartId, checkoutUrl, buyerIp) {
  const origin = new URL(checkoutUrl).origin;
  const mcpEndpoint = await getMcpEndpoint(origin);
  
  const res = await fetch(mcpEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Shopify-Buyer-IP': buyerIp },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      id: 6,
      params: {
        name: 'cancel_cart',
        arguments: {
          id: cartId,
          meta: {
            'ucp-agent': { profile: AGENT_PROFILE },
            'idempotency-key': randomUUID()
          }
        }
      }
    })
  });

  const data = await res.json();
  if (!data.result) throw new Error(`cancel_cart failed: ${JSON.stringify(data)}`);

  console.log('\n── Cancel Cart ────────────────────────────────────\n');
  console.log(`  Cart ${cartId} canceled.`);
}
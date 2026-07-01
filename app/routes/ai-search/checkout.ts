import { getMcpEndpoint } from './mcp.js';

// const AGENT_PROFILE = 'https://shopify.dev/ucp/agent-profiles/examples/2026-04-08/cart-and-checkout.json';
// const AGENT_PROFILE = 'https://ucp-agent-json.vercel.app/cart-and-checkout.json';
const AGENT_PROFILE = 'https://wucw.top/cart-and-checkout.json';

export async function createCheckout(token, cartId, checkoutUrl, buyerIp, cartLineItems) {
  const origin = new URL(checkoutUrl).origin;
  const mcpEndpoint = await getMcpEndpoint(origin);

  // TODO: 要注意这里的传参，不然拿到不对应的gid
  const formattedLineItems = Array.isArray(cartLineItems) ? cartLineItems.map((line) => ({
    quantity: line.quantity || 1,
    item: {
      id: line.item?.id 
    }
  })) : [];
  
  const res = await fetch(mcpEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Shopify-Buyer-IP': buyerIp
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      id: 3,
      params: {
        name: 'create_checkout',
        arguments: {
          cart_id: cartId,
          checkout: {
            line_items: formattedLineItems
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

  if (!data.result) throw new Error(`create_checkout failed: ${JSON.stringify(data)}`);
  
  const checkout = data.result.structuredContent ?? data.result.content[0].text;
  const { id, totals } = checkout;
  
  const total = totals?.find((t: { type: string; amount?: number }) => t.type === 'total')?.amount ?? 0;

  console.log('\n── Create Checkout ────────────────────────────────\n');
  console.log(`  ID:     ${id}`);
  console.log(`  Total:  $${(total / 100).toFixed(2)}`);
  return `${id}`;
}

async function getCheckout(token, checkoutId, checkoutUrl, buyerIp) {
  const origin = new URL(checkoutUrl).origin;
  const mcpEndpoint = await getMcpEndpoint(origin);

  const res = await fetch(mcpEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Shopify-Buyer-IP': buyerIp
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      id: 4,
      params: {
        name: 'get_checkout',
        arguments: {
          id: checkoutId,
          meta: { 'ucp-agent': { profile: AGENT_PROFILE } }
        }
      }
    })
  });
  
  const data = await res.json();
  
  if (data?.result?.content?.[0]?.text) {
    data.result.content[0].text = JSON.parse(data.result.content[0].text);
  }
  if (!data.result) throw new Error(`get_checkout failed: ${JSON.stringify(data)}`);

  return data.result.structuredContent ?? data.result.content[0].text;
}

export async function updateCheckout(token, checkoutId, email, checkoutUrl, buyerIp) {
  const origin = new URL(checkoutUrl).origin;
  const mcpEndpoint = await getMcpEndpoint(origin);
  const current = await getCheckout(token, checkoutId, checkoutUrl, buyerIp);
  
  const res = await fetch(mcpEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Shopify-Buyer-IP': buyerIp
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      id: 5,
      params: {
        name: 'update_checkout',
        arguments: {
          id: checkoutId,
          checkout: {
            currency: current.currency,
            context: current.context,
            line_items: current.line_items.map((li: { quantity: number; item: { id: string } }) => ({
              quantity: li.quantity,
              item: { id: li.item.id }
            })),
            buyer: { ...(current.buyer ?? {}), email }
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
  if (!data.result) throw new Error(`update_checkout failed: ${JSON.stringify(data)}`);

  const checkout = data.result.structuredContent ?? data.result.content[0].text;
  console.log('\n── Update Checkout ────────────────────────────────\n');

  return checkout.continue_url;
}

export async function cancelCheckout(token, checkoutId, checkoutUrl, buyerIp) {
  const origin = new URL(checkoutUrl).origin;
  const mcpEndpoint = await getMcpEndpoint(origin);

  const res = await fetch(mcpEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Shopify-Buyer-IP': buyerIp
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      id: 6,
      params: {
        name: 'cancel_checkout',
        arguments: {
          id: checkoutId,
          meta: {
            'ucp-agent': { profile: AGENT_PROFILE },
            'idempotency-key': crypto.randomUUID()
          }
        }
      }
    })
  });

  const data = await res.json();

  if (data?.result?.content?.[0]?.text) {
    data.result.content[0].text = JSON.parse(data.result.content[0].text);
  }

  if (!data.result) throw new Error(`cancel_checkout failed: ${JSON.stringify(data)}`);
  const status = data.result.structuredContent?.status;

  if (status !== 'canceled') throw new Error(`Unexpected status: ${status}`);

  console.log('\n── Cancel Checkout ────────────────────────────────\n');
  console.log(`  Status: ${status}`);
  console.log('  Checkout has been successfully cancelled.');
  console.log('  Demo complete.\n');
}

export async function completeCheckout(token, checkoutId, checkoutUrl, payment, buyerIp) {
  const origin = new URL(checkoutUrl).origin;
  const mcpEndpoint = await getMcpEndpoint(origin);
  const current = await getCheckout(token, checkoutId, checkoutUrl, buyerIp);

  if (current.status !== 'ready_for_complete') {
    console.log(`  Checkout is ${current.status}. Hand off to the buyer at:\n  ${current.continue_url}\n`);
    return null;
  }

  const res = await fetch(mcpEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Shopify-Buyer-IP': buyerIp
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      id: 7,
      params: {
        name: 'complete_checkout',
        arguments: {
          id: checkoutId,
          checkout: { payment },
          meta: {
            'ucp-agent': { profile: AGENT_PROFILE },
            'idempotency-key': crypto.randomUUID()
          }
        }
      }
    })
  });

  const data = await res.json();
  if (!data.result) throw new Error(`complete_checkout failed: ${JSON.stringify(data)}`);
  const checkout = data.result.structuredContent;

  console.log('\n── Complete Checkout ──────────────────────────────\n');
  console.log(`  Status: ${checkout.status}`);

  if (checkout.order) console.log(`  Order:  ${checkout.order.id}`);
  return checkout;
}
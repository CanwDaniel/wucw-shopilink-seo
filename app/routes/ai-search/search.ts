import { prompt } from './utils.js';

export const CATALOG_URL = 'https://catalog.shopify.com/api/ucp/mcp';

export function showCatalog() {
  console.log('\n── 2. Search the Catalog ─────────────────────────\n');
  console.log(`  Catalog:  ${CATALOG_URL}\n`);
}

export function displayProducts(products) {
  console.log('\n── Results ────────────────────────────────────────\n');
  products.forEach((product, i) => {
    const price = `$${(product.price_range.min.amount / 100).toFixed(2)}`;
    const options = product.options?.map(o => `${o.name}: ${o.values.map(v => v.label).join(', ')}`).join('  |  ') ?? '—';
    console.log(`  [${i + 1}] ${product.title}  |  ${price}  |  ${options}`);
  });
  console.log();
}

export async function searchProducts(token, filters = {}) {
  const query = process.argv[2] || await prompt('\x1b[1m  Hello! What are you looking for today?\x1b[0m\n\n  > ');
  const res = await fetch(CATALOG_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      id: 1,
      params: {
        name: 'search_catalog',
        arguments: {
          meta: {
            'ucp-agent': {
              profile: 'https://shopify.dev/ucp/agent-profiles/2026-04-08/valid-with-capabilities.json'
            }
          },
          catalog: { query, filters }
        }
      }
    })
  });
  const data = await res.json();
  return data.result?.structuredContent ?? null;
}
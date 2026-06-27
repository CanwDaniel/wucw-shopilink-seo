import type { Route } from './+types/index';

import { getAccessToken } from './auth.js';
import { searchProducts, displayProducts, showCatalog } from './search.js';

async function main() {
  // 1. Authentication
  const token = await getAccessToken();

  // 2. Search the Catalog
  showCatalog();
  
  const result = await searchProducts(token, {
    condition: ['secondhand'],
    price: { min: 5000, max: 20000 },
    ships_to: { country: 'US' },
  });

  if (!result?.products?.length) return;
  displayProducts(result.products);
}

export function loader() {
  main().catch(err => console.error('Request failed:', err));

  return {};
}

export async function action({ request }: Route.ActionArgs) {

}
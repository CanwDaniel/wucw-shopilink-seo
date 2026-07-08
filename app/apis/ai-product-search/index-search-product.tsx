import type { Route } from './+types/index';

import { searchProducts } from './search';

async function main(buyerIp: string) {
  // TODO myshopify
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  
  const result = await searchProducts(token, buyerIp, {
    ships_to: { country: 'US' },
    // shop_ids: [ `${actualShopId}` ],
    // query: "",
    // condition: ['new'],
    // price: { min: 0, max: 20000 },
    // pagination: { limit: 200 },
  });
 
  if (!result.products?.length) {
    return;
  } else {
    return result.products;
  }
}

export function action({ request }: Route.ActionArgs) {
  const buyerIp = request.headers.get("X-Forwarded-For")?.split(",")[0].trim() || request.headers.get("X-Real-IP") || "127.0.0.1";

  return main(buyerIp).catch(err => console.error('Request failed:', err));
}
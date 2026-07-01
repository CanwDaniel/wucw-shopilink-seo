import type { Route } from './+types/index';

import { prompt } from './utils';
import { getAccessToken } from './auth';
import { searchProducts, displayProducts, showCatalog } from './search';
import { selectProduct } from './product';
import { createCart, getCart } from './cart';
import { createCheckout, updateCheckout, cancelCheckout, completeCheckout } from './checkout';
import { getOrderAccessToken, getOrder, displayOrder } from './orders.js';

async function main(buyerIp) {
  // 1. Authentication
  // const token = await getAccessToken();
  // TODO myshopify
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  
  // 2 & 3. Search and select a variant
  let variant = null;
  
  while(!variant) {
    showCatalog();
    const result = await searchProducts(token, buyerIp, {
      ships_to: { country: 'US' },
      // shop_ids: [ `${actualShopId}` ],
      // query: "",
      // condition: ['new'],
      // price: { min: 0, max: 20000 },
      // pagination: { limit: 200 },
    });
    
    if (!result.products?.length) return;
    
    displayProducts(result.products);
    variant = await selectProduct(token, result.products);
  }

  const { variantId, checkout_url: checkoutUrl } = variant;
  
  // 4.Build a cart
  const cartId = await createCart(variantId, checkoutUrl, buyerIp);

  const cartLineItems = await getCart(cartId, checkoutUrl, buyerIp);
  
  // 5. Create checkout from the cart
  const checkoutId = await createCheckout(token, cartId, checkoutUrl, buyerIp, cartLineItems.line_items);
  
  // 6. Update checkout: add buyer email
  const email = await prompt('\n\x1b[1m  Enter your email address:\x1b[0m  ');
  const continueUrl = await updateCheckout(token, checkoutId, email, checkoutUrl, buyerIp);
  const attributedUrl = new URL(continueUrl);
  attributedUrl.searchParams.set('utm_source', 'ucp_demo_app');
  console.log(`  Refer your buyer to finish checkout at:\n\n  ${attributedUrl}\n`);
  
  // 7. Cancel checkout
  // await prompt('\x1b[1m  Are you finished with the demo? Press Enter to cancel the checkout and exit.\x1b[0m  ');
  // await cancelCheckout(token, checkoutId, checkoutUrl, buyerIp);

  // 8. Complete checkout 不需要死磕，可以通过链接让用户去走支付流程
  // const payment = null; 
  // const checkout = await completeCheckout(token, checkoutId, checkoutUrl, payment, buyerIp);
  // if (!checkout?.order?.id) {
  //   console.log('  No order returned. Hand the buyer off using continue_url and observe the order through the webhook flow in Step 6.');
  //   return;
  // }

  // Monitor order
  // await new Promise(resolve => setTimeout(resolve, 10_000));
  // const orderToken = await getOrderAccessToken();
  // const order = await getOrder(orderToken, checkout.order.id, checkoutUrl);
  // displayOrder(order);
}

export function loader({ request }: Route.LoaderArgs) {
  const buyerIp = request.headers.get("X-Forwarded-For")?.split(",")[0].trim() || request.headers.get("X-Real-IP") || "127.0.0.1";

  main(buyerIp).catch(err => console.error('Request failed:', err));

  return {};
}
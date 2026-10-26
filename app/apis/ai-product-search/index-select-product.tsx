import type { Route } from './+types/index';

import { prompt } from './utils';
import { searchProducts, displayProducts, showCatalog } from './search';
import { selectProduct, getProductDetails } from './product';
import { createCart, getCart } from './cart';
import { createCheckout, updateCheckout, cancelCheckout, completeCheckout } from './checkout';

interface PramsData {
  productId: string;
  selectedArr: [];
  buyerIp: string;
}

async function getProduct(productId: string) {
  try {
    const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
    
    const details = await getProductDetails(token, productId);
    
    if (!details) {
      return {
        success: false,
        error: "Product not found",
      }
    }

    return {
      success: true,
      data: details,
    }
  } catch(error) {
    return {
      success: false,
      error,
    }
  }
}

async function getCheckoutUrl({ productId, selectedArr, buyerIp }: PramsData) {
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  
  const details = await getProductDetails(token, productId, selectedArr);
  console.log('😀', details);
  const variant = details?.product?.variants?.[0];
  
  if (!variant) {
    return {
      success: false,
      error: "❌ 未找到匹配该规格的商品，请重新选择。",
    }
  }

  const { id: variantId, checkout_url: checkoutUrl } = variant;

  try {
    const cartId = await createCart(variantId, checkoutUrl, buyerIp);
    
    const cartLineItems = await getCart(cartId, checkoutUrl, buyerIp);
    
    const checkoutId = await createCheckout(token, cartId, checkoutUrl, buyerIp, cartLineItems.line_items);
    
    const continueUrl = await updateCheckout(token, checkoutId, '', checkoutUrl, buyerIp);
    const attributedUrl = new URL(continueUrl);
    attributedUrl.searchParams.set('utm_source', 'ucp_app');

    return { 
      success: true,
      data: attributedUrl,
    }
  } catch(error) {
    return { 
      success: true,
      data: `❌ ${error}`,
    }
  }
}

export async function action({ request }: Route.ActionArgs) {
  const buyerIp = request.headers.get("X-Forwarded-For")?.split(",")[0].trim() || request.headers.get("X-Real-IP") || "127.0.0.1";

  // 获取产品详情 getProductDetails
  const response = await request.json();

  const { type, productId, selectedArr } = response;
  if(type === 'initProductData') {
    return getProduct(`${productId}`).catch(err => console.error('Request failed:', err));
  } 
  else if(type === 'getCheckoutData') {
    return getCheckoutUrl({ productId, selectedArr, buyerIp }).catch(err => console.error('Request failed:', err));
  } else {
    return {};
  }
}
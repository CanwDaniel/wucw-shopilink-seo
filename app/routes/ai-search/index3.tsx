import type { Route } from './+types/index';

import { data } from 'react-router';

import { AiSeachLog } from 'server/ai-search/aiSearchLog.api';

export function loader() {
  return {}
}

export async function action({ request }: Route.ActionArgs) {
  const SHOPIFY_CATALOG_ENDPOINT = 'https://catalog.shopify.com/v1/search';

  if(request.method !== 'POST') return { status: 400, data: 'Invalid request' }

  const formData = await request.formData();
  const query = formData.get('query') as string ?? '';
  const keyword = formData.get('keyword') as string;
  const minPrice = formData.get('minPrice') ? Number(formData.get("minPrice")) : 0;
  const maxPrice = formData.get('maxPrice') ? Number(formData.get("maxPrice")) : 0;

  if(!query || !keyword) {
    return data({ status: 400, data: 'Missing required fields' });
  }

  try {
    // 数据持久化
    // const res = await AiSeachLog({ query, keyword, minPrice, maxPrice });

    const catalogResponse = await fetch(SHOPIFY_CATALOG_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SHOPIFY_CATALOG_TOKEN}`,
        ContentType: 'application/json',
        XUCPVersion: '2026-04'
      },
      body: JSON.stringify({ query, keyword, minPrice, maxPrice }),
    });
  } catch (error) {
    console.error("Server Action Error:", error);
    return data({ error: "Internal Server Error" }, { status: 500 });
  }
}
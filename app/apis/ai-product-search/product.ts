import { prompt } from "./utils.js";
import { CATALOG_URL } from "./search.js";

async function getProductDetails(token, productId, selected = []) {
  const res = await fetch(CATALOG_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": `${token}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      id: 2,
      params: {
        name: "get_product",
        arguments: {
          meta: {
            "ucp-agent": {
              profile:
                "https://shopify.dev/ucp/agent-profiles/2026-04-08/valid-with-capabilities.json",
            },
          },
          catalog: {
            id: productId,
            ...(selected.length ? { selected } : {}),
          },
        },
      },
    }),
  });
  const data = await res.json();
  
  return data.result?.structuredContent ?? null;
}

function displayProduct(product) {
  const featuredVariant = product.variants?.[0];
  const price = featuredVariant ? `$${(featuredVariant.price.amount / 100).toFixed(2)}` : "";
  const sellerName = featuredVariant?.seller?.name ?? "";
  const variantTitle = featuredVariant?.title ?? "";

  console.log("\n── 3. Product Details ─────────────────────────────\n");
  console.log(`  ${product.title}${variantTitle ? ` - ${variantTitle}` : ""}`);
  console.log(`  ${[price, sellerName].filter(Boolean).join("  ·  ")}\n`);

  if (product.description?.html) console.log(`  ${product.description.html}\n`);
}

async function pickVariant(token, productId, product) {
  try {
    const selected = Object.fromEntries((product.selected ?? []).map((s) => [s.name, s.label]));

    if (product.options?.length) while (true) {
      const optionMap = [];

      console.log("\n  Options:");

      product.options.forEach((opt) => {
        const lines = opt.values.map((v) => {
          const n = optionMap.length + 1;
          const marker = selected[opt.name] === v.label ? "●" : "○";
          optionMap.push({ optName: opt.name, label: v.label });
          return `    [${n}] ${marker} ${v.label}${v.available === false ? " (unavailable)" : ""}`;
        });

        console.log(`\n  ${opt.name}:`);

        lines.forEach((l) => console.log(l));
      });

      const selectedDesc = product.options.map((o) => selected[o.name]).join(" / ");

      console.log(`\n  \x1b[1mSelected: ${selectedDesc}\x1b[0m`);
      console.log("\n  [s] Select this variant  [number] Pick an option  [b] Back to results",);

      const action = await prompt("\n  > ");
      const trimmed = action.trim();

      if (trimmed === "b") return null;

      if (trimmed === "s") {
        const selectedArr = Object.entries(selected).map(([name, label]) => ({name, label}));
        const details = await getProductDetails(token, productId, selectedArr);
        
        // 2. 明确根据用户选择的 selectedArr 去匹配具体的变体，而不是盲目取 [0]
        // 假设后端接口已经根据 selectedArr 过滤好了唯一的 variant，也最好做个兜底判断
        const variant = details?.product?.variants?.[0];
        if (!variant) {
          console.log("❌ 未找到匹配该规格的商品，请重新选择。");
          continue; // 没拿到就不退出，让用户继续选
        }
        return { variantId: variant.id, checkout_url: variant.checkout_url };
      }

      const chosen = optionMap[parseInt(trimmed) - 1];

      if (chosen) {
        selected[chosen.optName] = chosen.label;
      } else {
        // 3. 增加非法输入的提示，防止死循环用户不知道发生什么
        console.log("⚠️ 请输入有效的选项数字、[s] 或 [b]");
      }
    }

    const variant = product.variants?.[0];

    return variant ? { variantId: variant.id, checkout_url: variant.checkout_url } : null;
  } catch (error) {
    console.error("❌ 发生错误:", error.message);
    return null;
  }
}

export async function selectProduct(token, products) {
  const pick = await prompt(`\x1b[1m  Lookup details on a result [1-${products.length}]:\x1b[0m  `);
  const index = parseInt(pick) - 1;
  const selectedProduct = products[index];

  const details = await getProductDetails(token, selectedProduct.id);

  const product = details?.product;
  if (!product) return null;

  displayProduct(product);

  const variant = await pickVariant(token, selectedProduct.id, product);

  return variant;
}

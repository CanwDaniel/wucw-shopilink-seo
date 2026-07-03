import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  route("login", "routes/account/login.tsx"),
  route("logout", "routes/account/logout.tsx"),
  route("register", "routes/account/register.tsx"),

  layout("routes/index.tsx", [
    index("routes/home/index.tsx"),
    route("project", "routes/project/index.tsx"),
    route("analytic", "routes/analytic/index.tsx"),
    route("aichat", "routes/ai-home/index.tsx"),

    // API 暂时没用到
    route("webhooks", "routes/ai-home/ai-product-search/webhook_server.tsx"),
  ]),

  route("/.well-known/appspecific/com.chrome.devtools.json", "debugNull.tsx")
] satisfies RouteConfig;

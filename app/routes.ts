import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  route("login", "routes/account/login.tsx"),
  route("register", "routes/account/register.tsx"),

  layout("routes/authGuardLayout.tsx", [
    index("routes/index.tsx"),
  ]),
  
  route("/.well-known/appspecific/com.chrome.devtools.json", "debugNull.tsx")
] satisfies RouteConfig;

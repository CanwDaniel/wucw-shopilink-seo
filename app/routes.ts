import { type RouteConfig, index, route, prefix } from "@react-router/dev/routes";

export default [
  index("routes/index.tsx"),
  route("login", "account/login.tsx"),
  route("register", "account/register.tsx"),

  route("/.well-known/appspecific/com.chrome.devtools.json", "debugNull.tsx")
] satisfies RouteConfig;

import type { Route } from "./+types/authGuardLayout";
import { Outlet, redirect } from "react-router";
import { ServerToolAuth } from "../server/tool/auth.tool";
import { Toaster } from "~/components/ui/sonner";

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || '';
  const token = cookieHeader.match(/token=([^;]+)/)?.[1];
  const url = new URL(request.url);
  const currentPath = url.pathname + url.search;
  const redirectPath = currentPath === "/" ? '/login' : `/login?from=${encodeURIComponent(currentPath)}`;
  
  if (!token) {
    return redirect(redirectPath);
  }

  const isVerify = await ServerToolAuth(token);
  
  if(!isVerify) {
    return redirect(redirectPath, {
      headers: {
        "Set-Cookie": "token=; Path=/; Max-Age=0",
      },        
    });
  } else {
    return null;
  }
  
}

export default function AuthGuardLayout() {
  return (
    <>
      <Toaster />
      <Outlet />
    </>
  )
}
import type { Route } from "./+types/index";
import { Outlet, redirect } from "react-router";
import { ServerToolAuth } from "server/tool/auth.tool";
import { AppSidebar } from "./sidebar-cpm/app-sidebar";
import { SiteHeader } from "./sidebar-cpm/site-header";
import { Toaster } from "~/components/ui/sonner";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { TooltipProvider } from "~/components/ui/tooltip";

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

export default function Root() {
  return (
    <>
      <Toaster />

      <SidebarProvider>
        <TooltipProvider>
          <AppSidebar variant="inset" />
        </TooltipProvider>
  
        <SidebarInset>
          <SiteHeader />
          
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <div className="px-4 lg:px-6">
                  <Outlet />
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </>
  )
}
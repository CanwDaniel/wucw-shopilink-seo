import type { Route } from "./+types/index";
import { AppSidebar } from "./sidebar-cpm/app-sidebar";
import { SiteHeader } from "./sidebar-cpm/site-header";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { TooltipProvider } from "~/components/ui/tooltip"

export default function Home() {
  return (
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
                123
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

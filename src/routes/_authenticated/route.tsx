import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMe } from "@/lib/me.functions";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

const meQueryOptions = queryOptions({
  queryKey: ["me"],
  queryFn: () => getMe(),
  staleTime: 30_000,
});

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    await context.queryClient.ensureQueryData(meQueryOptions);
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { data: me } = useSuspenseQuery(meQueryOptions);
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden md:flex">
        <AppSidebar me={me} />
      </div>

      <div className="flex flex-1 min-w-0 flex-col">
        <div className="flex items-center gap-2 border-b bg-background px-2 py-1 md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <AppSidebar me={me} onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <img src={logo} alt="" className="h-7 w-7 object-contain" />
          <div className="min-w-0 text-xs font-semibold truncate">Zinnuryn Academy Bauchi</div>
        </div>

        <TopBar me={me} />

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}


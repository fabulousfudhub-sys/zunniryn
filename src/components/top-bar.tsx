import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Grid3x3, Search, LogOut, User as UserIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { MePayload } from "@/lib/me.functions";

const APPS = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Students", to: "/students" },
  { label: "Staff", to: "/staff" },
  { label: "Classes", to: "/classes" },
  { label: "Subjects", to: "/subjects" },
  { label: "Results", to: "/results" },
  { label: "Reports", to: "/reports" },
  { label: "Settings", to: "/settings" },
];

export function TopBar({ me }: { me: MePayload }) {
  const navigate = useNavigate();
  const initials = (me.fullName ?? me.email ?? "U")
    .split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out.");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-3 sm:px-5 backdrop-blur">
      <div className="relative flex-1 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search records, students, or pins…" className="h-9 rounded-full bg-muted/60 pl-9 border-transparent focus-visible:bg-background" />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <span className="hidden md:inline font-display text-sm font-bold italic text-primary">Zinnuryn Academy Bauchi</span>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-destructive" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Apps"><Grid3x3 className="h-5 w-5" /></Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-2">
            <div className="px-2 py-1 text-[11px] uppercase tracking-widest text-muted-foreground">Apps</div>
            <div className="grid grid-cols-3 gap-1">
              {APPS.map((a) => (
                <Link key={a.to} to={a.to} className="flex flex-col items-center gap-1 rounded-md p-2 hover:bg-muted text-center">
                  <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary text-xs font-semibold">{a.label[0]}</div>
                  <span className="text-[11px] leading-tight">{a.label}</span>
                </Link>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-muted">
              <Avatar className="h-8 w-8">
                {me.avatarUrl ? <AvatarImage src={me.avatarUrl} alt="" /> : null}
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate">{me.fullName ?? me.email ?? "Account"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link to="/settings"><UserIcon className="mr-2 h-4 w-4" /> Profile & settings</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}><LogOut className="mr-2 h-4 w-4" /> Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

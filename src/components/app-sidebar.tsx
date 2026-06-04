import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, ClipboardList,
  ScrollText, Award, CreditCard, Settings, Calendar, FileText, LogOut, Megaphone,
  Database, ShieldCheck, ChevronLeft, ChevronDown, ChevronRight, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole, MePayload } from "@/lib/me.functions";
import { toast } from "sonner";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: AppRole[];
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/announcements", label: "Announcements", icon: Megaphone },
    ],
  },
  {
    id: "people",
    label: "People",
    items: [
      { to: "/students", label: "Students", icon: Users, roles: ["super_admin","principal","vice_principal","director","admission_officer","exam_officer","form_master","teacher"] },
      { to: "/staff", label: "Staff", icon: GraduationCap, roles: ["super_admin","principal","vice_principal","director"] },
    ],
  },
  {
    id: "academics",
    label: "Academics",
    items: [
      { to: "/classes", label: "Classes & Arms", icon: BookOpen, roles: ["super_admin","principal","vice_principal"] },
      { to: "/subjects", label: "Subjects", icon: ScrollText, roles: ["super_admin","principal","vice_principal"] },
      { to: "/assignments", label: "Teacher Assignments", icon: GraduationCap, roles: ["super_admin","principal","vice_principal"] },
      { to: "/attendance", label: "Attendance", icon: Calendar, roles: ["super_admin","principal","form_master","teacher"] },
    ],
  },
  {
    id: "results",
    label: "Results",
    items: [
      { to: "/scores", label: "Score Entry", icon: ClipboardList, roles: ["teacher","exam_officer","super_admin"] },
      { to: "/results", label: "Results", icon: Award },
      { to: "/grading", label: "Grading Config", icon: Settings, roles: ["super_admin","principal","exam_officer"] },
      { to: "/reports", label: "Report Cards", icon: FileText, roles: ["super_admin","principal","exam_officer","form_master"] },
      { to: "/scratch-cards", label: "Scratch Cards", icon: CreditCard, roles: ["super_admin","exam_officer"] },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    items: [
      { to: "/exports", label: "Exports & Backup", icon: Database, roles: ["super_admin","principal","director"] },
      { to: "/audit-log", label: "Audit Log", icon: ShieldCheck, roles: ["super_admin","director","principal"] },
      { to: "/settings", label: "Settings", icon: Settings, roles: ["super_admin"] },
    ],
  },
];

const LS_COLLAPSED = "sidebar.collapsed";
const LS_GROUPS = "sidebar.groups";

export function AppSidebar({ me, onNavigate }: { me: MePayload; onNavigate?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(LS_COLLAPSED) === "1";
  });
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem(LS_GROUPS) ?? "{}"); } catch { return {}; }
  });
  const [query, setQuery] = useState("");

  useEffect(() => { localStorage.setItem(LS_COLLAPSED, collapsed ? "1" : "0"); }, [collapsed]);
  useEffect(() => { localStorage.setItem(LS_GROUPS, JSON.stringify(openGroups)); }, [openGroups]);

  // Keyboard shortcut: Cmd/Ctrl + B toggles sidebar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed((c) => !c);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const visibleGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GROUPS
      .map((g) => ({
        ...g,
        items: g.items.filter((i) =>
          (!i.roles || i.roles.some((r) => me.roles.includes(r))) &&
          (!q || i.label.toLowerCase().includes(q)),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [me.roles, query]);

  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(to + "/");

  // Auto-open group containing active item; default all open
  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const g of GROUPS) {
        if (!(g.id in next)) next[g.id] = true;
        if (g.items.some((i) => isActive(i.to))) next[g.id] = true;
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out.");
    navigate({ to: "/auth", replace: true });
  };

  const toggleGroup = (id: string) => setOpenGroups((g) => ({ ...g, [id]: !g[id] }));

  return (
    <TooltipProvider delayDuration={150}>
      <aside className={cn(
        "flex h-screen flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-16" : "w-64",
      )}>
        <div className={cn("flex items-center gap-3 border-b border-sidebar-border px-3 py-4", collapsed && "justify-center px-2")}>
          <img src={logo} alt="" className="h-9 w-9 shrink-0 object-contain" width={36} height={36} />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-sm font-bold leading-tight">Zinnuryn Academy</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-gold">Bauchi</div>
            </div>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7 text-sidebar-foreground/70 hover:text-sidebar-accent-foreground"
                onClick={() => setCollapsed((c) => !c)}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{collapsed ? "Expand" : "Collapse"} (⌘B)</TooltipContent>
          </Tooltip>
        </div>

        {!collapsed && (
          <div className="border-b border-sidebar-border px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-sidebar-foreground/50" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter menu…"
                className="h-8 border-sidebar-border/50 bg-sidebar-accent/20 pl-7 text-xs placeholder:text-sidebar-foreground/50"
              />
            </div>
          </div>
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
          {visibleGroups.map((group) => (
            <div key={group.id}>
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="group flex w-full items-center justify-between rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 hover:text-sidebar-foreground/80"
                >
                  <span>{group.label}</span>
                  {openGroups[group.id] !== false ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
              )}
              {(collapsed || openGroups[group.id] !== false) && (
                <div className="mt-0.5 space-y-0.5">
                  {group.items.map((item) => {
                    const active = isActive(item.to);
                    const link = (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => onNavigate?.()}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          collapsed && "justify-center px-2",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    );
                    return collapsed ? (
                      <Tooltip key={item.to}>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    ) : link;
                  })}
                </div>
              )}
            </div>
          ))}
          {visibleGroups.length === 0 && !collapsed && (
            <div className="px-3 py-6 text-center text-xs text-sidebar-foreground/50">No matching menu items.</div>
          )}
        </nav>

        <div className={cn("border-t border-sidebar-border p-3", collapsed && "px-2")}>
          {!collapsed && (
            <div className="mb-2 px-1">
              <div className="truncate text-sm font-medium">{me.fullName ?? me.email}</div>
              <div className="truncate text-xs text-sidebar-foreground/60">
                {me.roles.length ? me.roles.map(prettyRole).join(", ") : "No role assigned"}
              </div>
            </div>
          )}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-full text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign out</TooltipContent>
            </Tooltip>
          ) : (
            <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}

function prettyRole(r: string) {
  return r.split("_").map((s) => s[0].toUpperCase() + s.slice(1)).join(" ");
}

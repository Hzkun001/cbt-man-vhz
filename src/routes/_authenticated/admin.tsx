import React, { useState, useEffect } from "react";
import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useAuthStore } from "@/lib/cbt/auth-store";
import { useThemeStore } from "@/lib/cbt/theme-store";
import { configRepo, hydrateRepos } from "@/lib/cbt/repos";
import { type AppConfig, type NavKey, type Role } from "@/lib/cbt/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Wrench,
  FolderOpen,
  PenLine,
  Activity,
  Landmark,
  Sun,
  Moon,
  Menu,
  X,
  BookOpenCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ADMIN_ROUTE_RULES = {
  root: { key: "dashboard", adminOnly: false, paths: ["/admin"] },
  users: { key: "users", adminOnly: true, paths: ["/admin/users"] },
  akademik: { key: "akademik", adminOnly: true, paths: ["/admin/akademik"] },
  peserta: { key: "peserta", adminOnly: false, paths: ["/admin/peserta"] },
  modul: { key: "modul", adminOnly: false, paths: ["/admin/modul", "/admin/topik"] },
  files: { key: "files", adminOnly: false, paths: ["/admin/files"] },
  ujian: { key: "ujian", adminOnly: false, paths: ["/admin/ujian"] },
  hasil: { key: "hasil", adminOnly: false, paths: ["/admin/hasil"] },
  evaluasi: { key: "evaluasi", adminOnly: false, paths: ["/admin/evaluasi"] },
  laporan: { key: "laporan", adminOnly: false, paths: ["/admin/laporan"] },
  leaderboard: { key: "leaderboard", adminOnly: false, paths: ["/admin/leaderboard"] },
  pengaturan: { key: "pengaturan", adminOnly: true, paths: ["/admin/pengaturan"] },
  tools: { key: "tools", adminOnly: true, paths: ["/admin/tools"] },
  panduan: { key: "panduan", adminOnly: false, paths: ["/admin/panduan"] },
} satisfies Record<string, { key: NavKey; adminOnly: boolean; paths: string[] }>;

type AdminRouteRule = (typeof ADMIN_ROUTE_RULES)[keyof typeof ADMIN_ROUTE_RULES];
type RouteUser = { role: Role };

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Utama",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    ]
  },
  {
    label: "Akademik & Pengguna",
    items: [
      { to: "/admin/akademik", label: "Struktur Akademik", icon: Landmark },
      { to: "/admin/users", label: "Pengelola Sistem", icon: Users },
      { to: "/admin/peserta", label: "Mahasiswa / Peserta", icon: GraduationCap, exact: true },
    ]
  },
  {
    label: "Bank Soal & Berkas",
    items: [
      { to: "/admin/modul", label: "Bank Soal", icon: BookOpen },
      { to: "/admin/files", label: "File Manager", icon: FolderOpen },
    ]
  },
  {
    label: "Ujian & Pelaksanaan",
    items: [
      { to: "/admin/ujian", label: "Paket Ujian", icon: FileText },
      { to: "/admin/peserta/online", label: "Pantau Ujian Live", icon: Activity },
    ]
  },
  {
    label: "Pasca Ujian",
    items: [
      { to: "/admin/evaluasi", label: "Evaluasi Essay", icon: PenLine },
      { to: "/admin/analitik", label: "Analitik & Laporan", icon: BarChart3 },
    ]
  },
  {
    label: "Sistem & Bantuan",
    items: [
      { to: "/admin/pengaturan", label: "Pengaturan", icon: Settings },
      { to: "/admin/tools", label: "Backup & Tools", icon: Wrench },
      { to: "/admin/panduan", label: "Panduan", icon: BookOpenCheck },
    ]
  }
];

const navItems: NavItem[] = navGroups.flatMap(g => g.items);

function normalizedAdminPath(pathname: string) {
  if (pathname === "/admin") return pathname;
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function resolveAdminRouteRule(pathname: string): AdminRouteRule | null {
  const normalized = normalizedAdminPath(pathname);
  const rules = Object.values(ADMIN_ROUTE_RULES).flatMap((rule) =>
    rule.paths.map((path) => ({ path, rule })),
  );
  const match = rules
    .filter(({ path }) => normalized === path || normalized.startsWith(`${path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0];
  return match?.rule ?? null;
}

function operatorAccessKeys(cfg: AppConfig, role: Role) {
  return new Set((cfg.roleAccess[role] ?? []) as NavKey[]);
}

export function canAccessAdminPath(user: RouteUser, pathname: string, cfg: AppConfig) {
  if (user.role === "super_admin") return true;
  if (user.role === "mahasiswa") return false;
  const rule = resolveAdminRouteRule(pathname);
  if (!rule) return false;
  if (rule.adminOnly) return false;
  return operatorAccessKeys(cfg, user.role).has(rule.key);
}

function firstAllowedAdminPath(user: RouteUser, cfg: AppConfig) {
  if (user.role === "super_admin") return "/admin";
  const firstVisible = navItems.find((item) => canAccessAdminPath(user, item.to, cfg));
  return firstVisible?.to ?? "/login";
}

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context, location }) => {
    const user = (context as { user: RouteUser }).user;
    if (user.role === "mahasiswa") throw redirect({ to: "/peserta" });

    try {
      await hydrateRepos();
    } catch {
      // gunakan cache terakhir/default agar guard tetap deterministik
    }

    const cfg = configRepo.get();
    if (!canAccessAdminPath(user, location.pathname, cfg)) {
      throw redirect({ to: firstAllowedAdminPath(user, cfg) });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const user = useAuthStore((s) => s.user)!;
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const cfg = configRepo.get();
  const appName = cfg.appName;

  const [colorMode, setColorMode] = useState("light");
  const { theme: uiTheme } = useThemeStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") {
      setColorMode(stored);
      if (stored === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setColorMode(prefersDark ? "dark" : "light");
      if (prefersDark) document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const next = colorMode === "light" ? "dark" : "light";
    setColorMode(next);
    localStorage.setItem("theme", next);
    if (next === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className={cn("min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100", uiTheme === "neobrutalism" && "neo-ready")}>
      <div className="flex">
        
        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={cn(
            uiTheme === "neobrutalism" ? "w-72 shrink-0 border-r-[length:var(--neo-border-width)] border-r-[color:var(--neo-border-color)] bg-white text-[color:var(--neo-text)] lg:block transition-transform duration-300 z-50 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto scrollbar-thin" : "w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 lg:block transition-transform duration-200 z-50 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto scrollbar-thin",
            mobileMenuOpen ? cn("fixed inset-y-0 left-0 h-screen overflow-y-auto", uiTheme === "neobrutalism" ? "shadow-[var(--neo-shadow)]" : "shadow-xl") : "hidden"
          )}>
            <div className={cn("flex h-16 items-center justify-between px-5", uiTheme === "neobrutalism" ? "border-b-[length:var(--neo-border-width)] border-b-[color:var(--neo-border-color)] font-black uppercase tracking-wider text-xl bg-white" : "border-b border-slate-200 dark:border-slate-800")}>
              <div className="flex items-center gap-3">
                {cfg.appLogo ? (
                  <img src={cfg.appLogo} alt="Logo" className="h-7 w-auto object-contain" />
                ) : (
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground font-bold text-base shadow-sm">
                    Z
                  </span>
                )}
                <span className={cn("truncate", uiTheme === "neobrutalism" ? "font-black text-black text-xl tracking-wider" : "font-bold text-slate-900 dark:text-slate-100 text-base tracking-tight")}>{appName}</span>
              </div>
              {mobileMenuOpen && (
                <Button variant="ghost" size="icon" title="Tutup menu navigasi" aria-label="Tutup menu navigasi" className="lg:hidden h-8 w-8 text-slate-500 hover:text-slate-900" onClick={() => setMobileMenuOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
            <nav className="flex flex-col gap-6 p-4">
              {navGroups.map((group) => {
                const visibleItems = group.items.filter((item) =>
                  canAccessAdminPath(user, item.to, cfg)
                );

                if (visibleItems.length === 0) return null;

                return (
                  <div key={group.label} className="flex flex-col gap-1.5">
                    <h3 className={cn("px-3 text-[11px] uppercase tracking-wider", uiTheme === "neobrutalism" ? "w-full text-center py-2 font-black text-[color:var(--neo-text)] bg-[color:var(--neo-bg)] border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[var(--neo-shadow)]" : "font-semibold text-slate-400 dark:text-slate-500")}>
                      {group.label}
                    </h3>
                    <div className="flex flex-col gap-1">
                      {visibleItems.map((n) => {
                        const Icon = n.icon;
                        return (
                          <Link
                            key={n.to}
                            to={n.to as never}
                            activeOptions={{ exact: n.exact }}
                            activeProps={{
                              className: uiTheme === "neobrutalism" ? "bg-[color:var(--neo-accent)] text-[color:var(--neo-text)] translate-x-[4px] translate-y-[4px] shadow-[var(--neo-shadow)]" : "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold shadow-sm"
                            }}
                            inactiveProps={{
                              className: uiTheme === "neobrutalism" ? "bg-white text-[color:var(--neo-text)] shadow-[var(--neo-shadow)] hover:bg-[color:var(--neo-bg)] hover:text-[color:var(--neo-text)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[var(--neo-shadow)]" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-100"
                            }}
                            className={cn("flex items-center gap-3 transition-colors duration-150", uiTheme === "neobrutalism" ? "border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] px-4 py-3 text-xs md:text-sm font-black uppercase tracking-wider transition-all duration-100 ease-in-out rounded-[var(--neo-radius)]" : "px-3 py-2 text-xs md:text-sm rounded-lg")}
                          >
                            <Icon className={cn("shrink-0", uiTheme === "neobrutalism" ? "h-5 w-5 stroke-[2.5]" : "h-4 w-4")} />
                            <span className="leading-snug">{n.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>
          </aside>

        <div className="flex min-h-screen flex-1 flex-col min-w-0">

          <header className={cn("flex h-16 items-center justify-between sticky top-0 z-30 px-4 lg:px-6", uiTheme === "neobrutalism" ? "border-b-[length:var(--neo-border-width)] border-b-[color:var(--neo-border-color)] bg-white" : "border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md")}>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                title="Buka menu navigasi"
                aria-label="Buka menu navigasi"
                className={cn("lg:hidden", uiTheme === "neobrutalism" ? "h-10 w-10 border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] bg-[color:var(--neo-bg)] hover:bg-[color:var(--neo-accent)] shadow-[var(--neo-shadow)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[var(--neo-shadow)] rounded-[var(--neo-radius)]" : "h-9 w-9 text-slate-500 hover:text-slate-900")}
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className={cn("text-sm hidden sm:flex items-center", uiTheme === "neobrutalism" ? "gap-4" : "gap-3")}>
                <span className={cn(uiTheme === "neobrutalism" ? "font-black uppercase text-[color:var(--neo-text)] text-base" : "font-semibold text-slate-900 dark:text-slate-100 text-sm")}>{user.namaLengkap}</span>
                {uiTheme === "neobrutalism" ? (
                  <span className="border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] bg-[color:var(--neo-accent)] px-2 py-0.5 text-xs font-black uppercase text-[color:var(--neo-text)] shadow-[var(--neo-shadow)]">
                  {user.role}
                </span>
                ) : (
                  <Badge variant="outline" className="font-medium text-[11px] uppercase border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                  {user.role}
                </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className={cn(uiTheme === "neobrutalism" ? "h-10 w-10 rounded-[var(--neo-radius)] border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] bg-white shadow-[var(--neo-shadow)] hover:bg-[color:var(--neo-bg)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[var(--neo-shadow)] flex items-center justify-center" : "h-9 w-9 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100")}
                onClick={toggleTheme}
                title="Ganti tema"
              >
                {colorMode === "dark" ? <Sun className={cn("h-4 w-4", uiTheme === "neobrutalism" && "h-5 w-5 stroke-[3] text-[color:var(--neo-text)]")} /> : <Moon className={cn("h-4 w-4", uiTheme === "neobrutalism" && "h-5 w-5 stroke-[3] text-[color:var(--neo-text)]")} />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn(uiTheme === "neobrutalism" ? "h-10 rounded-[var(--neo-radius)] border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] bg-white font-black uppercase text-[color:var(--neo-text)] shadow-[var(--neo-shadow)] hover:bg-red-400 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[var(--neo-shadow)]" : "h-9 text-xs font-medium border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-900 transition-colors")}
                onClick={async () => {
                  await logout();
                  navigate({ to: "/login" });
                }}
              >
                <LogOut className={cn(uiTheme === "neobrutalism" ? "mr-2 h-5 w-5 stroke-[3]" : "mr-1.5 h-3.5 w-3.5")} /> <span className="hidden sm:inline">Keluar</span>
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

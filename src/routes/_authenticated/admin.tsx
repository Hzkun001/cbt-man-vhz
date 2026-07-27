
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
import { configRepo, hydrateRepos } from "@/lib/cbt/repos";
import { type AppConfig, type NavKey, type Role } from "@/lib/cbt/types";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  FileText,
  ClipboardList,
  BarChart3,
  Settings,
  LogOut,
  Trophy,
  Wrench,
  FolderOpen,
  PenLine,
  Activity,
  Landmark,
  Sun,
  Moon,
  Menu,
  X,
  Sparkles,
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
    label: "Main",
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

// Keep a flattened version for logic checks
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

  const visible = navItems.filter((item) => canAccessAdminPath(user, item.to, cfg));

  const [theme, setTheme] = useState("light");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") {
      setTheme(stored);
      if (stored === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
      if (prefersDark) document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    if (next === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex">
        
        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={cn(
          "w-72 shrink-0 border-r-4 border-black bg-white text-black lg:block transition-transform duration-300 z-50 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto scrollbar-thin",
          mobileMenuOpen ? "fixed inset-y-0 left-0 h-screen overflow-y-auto shadow-[12px_0_0_0_rgba(0,0,0,1)]" : "hidden"
        )}>
          <div className="flex h-16 items-center justify-between border-b-4 border-black px-5 font-black uppercase tracking-wider text-xl bg-white">
            <div className="flex items-center gap-3">
              {cfg.appLogo ? (
                <img src={cfg.appLogo} alt="Logo" className="h-8 w-auto object-contain" />
              ) : (
                <span className="grid h-9 w-9 place-items-center bg-[#a3e635] border-2 border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] text-black text-lg">
                  Z
                </span>
              )}
              <span className="truncate">{appName}</span>
            </div>
            {mobileMenuOpen && (
              <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8 border-2 border-black hover:bg-yellow-400 bg-white shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none rounded-none" onClick={() => setMobileMenuOpen(false)}>
                <X className="h-5 w-5 stroke-[3]" />
              </Button>
            )}
          </div>
          <nav className="flex flex-col gap-8 p-6">
            {navGroups.map((group) => {
              const visibleItems = group.items.filter((item) =>
                canAccessAdminPath(user, item.to, cfg)
              );

              if (visibleItems.length === 0) return null;

              return (
                <div key={group.label} className="flex flex-col gap-4">
                  <h3 className="w-full text-center px-3 py-2 text-xs font-black uppercase tracking-wider text-black bg-yellow-400 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                    {group.label}
                  </h3>
                  <div className="flex flex-col gap-3">
                    {visibleItems.map((n) => {
                      const Icon = n.icon;
                      return (
                        <Link
                          key={n.to}
                          to={n.to as never}
                          activeOptions={{ exact: n.exact }}
                          activeProps={{
                            className: "bg-[#a3e635] text-white translate-x-[4px] translate-y-[4px] shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                          }}
                          inactiveProps={{
                            className: "bg-white text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:bg-yellow-400 hover:text-black hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                          }}
                          className="flex items-center gap-3 border-2 border-black px-4 py-3 text-xs md:text-sm font-black uppercase tracking-wider transition-all duration-100 ease-in-out rounded-none"
                        >
                          <Icon className="h-5 w-5 stroke-[2.5] shrink-0" />
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

          <header className="flex h-14 items-center justify-between border-b bg-card px-4 lg:px-6 sticky top-0 z-30 shadow-sm backdrop-blur-md bg-card/80">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="text-sm text-muted-foreground hidden sm:block">
                <span className="font-medium text-foreground">{user.namaLengkap}</span>
                <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-xs font-medium text-accent-foreground">
                  {user.role}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                title="Ganti Tema"
              >
                {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-primary" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await logout();
                  navigate({ to: "/login" });
                }}
              >
                <LogOut className="mr-1.5 h-4 w-4" /> <span className="hidden sm:inline">Keluar</span>
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

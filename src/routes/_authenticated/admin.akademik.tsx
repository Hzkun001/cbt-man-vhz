import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Network, Calendar, Clock, BookOpen, GraduationCap, ChevronRight } from "lucide-react";
import { AdminPage, AdminPageHeader } from "@/components/cbt/AdminPage";

export const Route = createFileRoute("/_authenticated/admin/akademik")({
  component: AkademikLayout,
});

const TREE_MENU = [
  {
    section: "Struktur Institusi",
    items: [
      { label: "Fakultas, Program Studi & Kelas", to: "/admin/akademik", icon: Network, indent: 0 },
    ]
  },
  {
    section: "Periode Akademik",
    items: [
      { label: "Tahun Akademik", to: "/admin/akademik/tahun-akademik", icon: Calendar, indent: 0 },
      { label: "Semester", to: "/admin/akademik/semester", icon: Clock, indent: 1 },
    ]
  },
  {
    section: "Kurikulum",
    items: [
      { label: "Mata Kuliah", to: "/admin/akademik/mata-kuliah", icon: BookOpen, indent: 0 },
    ]
  },
  {
    section: "Kelas Perkuliahan",
    items: [
      { label: "Kelas Mata Kuliah", to: "/admin/akademik/kelas-mata-kuliah", icon: GraduationCap, indent: 0 },
    ]
  }
];

function AkademikLayout() {
  const { pathname } = useLocation();

  return (
    <AdminPage className="mx-auto w-full max-w-[1600px] pb-12">
      <AdminPageHeader
        title="Data Akademik"
        description="Atur struktur, periode, mata kuliah, dan kelas yang dipakai dalam ujian."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-100 px-3 pb-3 pt-2 dark:border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pengaturan akademik
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-400 dark:text-slate-500">
              Pilih data yang ingin dikelola.
            </p>
          </div>

          <nav className="space-y-5 py-3" aria-label="Navigasi data akademik">
            {TREE_MENU.map((group) => (
              <div key={group.section} className="space-y-1">
                <h2 className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {group.section}
                </h2>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const active = item.to === "/admin/akademik"
                      ? (pathname === "/admin/akademik" || pathname === "/admin/akademik/")
                      : pathname.startsWith(item.to);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={cn(
                          "group flex min-h-9 items-center justify-between rounded-lg py-2 text-sm font-medium transition-colors",
                          item.indent ? "pl-9 pr-3" : "px-3",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100",
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300")} />
                          <span className="leading-5">{item.label}</span>
                        </span>
                        {active && <ChevronRight className="h-4 w-4 shrink-0" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </AdminPage>
  );
}

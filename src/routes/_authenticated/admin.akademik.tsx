import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Network, Calendar, Clock, BookOpen, ChevronRight, AlertTriangle } from "lucide-react";
import { AdminPage, AdminPageHeader } from "@/components/cbt/AdminPage";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useThemeStore } from "@/lib/cbt/theme-store";

export const Route = createFileRoute("/_authenticated/admin/akademik")({
  component: AkademikLayout,
});

const TREE_MENU = [
  {
    section: "Struktur Institusi",
    items: [
      { label: "Fakultas, Prodi & Kelas", to: "/admin/akademik", icon: Network, indent: 0 },
    ]
  },
  {
    section: "Waktu Perkuliahan",
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
  }
];

function AkademikLayout() {
  const { pathname } = useLocation();
  const { theme } = useThemeStore();

  return (
    <AdminPage className="neo-ready">
      <div className="w-full space-y-6">
      
      {/* Header */}
      <div className="space-y-4">
        <AdminPageHeader 
          title="Data Akademik" 
          description="Kelola data induk institusi. Konfigurasi di sini akan menjadi fondasi bagi pengelolaan mahasiswa, dosen, dan mata kuliah."
        />

        {/* Informasi Penekanan (Alert) */}
        <div className={cn(
          "rounded-lg p-4 flex gap-3 text-sm",
          theme === "neobrutalism"
            ? "bg-[color:var(--neo-accent)] text-black border-[3px] border-black shadow-[4px_4px_0_0_#000] rounded-none"
            : "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50"
        )}>
          <div className={cn(
            "mt-0.5",
            theme === "neobrutalism" ? "text-black" : "text-amber-600 dark:text-amber-500"
          )}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={theme === "neobrutalism" ? "3" : "2"} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div>
            <p className={cn(
              "mb-0.5",
              theme === "neobrutalism" ? "font-black uppercase tracking-wide text-black" : "font-semibold text-amber-800 dark:text-amber-400"
            )}>Perhatian: Modifikasi Struktur Induk</p>
            <p className={cn(
              "leading-relaxed",
              theme === "neobrutalism" ? "font-bold text-black" : "text-amber-700 dark:text-amber-500/90"
            )}>
              Penghapusan atau perubahan mendasar pada <strong>Fakultas atau Jurusan</strong> dapat menyebabkan data mahasiswa dan modul bank soal yang terkait menjadi tidak sinkron (<em>orphaned</em>). Pastikan Anda hanya mengubah data ini jika benar-benar diperlukan.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Sidebar Navigation */}
        <aside className="w-full lg:w-64 shrink-0 space-y-8">
          {TREE_MENU.map((group, idx) => (
            <div key={idx} className="space-y-3">
              <h4 className={cn(
                "text-xs tracking-wider",
                theme === "neobrutalism"
                  ? "font-black uppercase text-black border-b-[3px] border-black pb-1 mb-2 inline-block"
                  : "font-bold uppercase text-slate-500 dark:text-slate-400"
              )}>
                {group.section}
              </h4>
              <nav className="flex flex-col space-y-1">
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
                        "group flex items-center justify-between px-3 py-2 text-sm transition-colors",
                        theme === "neobrutalism" 
                          ? cn(
                              "font-bold rounded-none border-[3px]",
                              active
                                ? "bg-[color:var(--neo-bg)] border-black shadow-[4px_4px_0_0_#000] text-black translate-x-[-2px] translate-y-[-2px]"
                                : "border-transparent text-black hover:border-black hover:shadow-[4px_4px_0_0_#000] hover:bg-white hover:translate-x-[-2px] hover:translate-y-[-2px]"
                            )
                          : cn(
                              "font-medium rounded-lg",
                              active
                                ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white font-semibold"
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
                            )
                      )}
                      style={{ marginLeft: theme === "neobrutalism" ? '0px' : `${item.indent * 12}px`, paddingLeft: theme === "neobrutalism" ? `${item.indent * 12 + 12}px` : undefined }}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={cn(
                          "h-4 w-4 shrink-0", 
                          theme === "neobrutalism" 
                            ? "text-black"
                            : active ? "text-slate-900 dark:text-white" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                        )} />
                        {item.label}
                      </div>
                      {active && <ChevronRight className="h-4 w-4 opacity-50" />}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </aside>

        {/* Content Outlet */}
        <main className="flex-1 w-full min-h-[500px]">
          <div className="py-1">
            <Outlet />
          </div>
        </main>

      </div>
    </div>
    </AdminPage>
  );
}

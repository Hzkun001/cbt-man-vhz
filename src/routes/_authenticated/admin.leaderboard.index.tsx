import { createFileRoute, Link } from "@tanstack/react-router";
import { ujianRepo, sesiRepo } from "@/lib/cbt/repos";
import { Trophy, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AdminPage, AdminPageContent, AdminPageHeader } from "@/components/cbt/AdminPage";

export const Route = createFileRoute("/_authenticated/admin/leaderboard/")({
  component: LeaderboardIndex,
});

function LeaderboardIndex() {
  const ujian = ujianRepo.all();
  const sesi = sesiRepo.all();

  return (
    <AdminPage className="pb-12">
      <AdminPageHeader
        title="Leaderboard"
        description="Pilih paket ujian untuk melihat peringkat peserta."
      />

      <AdminPageContent className="overflow-hidden p-0">
        {ujian.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Belum ada paket ujian.</div>
        ) : (
          <div className="flex flex-col">
            {ujian.map((u) => {
              const n = sesi.filter((s) => s.ujianId === u.id && s.status === "selesai").length;
              return (
                <Link
                  key={u.id}
                  to="/admin/leaderboard/$id"
                  params={{ id: u.id }}
                  className="group flex items-center justify-between gap-4 border-b p-4 transition-colors last:border-0 hover:bg-muted/30 sm:p-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <span className="block truncate text-sm font-semibold text-foreground">{u.nama}</span>
                      <span className="block truncate text-xs text-muted-foreground">Papan peringkat peserta yang menyelesaikan ujian</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <Badge variant="secondary">{n} selesai</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </AdminPageContent>
    </AdminPage>
  );
}

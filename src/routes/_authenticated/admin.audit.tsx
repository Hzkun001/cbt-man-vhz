import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button as AntButton, Card as AntCard, ConfigProvider, Input as AntInput, Pagination, Table as AntTable, Typography, theme as antdTheme, type TableColumnsType } from "antd";
import { AdminPage, AdminPageHeader } from "@/components/cbt/AdminPage";
import { getAuditLogsServer } from "@/lib/server/audit/functions";

type AuditRow = {
  id: string;
  userId: string;
  userRole: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  createdAt: Date | string;
};

export const Route = createFileRoute("/_authenticated/admin/audit")({
  component: AuditPage,
});

function AuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const syncColorScheme = () => setIsDark(root.classList.contains("dark"));
    const observer = new MutationObserver(syncColorScheme);
    syncColorScheme();
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getAuditLogsServer({
      data: { page, pageSize: 50, entity: entity || undefined, action: action || undefined },
    })
      .then((result) => {
        if (!active) return;
        if (!result.ok) {
          setError(result.error);
          setRows([]);
          return;
        }
        setError(null);
        setRows(result.logs as AuditRow[]);
        setTotal(result.total);
      })
      .catch(() => active && setError("Audit log gagal dimuat"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [action, entity, page]);

  const pageCount = Math.max(1, Math.ceil(total / 50));
  const columns: TableColumnsType<AuditRow> = [
    {
      title: "WAKTU",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 220,
      render: (value: AuditRow["createdAt"]) => <Typography.Text type="secondary" className="whitespace-nowrap">{new Date(value).toLocaleString()}</Typography.Text>,
    },
    {
      title: "AKTOR",
      key: "actor",
      width: 220,
      render: (_: unknown, row: AuditRow) => <div><Typography.Text>{row.userId}</Typography.Text><Typography.Text type="secondary" className="block text-xs">{row.userRole}</Typography.Text></div>,
    },
    { title: "AKSI", dataIndex: "action", key: "action", width: 200, render: (value: string) => <Typography.Text strong>{value}</Typography.Text> },
    {
      title: "ENTITAS",
      key: "entity",
      width: 260,
      render: (_: unknown, row: AuditRow) => <span>{row.entity}{row.entityId ? <Typography.Text type="secondary" className="ml-1 text-xs">({row.entityId})</Typography.Text> : null}</span>,
    },
    {
      title: "DETAIL",
      dataIndex: "details",
      key: "details",
      ellipsis: true,
      render: (value: string | null) => <Typography.Text type="secondary" code ellipsis={{ tooltip: value ?? "—" }}>{value ?? "—"}</Typography.Text>,
    },
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: { colorPrimary: "#16a34a", borderRadius: 12, fontFamily: "inherit" },
      }}
    >
    <AdminPage className="mx-auto w-full max-w-[1600px] pb-12">
      <AdminPageHeader
        title="Audit Trail"
        description="Riwayat tindakan penting sistem. Halaman ini hanya-baca untuk penelusuran perubahan."
      />
      <AntCard className="mb-4" styles={{ body: { padding: 20 } }}>
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="grid gap-2 text-sm font-medium">Entitas
            <AntInput allowClear aria-label="Filter entitas" size="large" value={entity} onChange={(event) => { setEntity(event.target.value); setPage(1); }} placeholder="contoh: ujian" />
          </label>
          <label className="grid gap-2 text-sm font-medium">Aksi
            <AntInput allowClear aria-label="Filter aksi" size="large" value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }} placeholder="contoh: backup.restore" />
          </label>
          <AntButton htmlType="button" size="large" onClick={() => { setEntity(""); setAction(""); setPage(1); }}>Bersihkan filter</AntButton>
        </div>
      </AntCard>
      {error ? <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</p> : null}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <AntTable<AuditRow>
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={loading}
          pagination={false}
          size="middle"
          scroll={{ x: 1000 }}
          locale={{ emptyText: error ? " " : "Belum ada catatan audit." }}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 dark:border-slate-800">
          <Typography.Text type="secondary">{total} catatan · Halaman {page} / {pageCount}</Typography.Text>
          <Pagination current={page} pageSize={50} total={total} showSizeChanger={false} showLessItems onChange={setPage} />
        </div>
      </div>
    </AdminPage>
    </ConfigProvider>
  );
}

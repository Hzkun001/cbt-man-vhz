import { useEffect, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  ConfigProvider,
  Divider,
  Empty,
  Flex,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
  theme as antdTheme,
} from "antd";
import {
  IconActivity,
  IconAlertCircle,
  IconArrowRight,
  IconArrowUpRight,
  IconBooks,
  IconCalendarClock,
  IconCircleCheck,
  IconClock,
  IconDeviceDesktopAnalytics,
  IconFileText,
  IconKey,
  IconPlus,
  IconRadio,
  IconShieldCheck,
  IconStack2,
  IconTrendingUp,
  IconUsersGroup,
} from "@tabler/icons-react";
import { useAuthStore } from "@/lib/cbt/auth-store";
import {
  usersRepo,
  modulRepo,
  soalRepo,
  ujianRepo,
  sesiRepo,
  configRepo,
} from "@/lib/cbt/repos";
import { canAccessAdminPath } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: CommandCenter,
});

function useDashboardColorScheme() {
  const [colorScheme, setColorScheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const root = document.documentElement;
    const syncColorScheme = () =>
      setColorScheme(root.classList.contains("dark") ? "dark" : "light");
    const observer = new MutationObserver(syncColorScheme);

    syncColorScheme();
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return colorScheme;
}

function CommandCenter() {
  const colorScheme = useDashboardColorScheme();
  const user = useAuthStore((s) => s.user);
  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;

  const pesertaList = usersRepo.all().filter((u) => u.role === "mahasiswa");
  const soalList = soalRepo.all();
  const semuaUjian = ujianRepo.all();
  const cfg = configRepo.get();
  if (!user) return null;
  const canAccess = (path: string) => canAccessAdminPath(user, path, cfg);

  const newPeserta = pesertaList.filter(
    (u) => u.createdAt && now - u.createdAt < oneWeek,
  ).length;
  const newSoal = soalList.filter(
    (s) => s.createdAt && now - s.createdAt < oneWeek,
  ).length;
  const newUjian = semuaUjian.filter(
    (u) => u.createdAt && now - u.createdAt < oneWeek,
  ).length;
  const counts = {
    peserta: pesertaList.length,
    modul: modulRepo.all().length,
    soal: soalList.length,
    ujian: semuaUjian.length,
    sesi: sesiRepo.all().length,
  };
  const activeExams = semuaUjian.filter(
    (u): u is typeof u & { beginAt: number; endAt: number } =>
      typeof u.beginAt === "number" &&
      typeof u.endAt === "number" &&
      now >= u.beginAt &&
      now <= u.endAt,
  );
  const upcoming = semuaUjian
    .filter(
      (u): u is typeof u & { beginAt: number } =>
        typeof u.beginAt === "number" && now < u.beginAt,
    )
    .sort((a, b) => a.beginAt - b.beginAt);
  const upcomingExamCount = upcoming.length;
  const upcomingExams = upcoming.slice(0, 4);
  const finishedExams = semuaUjian.filter((u) => u.endAt && now > u.endAt);
  const hasQuickActions = [
    "/admin/ujian",
    "/admin/modul",
    "/admin/peserta/kartu",
  ].some(canAccess);

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}rb`;
    return num.toString();
  };
  const kpis = [
    {
      label: "Total peserta",
      value: counts.peserta,
      subtitle: "Mahasiswa terdaftar",
      icon: <IconUsersGroup size={19} aria-hidden="true" />,
      color: "blue",
      trend: newPeserta > 0 ? `+${newPeserta} baru` : null,
    },
    {
      label: "Total ujian",
      value: counts.ujian,
      subtitle: `${activeExams.length} aktif · ${upcomingExamCount} mendatang`,
      icon: <IconDeviceDesktopAnalytics size={19} aria-hidden="true" />,
      color: "teal",
      trend: newUjian > 0 ? `+${newUjian} minggu ini` : null,
    },
    {
      label: "Bank soal",
      value: counts.soal,
      subtitle: "Soal siap diujikan",
      icon: <IconFileText size={19} aria-hidden="true" />,
      color: "orange",
      trend: newSoal > 0 ? `+${newSoal} baru` : null,
    },
    {
      label: "Sesi ujian",
      value: counts.sesi,
      subtitle: `${counts.modul} modul mata kuliah`,
      icon: <IconStack2 size={19} aria-hidden="true" />,
      color: "violet",
      trend: null,
    },
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm:
          colorScheme === "dark"
            ? antdTheme.darkAlgorithm
            : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: "#0f9b8e",
          borderRadius: 14,
          fontFamily: "inherit",
        },
      }}
    >
      <div className="space-y-6 pb-8">
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 px-6 py-7 text-white shadow-lg shadow-slate-950/10 sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-4 -top-12 size-48 rounded-full border border-white/10" />
          <Flex
            align="center"
            justify="space-between"
            gap={24}
            wrap="wrap"
            className="relative"
          >
            <div className="max-w-2xl">
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white">
                <span className={`inline-block size-1.5 rounded-full ${activeExams.length > 0 ? "bg-emerald-400" : "bg-slate-400"}`} />
                {activeExams.length > 0
                  ? `${activeExams.length} ujian sedang berlangsung`
                  : "Sistem CBT siaga operasional"}
              </span>
              <Typography.Title
                level={1}
                className="!mb-2 !text-2xl !font-semibold !tracking-tight !text-white sm:!text-3xl"
              >
                Pusat Kendali Administrasi
              </Typography.Title>
              <Typography.Text className="text-sm !text-slate-300">
                Selamat datang kembali, {user.namaLengkap}. Ringkasan ujian dan
                aktivitas kampus ada di sini.
              </Typography.Text>
            </div>
            <Space wrap size="middle">
              {canAccess("/admin/ujian") && (
                <Link to="/admin/ujian">
                  <Button
                    type="primary"
                    size="large"
                    icon={<IconPlus size={17} aria-hidden="true" />}
                  >
                    Buat ujian
                  </Button>
                </Link>
              )}
              {canAccess("/admin/peserta/online") && (
                <Link to="/admin/peserta/online">
                  <Button
                    size="large"
                    ghost
                    icon={<IconRadio size={17} aria-hidden="true" />}
                    style={{ color: "white", borderColor: "rgba(255,255,255,.5)" }}
                  >
                    Pantau peserta
                  </Button>
                </Link>
              )}
            </Space>
          </Flex>
        </section>

        <Row gutter={[16, 16]}>
          {kpis.map((kpi) => (
            <Col key={kpi.label} xs={24} sm={12} xl={6}>
              <KpiCard
                label={kpi.label}
                value={formatNumber(kpi.value)}
                subtitle={kpi.subtitle}
                icon={kpi.icon}
                color={kpi.color}
                trend={kpi.trend}
              />
            </Col>
          ))}
        </Row>

        <Row gutter={[20, 20]}>
          <Col xs={24} xl={16}>
            <div className="flex flex-col gap-5">
              <Card className="shadow-sm">
                <Flex justify="space-between" align="center" gap={16} wrap="wrap">
                  <SectionHeading
                    icon={<IconActivity size={19} aria-hidden="true" />}
                    title="Pengawasan ujian live"
                    subtitle="Kondisi ujian yang sedang berlangsung"
                    color="teal"
                  />
                  {activeExams.length > 0 && (
                    <Badge
                      status="processing"
                      text={`${activeExams.length} berlangsung`}
                    />
                  )}
                </Flex>
                <Divider className="my-5" />
                {activeExams.length === 0 ? (
                  <Alert
                    type="success"
                    showIcon
                    icon={<IconCircleCheck size={18} aria-hidden="true" />}
                    message="Tidak ada ujian aktif saat ini"
                    description={
                      <Flex vertical align="flex-start" gap={12}>
                        <span>
                          Sistem siaga. Kamu dapat melihat jadwal mendatang atau
                          menyiapkan bank soal.
                        </span>
                        {canAccess("/admin/ujian") && (
                          <Link to="/admin/ujian">
                            <Button size="small">Lihat jadwal ujian</Button>
                          </Link>
                        )}
                      </Flex>
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    {activeExams.map((exam) => (
                      <Card key={exam.id} size="small" className="bg-slate-50/70 dark:bg-slate-900/40">
                        <Flex justify="space-between" align="center" gap={16} wrap="wrap">
                          <Flex align="center" gap={12}>
                            <IconTile color="teal">
                              <IconRadio size={19} aria-hidden="true" />
                            </IconTile>
                            <div>
                              <Typography.Text strong>{exam.nama}</Typography.Text>
                              <Typography.Text type="secondary" className="mt-1 block text-xs">
                                <IconClock size={13} aria-hidden="true" className="mr-1 inline align-[-2px]" />
                                <span suppressHydrationWarning>
                                  Berakhir pukul{" "}
                                  {new Date(exam.endAt).toLocaleTimeString("id-ID", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    timeZone: "Asia/Jakarta",
                                  })}{" "}
                                  WIB
                                </span>
                              </Typography.Text>
                            </div>
                          </Flex>
                          {canAccess("/admin/peserta/online") && (
                            <Link to="/admin/peserta/online">
                              <Button
                                size="small"
                                type="default"
                                icon={<IconArrowRight size={14} aria-hidden="true" />}
                              >
                                Pantau peserta
                              </Button>
                            </Link>
                          )}
                        </Flex>
                      </Card>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="shadow-sm">
                <Flex justify="space-between" align="center" className="mb-5">
                  <SectionHeading
                    icon={<IconArrowUpRight size={19} aria-hidden="true" />}
                    title="Aksi cepat"
                    subtitle="Pintasan ke pekerjaan administrasi"
                    color="blue"
                  />
                </Flex>
                {hasQuickActions ? (
                  <Row gutter={[12, 12]}>
                    {canAccess("/admin/ujian") && (
                      <Col xs={12} sm={6}>
                        <ShortcutCard title="Buat ujian" desc="Atur jadwal dan durasi" icon={<IconPlus size={19} aria-hidden="true" />} color="teal" href="/admin/ujian" />
                      </Col>
                    )}
                    {canAccess("/admin/ujian") && (
                      <Col xs={12} sm={6}>
                        <ShortcutCard title="Rilis token" desc="Kelola token sesi" icon={<IconKey size={19} aria-hidden="true" />} color="orange" href="/admin/ujian" />
                      </Col>
                    )}
                    {canAccess("/admin/modul") && (
                      <Col xs={12} sm={6}>
                        <ShortcutCard title="Bank soal" desc="Kelola dan impor soal" icon={<IconBooks size={19} aria-hidden="true" />} color="blue" href="/admin/modul" />
                      </Col>
                    )}
                    {canAccess("/admin/peserta/kartu") && (
                      <Col xs={12} sm={6}>
                        <ShortcutCard title="Kartu peserta" desc="Cetak atau ekspor kartu" icon={<IconUsersGroup size={19} aria-hidden="true" />} color="violet" href="/admin/peserta/kartu" />
                      </Col>
                    )}
                  </Row>
                ) : (
                  <Empty description="Tidak ada aksi cepat yang tersedia untuk peran ini." />
                )}
              </Card>
            </div>
          </Col>

          <Col xs={24} xl={8}>
            <div className="flex flex-col gap-5">
              <Card className="shadow-sm">
                <SectionHeading
                  icon={<IconAlertCircle size={19} aria-hidden="true" />}
                  title="Perlu perhatian"
                  subtitle="Tugas yang menunggu tindak lanjut"
                  color="orange"
                />
                <Divider className="my-5" />
                {finishedExams.length > 0 && canAccess("/admin/evaluasi") ? (
                  <Alert
                    type="warning"
                    showIcon
                    icon={<IconShieldCheck size={18} aria-hidden="true" />}
                    message={`${finishedExams.length} ujian selesai`}
                    description={
                      <Flex vertical align="flex-start" gap={12}>
                        <span>Ujian selesai dan siap dievaluasi atau direkap.</span>
                        <Link to="/admin/evaluasi">
                          <Button size="small" type="primary" ghost>
                            Proses evaluasi
                          </Button>
                        </Link>
                      </Flex>
                    }
                  />
                ) : (
                  <Alert
                    type="success"
                    showIcon
                    icon={<IconCircleCheck size={18} aria-hidden="true" />}
                    message="Semua antrean selesai"
                    description="Tidak ada tugas evaluasi tertunda saat ini."
                  />
                )}
              </Card>

              {upcomingExams.length > 0 && (
                <Card className="shadow-sm">
                  <SectionHeading
                    icon={<IconCalendarClock size={19} aria-hidden="true" />}
                    title="Ujian mendatang"
                    subtitle={`${upcomingExamCount} terjadwal`}
                    color="blue"
                  />
                  <Divider className="my-5" />
                  <div className="space-y-3">
                    {upcomingExams.map((exam) => (
                      <div key={exam.id} className="rounded-xl border border-slate-200/80 p-3 dark:border-slate-700">
                        <Typography.Text strong className="block leading-snug">
                          {exam.nama}
                        </Typography.Text>
                        <Typography.Text type="secondary" className="mt-2 block text-xs">
                          <IconClock size={13} aria-hidden="true" className="mr-1 inline align-[-2px]" />
                          <span suppressHydrationWarning>
                            {new Date(exam.beginAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              timeZone: "Asia/Jakarta",
                            })}{" "}
                            ·{" "}
                            {new Date(exam.beginAt).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                              timeZone: "Asia/Jakarta",
                            })}{" "}
                            WIB
                          </span>
                        </Typography.Text>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </Col>
        </Row>
      </div>
    </ConfigProvider>
  );
}

function IconTile({ color, children }: { color: string; children: ReactNode }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    teal: "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
    orange: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
    violet: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  };

  return (
    <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${colors[color] ?? colors.blue}`}>
      {children}
    </span>
  );
}

function KpiCard({
  label,
  value,
  subtitle,
  icon,
  color,
  trend,
}: {
  label: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  color: string;
  trend: string | null;
}) {
  return (
    <Card className="h-full shadow-sm" styles={{ body: { padding: 18 } }}>
      <Flex justify="space-between" align="flex-start" gap={12}>
        <Statistic
          title={<span className="text-xs font-semibold uppercase tracking-wide">{label}</span>}
          value={value}
          valueStyle={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.04em" }}
        />
        <IconTile color={color}>{icon}</IconTile>
      </Flex>
      <Flex justify="space-between" align="center" gap={8} className="mt-2">
        <Typography.Text type="secondary" className="text-xs">
          {subtitle}
        </Typography.Text>
        {trend && (
          <Tag bordered={false} color="success" className="m-0 rounded-full">
            <IconTrendingUp size={12} aria-hidden="true" className="mr-1 inline align-[-2px]" />
            {trend}
          </Tag>
        )}
      </Flex>
    </Card>
  );
}

function SectionHeading({
  icon,
  title,
  subtitle,
  color,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  color: string;
}) {
  return (
    <Flex align="center" gap={12}>
      <IconTile color={color}>{icon}</IconTile>
      <div>
        <Typography.Title level={4} className="!mb-0 !text-base">
          {title}
        </Typography.Title>
        <Typography.Text type="secondary" className="text-xs">
          {subtitle}
        </Typography.Text>
      </div>
    </Flex>
  );
}

function ShortcutCard({
  title,
  desc,
  icon,
  color,
  href,
}: {
  title: string;
  desc: string;
  icon: ReactNode;
  color: string;
  href: "/admin/ujian" | "/admin/modul" | "/admin/peserta/kartu";
}) {
  return (
    <Link to={href} className="block h-full rounded-xl text-inherit no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600">
      <Card hoverable size="small" className="h-full" styles={{ body: { padding: 14 } }}>
        <Flex vertical gap={12}>
          <IconTile color={color}>{icon}</IconTile>
          <div>
            <Typography.Text strong className="block text-sm">
              {title}
            </Typography.Text>
            <Typography.Text type="secondary" className="text-xs">
              {desc}
            </Typography.Text>
          </div>
        </Flex>
      </Card>
    </Link>
  );
}

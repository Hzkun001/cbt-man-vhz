import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react";
import { configRepo } from "@/lib/cbt/repos";
import { AdminPage, AdminPageHeader } from "@/components/cbt/AdminPage";
import { Search, ExternalLink, BookOpen, ChevronRight, HelpCircle, FileText, Settings, ShieldAlert, Users, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin/panduan")({
  component: PanduanPage,
});

const tocSections = [
  { id: "alur-kerja", label: "Alur Kerja Ujian" },
  { id: "bank-soal", label: "1. Bank Soal" },
  { id: "paket-ujian", label: "2. Paket Ujian" },
  { id: "jadwal-token", label: "3. Jadwal & Token" },
  { id: "pantau-live", label: "4. Pantau Live" },
  { id: "evaluasi", label: "5. Evaluasi & Hasil" },
  { id: "import", label: "Import Soal" },
  { id: "peserta", label: "Peserta & Grup" },
  { id: "backup", label: "Backup & Restore" },
  { id: "faq", label: "FAQ & Masalah" },
];

function PanduanPage() {
  const cfg = configRepo.get();
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState("alur-kerja");
  const contentRef = useRef<HTMLDivElement>(null);

  // Intersection observer for TOC highlight
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const headings = el.querySelectorAll("[data-section]");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.getAttribute("data-section") ?? "");
          }
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, []);

  const filteredSections = useMemo(() => {
    if (!search.trim()) return tocSections;
    const q = search.toLowerCase();
    return tocSections.filter(s => s.label.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
  }, [search]);

  return (
    <AdminPage className="neo-ready max-w-6xl mx-auto space-y-8 pb-28">
      <AdminPageHeader
        title="Panduan Penggunaan"
        description={`Dokumentasi operasional ${cfg.appName} — panduan alur kerja, pengelolaan ujian, dan pemecahan masalah.`}
      />

      {/* Quick Search & Shortcut Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-950 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sleek">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Cari dalam panduan (misal: token, import, reset)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 shrink-0 text-xs">
          <Link to="/admin/modul" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 transition-colors">
            <Layers className="h-3.5 w-3.5" /> Bank Soal
          </Link>
          <Link to="/admin/peserta/online" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 transition-colors">
            <BookOpen className="h-3.5 w-3.5" /> Monitoring
          </Link>
          <Link to="/admin/evaluasi" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 transition-colors">
            <FileText className="h-3.5 w-3.5" /> Evaluasi
          </Link>
        </div>
      </div>

      <div className="flex gap-8 items-start">
        {/* Main Content Area */}
        <article
          ref={contentRef}
          className="flex-1 min-w-0 text-sm text-slate-700 dark:text-slate-300 leading-relaxed divide-y divide-slate-200/80 dark:divide-slate-800/80 [&>section]:py-10 first:[&>section]:pt-0"
        >
          {/* Alur Kerja Overview */}
          <section data-section="alur-kerja">
            <SectionTitle id="alur-kerja">Alur Kerja Ujian</SectionTitle>
            <p className="mb-6 text-slate-600 dark:text-slate-400">
              Pelaksanaan ujian mengikuti 5 tahapan utama berurutan. Setiap tahap dapat diakses langsung melalui pintasan menu terkait.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs font-medium">
              {[
                { step: "1", label: "Buat Soal", sub: "Bank Soal", to: "/admin/modul" },
                { step: "2", label: "Susun Ujian", sub: "Paket Ujian", to: "/admin/ujian" },
                { step: "3", label: "Jadwalkan", sub: "Token & Waktu", to: "/admin/ujian" },
                { step: "4", label: "Pantau", sub: "Monitoring Live", to: "/admin/peserta/online" },
                { step: "5", label: "Evaluasi", sub: "Grading & Hasil", to: "/admin/evaluasi" },
              ].map((s) => (
                <Link key={s.step} to={s.to} className="group bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/50 transition-all">
                  <div className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold mb-2 group-hover:bg-primary group-hover:text-white transition-colors">
                    {s.step}
                  </div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">{s.label}</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">{s.sub}</div>
                </Link>
              ))}
            </div>
          </section>

          {/* 1. Bank Soal */}
          <section data-section="bank-soal">
            <SectionTitle id="bank-soal">1. Membuat Bank Soal</SectionTitle>
            <p className="mb-4 text-slate-600 dark:text-slate-400">
              Bank Soal menggunakan hierarki <Strong>Modul → Topik → Soal</Strong>. Modul berfungsi sebagai wadah utama (mata kuliah), Topik sebagai bab, dan Soal sebagai butir pertanyaan.
            </p>
            <StepList steps={[
              <>Buka <MenuRef to="/admin/modul">Bank Soal</MenuRef>. Klik <Strong>+ Buat Modul</Strong> dan masukkan nama modul.</>,
              <>Buka modul → buat <Strong>Topik</Strong> untuk pengelompokan materi bab.</>,
              <>Buka topik → klik <Strong>+ Tambah Soal</Strong>. Masukkan pertanyaan, opsi jawaban, dan bobot nilai.</>,
              <>Tipe soal yang didukung: <Strong>Pilihan Ganda</Strong>, <Strong>PG Kompleks (Multi)</Strong>, dan <Strong>Essay</Strong>.</>,
            ]} />
            <Tip>
              Untuk menambahkan soal sekaligus dalam jumlah banyak, manfaatkan fitur <Strong>Import Excel/Word</Strong>.
            </Tip>
          </section>

          {/* 2. Paket Ujian */}
          <section data-section="paket-ujian">
            <SectionTitle id="paket-ujian">2. Menyusun Paket Ujian</SectionTitle>
            <p className="mb-4 text-slate-600 dark:text-slate-400">
              Paket Ujian menghubungkan soal dari Bank Soal dengan durasi pengerjaan dan daftar peserta.
            </p>
            <StepList steps={[
              <>Buka <MenuRef to="/admin/ujian">Paket Ujian</MenuRef> → klik <Strong>+ Buat Ujian</Strong>.</>,
              <>Tentukan nama ujian, durasi pengerjaan (menit), dan petunjuk ujian.</>,
              <>Pilih soal yang akan diujikan dari bank soal yang tersedia.</>,
              <>Atur metode pengacakan soal: <Strong>Tetap</Strong> atau <Strong>Acak Per Peserta</Strong>.</>,
              <>Hubungkan peserta atau grup mahasiswa yang berhak mengikuti ujian.</>,
            ]} />
          </section>

          {/* 3. Jadwal & Token */}
          <section data-section="jadwal-token">
            <SectionTitle id="jadwal-token">3. Jadwal & Token Akses</SectionTitle>
            <p className="mb-4 text-slate-600 dark:text-slate-400">
              Atur jendela waktu akses dan aktifkan token sebagai pengaman akses masuk peserta.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-950 shadow-sm space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Rentang Waktu</div>
                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li>• <Strong>Waktu Mulai</Strong>: Akses sesi pengerjaan dibuka.</li>
                  <li>• <Strong>Waktu Selesai</Strong>: Batas akhir peserta memulai ujian.</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-950 shadow-sm space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Token Akses</div>
                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li>• Kode acak yang wajib diisi peserta sebelum mulai.</li>
                  <li>• Bagikan token secara langsung di ruang ujian.</li>
                </ul>
              </div>
            </div>
            <Warning>
              Pastikan jam pada server dan perangkat peserta telah terkalibrasi dengan benar agar tidak menghambat akses masuk.
            </Warning>
          </section>

          {/* 4. Pantau Live */}
          <section data-section="pantau-live">
            <SectionTitle id="pantau-live">4. Memantau Ujian Secara Real-Time</SectionTitle>
            <p className="mb-4 text-slate-600 dark:text-slate-400">
              Pantau status pengerjaan peserta secara langsung melalui <MenuRef to="/admin/peserta/online">Monitoring Live</MenuRef>.
            </p>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden mb-4 shadow-sm">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 text-left font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="px-5 py-3">Fitur Monitoring</th>
                    <th className="px-5 py-3">Fungsi Utama</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-950">
                  <tr><td className="px-5 py-3 font-bold text-slate-900 dark:text-slate-100">Status Online & Progress</td><td className="px-5 py-3">Melihat keaktifan koneksi dan jumlah soal yang telah dijawab.</td></tr>
                  <tr><td className="px-5 py-3 font-bold text-slate-900 dark:text-slate-100">Deteksi Pelanggaran</td><td className="px-5 py-3">Mencatat indikasi kecurangan (pindah tab / keluar layar).</td></tr>
                  <tr><td className="px-5 py-3 font-bold text-slate-900 dark:text-slate-100">Aksi Pengawas</td><td className="px-5 py-3">Fitur paksa kumpulkan, tambah waktu pengerjaan, atau riset insiden.</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 5. Evaluasi */}
          <section data-section="evaluasi">
            <SectionTitle id="evaluasi">5. Evaluasi Essay & Rekap Hasil</SectionTitle>
            <p className="mb-4 text-slate-600 dark:text-slate-400">
              Soal pilihan ganda dinilai otomatis. Penilaian jawaban essay dilakukan melalui <MenuRef to="/admin/evaluasi">Evaluasi Essay</MenuRef>.
            </p>
            <StepList steps={[
              <>Buka <MenuRef to="/admin/evaluasi">Evaluasi Essay</MenuRef> untuk melihat daftar ujian yang membutuhkan penilaian.</>,
              <>Pilih peserta dan berikan skor sesuai bobot maksimal soal.</>,
              <>Manfaatkan fitur <Strong>Beri 0 untuk Kosong</Strong> untuk mempercepat penilaian jawaban kosong.</>,
              <>Setelah penilaian selesai, rekap nilai dapat diunduh melalui laporan hasil.</>,
            ]} />
          </section>

          {/* Import */}
          <section data-section="import">
            <SectionTitle id="import">Import Soal dari Excel / Word</SectionTitle>
            <p className="mb-4 text-slate-600 dark:text-slate-400">
              Gunakan fitur impor berkas untuk memasukkan puluhan soal secara instan di <MenuRef to="/admin/modul">Bank Soal</MenuRef>.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-950 shadow-sm space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Format Excel (.xlsx)</div>
                <p className="text-xs text-slate-600 dark:text-slate-400">Gunakan template kolom standar: Pertanyaan, Pilihan A–E, Kunci, dan Bobot.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-950 shadow-sm space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Format Word (.docx)</div>
                <p className="text-xs text-slate-600 dark:text-slate-400">Gunakan format penomoran soal dan pilihan standar dokumen Word.</p>
              </div>
            </div>
          </section>

          {/* Peserta & Grup */}
          <section data-section="peserta">
            <SectionTitle id="peserta">Manajemen Peserta & Hak Akses</SectionTitle>
            <p className="mb-4 text-slate-600 dark:text-slate-400">
              Kelola data peserta ujian dan pengelompokan akun di <MenuRef to="/admin/users">Pengguna & Role</MenuRef>.
            </p>
            <StepList steps={[
              <>Daftarkan akun peserta secara manual atau impor masal dari file Excel.</>,
              <>Gunakan menu <MenuRef to="/admin/users/roles">Hak Akses Role</MenuRef> untuk mengatur wewenang Admin Jurusan dan Evaluator.</>,
            ]} />
          </section>

          {/* Backup */}
          <section data-section="backup">
            <SectionTitle id="backup">Pencadangan & Pemulihan Data</SectionTitle>
            <p className="mb-4 text-slate-600 dark:text-slate-400">
              Amankan pangkalan data aplikasi secara berkala melalui menu <MenuRef to="/admin/tools">Alat Sistem</MenuRef>.
            </p>
          </section>

          {/* FAQ */}
          <section data-section="faq">
            <SectionTitle id="faq">FAQ & Pemecahan Masalah</SectionTitle>

            <div className="space-y-4">
              <FaqItem q="Peserta tidak bisa masuk menggunakan Token">
                Pastikan token diketik persis sesuai huruf besar/kecil. Periksa juga apakah waktu ujian (`beginAt` & `endAt`) sedang aktif di server.
              </FaqItem>

              <FaqItem q="Jawaban peserta tidak muncul di Evaluasi">
                Jawaban essay hanya akan muncul jika sesi ujian peserta telah berakhir (`selesai`). Jika sesi masih berjalan, lakukan paksa submit dari menu Monitoring Live.
              </FaqItem>

              <FaqItem q="Bagaimana mereset password akun peserta?">
                Buka menu <MenuRef to="/admin/users">Pengguna</MenuRef>, pilih peserta yang bersangkutan, lalu klik tombol ubah password.
              </FaqItem>
            </div>
          </section>

          {/* Footer */}
          <div className="text-xs text-slate-400 dark:text-slate-500 pt-6 pb-8 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <p>{cfg.appName} v2.4.0-proctoring — Dokumentasi Resmi Sistem CBT.</p>
            <Link to="/admin/pengaturan" className="font-bold text-primary hover:underline">
              Pengaturan Sistem →
            </Link>
          </div>
        </article>

        {/* Floating Table of Contents Sidebar */}
        <nav aria-label="Daftar Isi Panduan" className="hidden lg:block w-60 shrink-0 sticky top-24 self-start bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sleek rounded-2xl p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-2">
            Daftar Isi
          </div>
          <ul className="space-y-1">
            {filteredSections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  aria-current={activeId === s.id ? "true" : undefined}
                  className={`block px-3 py-2 text-xs rounded-xl font-medium transition-all ${
                    activeId === s.id
                      ? "bg-primary text-primary-foreground font-bold shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                  }`}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </AdminPage>
  );
}

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 scroll-mt-24 tracking-tight"
    >
      {children}
    </h2>
  );
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-bold text-slate-900 dark:text-slate-100">{children}</strong>;
}

function MenuRef({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link 
      to={to} 
      className="inline-flex items-center gap-1 text-xs font-bold bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded-lg border border-slate-200/80 dark:border-slate-800 hover:border-primary hover:text-primary transition-all"
    >
      {children} <ExternalLink className="h-3 w-3" />
    </Link>
  );
}

function StepList({ steps }: { steps: React.ReactNode[] }) {
  return (
    <ol className="space-y-3 mb-6">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3 text-sm">
          <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold mt-0.5 shadow-sm">
            {i + 1}
          </span>
          <span className="flex-1 text-slate-700 dark:text-slate-300">{step}</span>
        </li>
      ))}
    </ol>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div role="note" className="flex gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300 mb-6 shadow-sm">
      <span className="shrink-0 font-bold text-emerald-600 uppercase tracking-wider">TIPS</span>
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="flex gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 mb-6 shadow-sm">
      <span className="shrink-0 font-bold text-amber-600 uppercase tracking-wider">PERHATIAN</span>
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}

function FaqItem({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm space-y-1.5">
      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <HelpCircle className="h-4 w-4 text-primary shrink-0" /> {q}
      </h3>
      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-6">{children}</p>
    </div>
  );
}

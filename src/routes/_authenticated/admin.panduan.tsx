import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react";
import { configRepo } from "@/lib/cbt/repos";
import { AdminPage, AdminPageHeader } from "@/components/cbt/AdminPage";
import { 
  Search, 
  ExternalLink, 
  BookOpen, 
  ChevronRight, 
  ChevronLeft,
  HelpCircle, 
  FileText, 
  Layers, 
  Lightbulb, 
  AlertTriangle,
  Info,
  ShieldAlert,
  Download,
  Users,
  CheckCircle2,
  Folder,
  ArrowRight
} from "lucide-react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin/panduan")({
  component: PanduanPage,
});

/* ─── 1. DOCS REGISTRY (Docusaurus Structure) ─── */
export interface DocArticle {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  description: string;
  content: (onNavigate: (id: string) => void) => React.ReactNode;
  toc: { id: string; label: string }[];
}

export interface DocCategory {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  articles: { id: string; title: string }[];
}

const docCategories: DocCategory[] = [
  {
    id: "memulai",
    label: "1. Memulai Cepat",
    icon: BookOpen,
    articles: [
      { id: "alur-kerja", title: "Overview Alur Kerja Ujian" },
    ]
  },
  {
    id: "kelola-ujian",
    label: "2. Manajemen Bank Soal & Ujian",
    icon: Layers,
    articles: [
      { id: "bank-soal", title: "Membuat Bank Soal (Modul & Topik)" },
      { id: "paket-ujian", title: "Menyusun Paket Ujian & Acak" },
      { id: "jadwal-token", title: "Jadwal Waktu & Token Akses" },
    ]
  },
  {
    id: "pengawasan",
    label: "3. Pengawasan & Evaluasi",
    icon: ShieldAlert,
    articles: [
      { id: "pantau-live", title: "Monitoring Live & Proctoring" },
      { id: "evaluasi-essay", title: "Evaluasi Essay & Rekap Nilai" },
    ]
  },
  {
    id: "impor-sistem",
    label: "4. Impor & Pemeliharaan",
    icon: Download,
    articles: [
      { id: "import-soal", title: "Impor Soal Excel & Word" },
      { id: "peserta-role", title: "Manajemen Peserta & Role RBAC" },
      { id: "backup-tools", title: "Pencadangan, Restore & Reset" },
    ]
  },
  {
    id: "bantuan",
    label: "5. Pusat Bantuan",
    icon: HelpCircle,
    articles: [
      { id: "faq-troubleshooting", title: "FAQ & Pemecahan Masalah" },
    ]
  }
];

const articlesMap: Record<string, DocArticle> = {
  "alur-kerja": {
    id: "alur-kerja",
    title: "Overview Alur Kerja Ujian",
    category: "memulai",
    categoryLabel: "Memulai Cepat",
    description: "Panduan ringkas 5 tahapan utama pelaksanaan ujian CBT dari pembuatan soal hingga evaluasi.",
    toc: [
      { id: "tahapan", label: "5 Tahapan Ujian" },
      { id: "akses-cepat", label: "Pintasan Akses" },
    ],
    content: (onNavigate) => (
      <div className="space-y-8">
        <section id="tahapan" data-heading="tahapan" className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">5 Tahapan Pelaksanaan Ujian</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Seluruh operasional ujian pada sistem CBT mengikuti 5 langkah berurutan yang saling terhubung:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
            {[
              { step: "1", label: "Buat Soal", sub: "Bank Soal", target: "bank-soal" },
              { step: "2", label: "Susun Ujian", sub: "Paket Ujian", target: "paket-ujian" },
              { step: "3", label: "Jadwalkan", sub: "Token & Waktu", target: "jadwal-token" },
              { step: "4", label: "Pantau", sub: "Monitoring Live", target: "pantau-live" },
              { step: "5", label: "Evaluasi", sub: "Grading & Hasil", target: "evaluasi-essay" },
            ].map((s) => (
              <button 
                key={s.step} 
                onClick={() => onNavigate(s.target)} 
                className="group bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/50 hover:shadow-md transition-all text-center cursor-pointer"
              >
                <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold mb-2 group-hover:bg-primary group-hover:text-white transition-colors">
                  {s.step}
                </div>
                <div className="font-bold text-slate-900 dark:text-slate-100 text-xs group-hover:text-primary transition-colors">{s.label}</div>
                <div className="text-slate-500 text-[10px] mt-0.5">{s.sub}</div>
              </button>
            ))}
          </div>
        </section>

        <DocCallout type="tip" title="Tips Pengelola">
          Anda dapat menavigasi setiap bab dokumen menggunakan panel kategori di sebelah kiri atau menekan tombol navigasi di bagian bawah halaman ini.
        </DocCallout>

        <section id="akses-cepat" data-heading="akses-cepat" className="space-y-4 pt-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Pintasan Halaman Utama</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Akses langsung halaman kerja aplikasi melalui pintasan resmi di bawah:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <DocMenuLink to="/admin/modul">Buka Bank Soal →</DocMenuLink>
            <DocMenuLink to="/admin/peserta/online">Buka Monitoring →</DocMenuLink>
            <DocMenuLink to="/admin/evaluasi">Buka Evaluasi Essay →</DocMenuLink>
          </div>
        </section>
      </div>
    )
  },

  "bank-soal": {
    id: "bank-soal",
    title: "Membuat Bank Soal (Modul & Topik)",
    category: "kelola-ujian",
    categoryLabel: "Manajemen Bank Soal & Ujian",
    description: "Mengelola struktur bank soal menggunakan pengelompokan Modul dan Topik.",
    toc: [
      { id: "struktur-hierarki", label: "Struktur Hierarki" },
      { id: "langkah-pembuatan", label: "Langkah Pembuatan" },
      { id: "tipe-soal", label: "Tipe Soal yang Didukung" },
    ],
    content: () => (
      <div className="space-y-8">
        <section id="struktur-hierarki" data-heading="struktur-hierarki" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Struktur Hierarki Soal</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Bank soal menggunakan susunan berjenjang: <Strong>Modul → Topik → Soal</Strong>.
          </p>
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono space-y-1.5">
            <div className="text-primary font-bold">📦 Modul (Mata Kuliah / Subjek Utama)</div>
            <div className="pl-4 text-slate-600 dark:text-slate-400">└─ 📂 Topik 1 (Bab / Pokok Bahasan)</div>
            <div className="pl-8 text-slate-500">├─ ❓ Soal #1 (Pilihan Ganda)</div>
            <div className="pl-8 text-slate-500">└─ ❓ Soal #2 (Essay)</div>
          </div>
        </section>

        <section id="langkah-pembuatan" data-heading="langkah-pembuatan" className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Langkah Pembuatan</h2>
          <StepList steps={[
            <>Buka <DocMenuLink to="/admin/modul">Bank Soal</DocMenuLink> di menu navigasi utama.</>,
            <>Klik tombol <Strong>+ Buat Modul</Strong> dan masukkan nama mata kuliah.</>,
            <>Buka modul yang telah dibuat, lalu tambahkan <Strong>Topik</Strong> baru untuk mengelompokkan bab.</>,
            <>Klik topik → pilih <Strong>+ Tambah Soal</Strong> untuk menginput teks pertanyaan, opsi jawaban, dan kunci.</>,
          ]} />
        </section>

        <section id="tipe-soal" data-heading="tipe-soal" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Tipe Soal yang Didukung</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm space-y-1">
              <span className="font-bold text-slate-900 dark:text-slate-100 block">Pilihan Ganda (PG)</span>
              <span className="text-slate-500">Satu jawaban benar. Koreksi otomatis.</span>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm space-y-1">
              <span className="font-bold text-slate-900 dark:text-slate-100 block">PG Kompleks (Multi)</span>
              <span className="text-slate-500">Beberapa jawaban benar. Koreksi otomatis.</span>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm space-y-1">
              <span className="font-bold text-slate-900 dark:text-slate-100 block">Essay Uraian</span>
              <span className="text-slate-500">Jawaban teks bebas. Penilaian manual admin/dosen.</span>
            </div>
          </div>
        </section>
      </div>
    )
  },

  "paket-ujian": {
    id: "paket-ujian",
    title: "Menyusun Paket Ujian & Acak",
    category: "kelola-ujian",
    categoryLabel: "Manajemen Bank Soal & Ujian",
    description: "Menyusun lembar ujian, durasi menit, dan pengacak butir soal.",
    toc: [
      { id: "konfigurasi-paket", label: "Konfigurasi Paket" },
      { id: "metode-acak", label: "Metode Pengacakan" },
    ],
    content: () => (
      <div className="space-y-8">
        <section id="konfigurasi-paket" data-heading="konfigurasi-paket" className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Konfigurasi Ujian Baru</h2>
          <StepList steps={[
            <>Buka <DocMenuLink to="/admin/ujian">Paket Ujian</DocMenuLink> → klik <Strong>+ Buat Ujian Baru</Strong>.</>,
            <>Isi judul ujian, deskripsi/petunjuk, dan tentukan durasi maksimal pengerjaan (dalam menit).</>,
            <>Pilih butir-butir soal yang diambil dari bank soal.</>,
            <>Hubungkan ujian ke peserta tertentu atau seluruh <Strong>Grup Kelas</Strong>.</>,
          ]} />
        </section>

        <DocCallout type="note" title="Pengacakan Soal">
          Pengacakan nomor soal dihitung secara unik per sesi pengerjaan peserta, sehingga urutan soal peserta A tidak akan sama dengan peserta B.
        </DocCallout>
      </div>
    )
  },

  "jadwal-token": {
    id: "jadwal-token",
    title: "Jadwal Waktu & Token Akses",
    category: "kelola-ujian",
    categoryLabel: "Manajemen Bank Soal & Ujian",
    description: "Pengaturan jendela waktu ujian dan perlindungan kode akses token.",
    toc: [
      { id: "rentang-waktu", label: "Rentang Waktu Akses" },
      { id: "keamanan-token", label: "Pengamanan Token" },
    ],
    content: () => (
      <div className="space-y-8">
        <section id="rentang-waktu" data-heading="rentang-waktu" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Rentang Waktu Akses</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Setiap ujian memiliki dua parameter jadwal utama:
          </p>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <li className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
              <Strong>Waktu Mulai (beginAt)</Strong>: Batas jam awal ketika peserta diizinkan menekan tombol "Mulai Ujian".
            </li>
            <li className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
              <Strong>Waktu Selesai (endAt)</Strong>: Batas jam penutupan ujian di mana sesi baru tidak lagi diperbolehkan.
            </li>
          </ul>
        </section>

        <DocCallout type="warning" title="Perhatian Kalibrasi Jam">
          Pastikan jam server terkalibrasi dengan WIB (Asia/Jakarta) agar peserta tidak terhalang masuk akibat selisih detik.
        </DocCallout>
      </div>
    )
  },

  "pantau-live": {
    id: "pantau-live",
    title: "Monitoring Live & Proctoring",
    category: "pengawasan",
    categoryLabel: "Pengawasan & Evaluasi",
    description: "Pengawasan sesi aktif, insiden pelanggaran, dan aksi pengawas.",
    toc: [
      { id: "fitur-pengawas", label: "Fitur Pengawasan" },
      { id: "aksi-interaktif", label: "Aksi Pengawas" },
    ],
    content: () => (
      <div className="space-y-8">
        <section id="fitur-pengawas" data-heading="fitur-pengawas" className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Fitur Dashboard Pengawas</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Buka menu <DocMenuLink to="/admin/peserta/online">Monitoring Live</DocMenuLink> saat ujian berlangsung.
          </p>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900 text-left font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Indikator</th>
                  <th className="p-3">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-950">
                <tr><td className="p-3 font-bold">Status Koneksi</td><td className="p-3">Indikator real-time keaktifan peserta.</td></tr>
                <tr><td className="p-3 font-bold">Hitung Pelanggaran</td><td className="p-3">Jumlah keluar dari aplikasi / pindah tab.</td></tr>
                <tr><td className="p-3 font-bold">Progress Sesi</td><td className="p-3">Persentase soal yang sudah dijawab.</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section id="aksi-interaktif" data-heading="aksi-interaktif" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Aksi Pengawas</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Pengawas dapat melakukan aksi langsung dari dasbor: <Strong>Paksa Kumpulkan</Strong>, <Strong>Tambah Waktu</Strong>, atau <Strong>Riset Insiden</Strong>.
          </p>
        </section>
      </div>
    )
  },

  "evaluasi-essay": {
    id: "evaluasi-essay",
    title: "Evaluasi Essay & Rekap Nilai",
    category: "pengawasan",
    categoryLabel: "Pengawasan & Evaluasi",
    description: "Proses pemberian nilai manual untuk jawaban essay dan kalkulasi akhir.",
    toc: [
      { id: "penilaian-manual", label: "Penilaian Manual" },
    ],
    content: () => (
      <div className="space-y-8">
        <section id="penilaian-manual" data-heading="penilaian-manual" className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Proses Evaluasi Essay</h2>
          <StepList steps={[
            <>Buka <DocMenuLink to="/admin/evaluasi">Evaluasi Essay</DocMenuLink>.</>,
            <>Pilih paket ujian dan nama peserta yang akan dinilai.</>,
            <>Beri nilai angka (0 sampai bobot maksimum) pada tiap jawaban essay.</>,
            <>Gunakan tombol <Strong>Beri 0 untuk Kosong</Strong> untuk otomatis menilai jawaban yang tidak diisi.</>,
            <>Klik <Strong>Simpan Nilai</Strong> untuk mengalkulasi nilai akhir total.</>,
          ]} />
        </section>
      </div>
    )
  },

  "import-soal": {
    id: "import-soal",
    title: "Impor Soal Excel & Word",
    category: "impor-sistem",
    categoryLabel: "Impor & Pemeliharaan",
    description: "Petunjuk format masal file Microsoft Excel dan Word.",
    toc: [
      { id: "format-excel", label: "Format Excel" },
      { id: "format-word", label: "Format Word" },
    ],
    content: () => (
      <div className="space-y-8">
        <section id="format-excel" data-heading="format-excel" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Impor Berkas Excel (.xlsx)</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Gunakan template resmi dari menu Bank Soal. Pastikan nama kolom sesuai: <Strong>Nomor, Pertanyaan, Pilihan A–E, Kunci, Bobot</Strong>.
          </p>
        </section>

        <section id="format-word" data-heading="format-word" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Impor Berkas Word (.docx)</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Gunakan penomoran standar angka (1., 2.) dan pilihan (A., B., C.). Kunci jawaban dapat ditandai dengan cetak tebal (*bold*).
          </p>
        </section>
      </div>
    )
  },

  "peserta-role": {
    id: "peserta-role",
    title: "Manajemen Peserta & Role RBAC",
    category: "impor-sistem",
    categoryLabel: "Impor & Pemeliharaan",
    description: "Pengelolaan akun mahasiswa, grup kelas, dan wewenang operator.",
    toc: [
      { id: "akun-peserta", label: "Akun Peserta" },
      { id: "matriks-rbac", label: "Matriks RBAC" },
    ],
    content: () => (
      <div className="space-y-8">
        <section id="akun-peserta" data-heading="akun-peserta" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Manajemen Akun Peserta</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Daftarkan peserta melalui <DocMenuLink to="/admin/users">Pengguna</DocMenuLink> atau impor masal dari file Excel.
          </p>
        </section>

        <section id="matriks-rbac" data-heading="matriks-rbac" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Hak Akses Role (RBAC)</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Atur wewenang khusus Admin Jurusan dan Evaluator di menu <DocMenuLink to="/admin/users/roles">Hak Akses Role</DocMenuLink>.
          </p>
        </section>
      </div>
    )
  },

  "backup-tools": {
    id: "backup-tools",
    title: "Pencadangan, Restore & Reset",
    category: "impor-sistem",
    categoryLabel: "Impor & Pemeliharaan",
    description: "Fitur keamanan pencadangan database JSON dan reset sistem.",
    toc: [
      { id: "pencadangan", label: "Pencadangan & Restore" },
    ],
    content: () => (
      <div className="space-y-8">
        <section id="pencadangan" data-heading="pencadangan" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Pencadangan & Pemulihan</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Buka menu <DocMenuLink to="/admin/tools">Alat Sistem</DocMenuLink> untuk mengunduh snapshot JSON atau memulihkan database.
          </p>
        </section>
      </div>
    )
  },

  "faq-troubleshooting": {
    id: "faq-troubleshooting",
    title: "FAQ & Pemecahan Masalah",
    category: "bantuan",
    categoryLabel: "Pusat Bantuan",
    description: "Jawaban pertanyaan umum dan pemecahan kendala teknis operasional.",
    toc: [
      { id: "pertanyaan-umum", label: "Pertanyaan Umum" },
    ],
    content: () => (
      <div className="space-y-8">
        <section id="pertanyaan-umum" data-heading="pertanyaan-umum" className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Pertanyaan yang Sering Diajukan</h2>
          
          <div className="space-y-3">
            <FaqAccordion q="Peserta tidak bisa masuk menggunakan Token">
              Pastikan token diketik persis sesuai huruf besar/kecil. Periksa juga apakah waktu ujian (`beginAt` & `endAt`) sedang aktif di server.
            </FaqAccordion>

            <FaqAccordion q="Jawaban peserta tidak muncul di Evaluasi">
              Jawaban essay hanya akan muncul jika sesi ujian peserta telah berakhir (`selesai`). Jika sesi masih berjalan, lakukan paksa submit dari menu Monitoring Live.
            </FaqAccordion>

            <FaqAccordion q="Bagaimana mereset password akun peserta?">
              Buka menu <DocMenuLink to="/admin/users">Pengguna</DocMenuLink>, pilih peserta yang bersangkutan, lalu klik tombol ubah password.
            </FaqAccordion>

            <FaqAccordion q="Soal atau Gambar tidak muncul di layar peserta">
              Pastikan gambar di-upload menggunakan format WebP/PNG/JPG standar. Jika menggunakan server lokal, pastikan folder media dapat diakses publik.
            </FaqAccordion>
          </div>
        </section>
      </div>
    )
  }
};

/* ─── 2. MAIN DOCUSAURUS ENGINE PAGE COMPONENT ─── */
function PanduanPage() {
  const cfg = configRepo.get();
  const [activeDocId, setActiveDocId] = useState("alur-kerja");
  const [search, setSearch] = useState("");
  const [activeHeadingId, setActiveHeadingId] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  const activeDoc = useMemo(() => {
    return articlesMap[activeDocId] || articlesMap["alur-kerja"];
  }, [activeDocId]);

  // Order array for prev/next pagination
  const allArticlesList = useMemo(() => {
    const list: { id: string; title: string }[] = [];
    docCategories.forEach((cat) => {
      cat.articles.forEach((art) => {
        list.push(art);
      });
    });
    return list;
  }, []);

  const { prevDoc, nextDoc } = useMemo(() => {
    const currentIndex = allArticlesList.findIndex((a) => a.id === activeDocId);
    return {
      prevDoc: currentIndex > 0 ? allArticlesList[currentIndex - 1] : null,
      nextDoc: currentIndex < allArticlesList.length - 1 ? allArticlesList[currentIndex + 1] : null,
    };
  }, [activeDocId, allArticlesList]);

  // Scrollspy observer for in-page TOC
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const headings = el.querySelectorAll("[data-heading]");
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveHeadingId(entry.target.getAttribute("data-heading") ?? "");
          }
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [activeDocId]);

  function handleNavigate(docId: string) {
    setActiveDocId(docId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return docCategories;
    const q = search.toLowerCase();
    return docCategories
      .map((cat) => ({
        ...cat,
        articles: cat.articles.filter((art) => art.title.toLowerCase().includes(q)),
      }))
      .filter((cat) => cat.articles.length > 0);
  }, [search]);

  return (
    <AdminPage className="neo-ready max-w-7xl mx-auto space-y-8 pb-28">
      <AdminPageHeader
        title="Dokumentasi & Panduan"
        description={`Pusat pengetahuan resmi ${cfg.appName} — panduan alur kerja, pengelolaan ujian, dan pemecahan masalah.`}
      />

      {/* 3-COLUMN DOCUSAURUS RESPONSIVE LAYOUT */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* COLUMN 1: LEFT DOCS CATEGORY SIDEBAR */}
        <aside className="w-full lg:w-64 shrink-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sleek space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input 
              placeholder="Filter dokumen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            />
          </div>

          <nav aria-label="Kategori Panduan" className="space-y-4 text-xs">
            {filteredCategories.map((cat) => {
              const IconComp = cat.icon;
              return (
                <div key={cat.id} className="space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-slate-400 px-2">
                    <IconComp className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{cat.label}</span>
                  </div>
                  <ul className="space-y-1 pl-2">
                    {cat.articles.map((art) => {
                      const isActive = art.id === activeDocId;
                      return (
                        <li key={art.id}>
                          <button
                            onClick={() => handleNavigate(art.id)}
                            className={`w-full text-left px-3 py-2 rounded-xl transition-all font-medium cursor-pointer ${
                              isActive
                                ? "bg-primary text-primary-foreground font-bold shadow-sm"
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-100"
                            }`}
                          >
                            {art.title}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </nav>
        </aside>

        {/* COLUMN 2: CENTER DOCS READING CANVAS */}
        <main className="flex-1 min-w-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-10 shadow-sleek">
          <div className="max-w-3xl mx-auto space-y-8">
            
            {/* Breadcrumb Trail */}
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium border-b border-slate-100 dark:border-slate-900 pb-4">
              <span>Dokumentasi</span>
              <ChevronRight className="h-3 w-3" />
              <span>{activeDoc.categoryLabel}</span>
              <ChevronRight className="h-3 w-3" />
              <span className="font-bold text-slate-900 dark:text-slate-100">{activeDoc.title}</span>
            </div>

            {/* Document Header */}
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {activeDoc.title}
              </h1>
              <p className="text-sm text-slate-500 leading-relaxed">
                {activeDoc.description}
              </p>
            </div>

            <div className="h-px w-full bg-slate-100 dark:bg-slate-900" />

            {/* Render Active Document Content */}
            <div ref={contentRef} className="prose prose-slate dark:prose-invert max-w-none">
              {activeDoc.content(handleNavigate)}
            </div>

            <div className="h-px w-full bg-slate-100 dark:bg-slate-900 pt-6" />

            {/* Bottom Docusaurus Pagination Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 text-xs font-bold">
              {prevDoc ? (
                <button
                  onClick={() => handleNavigate(prevDoc.id)}
                  className="w-full sm:w-auto flex items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary transition-all text-slate-700 dark:text-slate-300 hover:text-primary cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <div className="text-left">
                    <span className="text-[10px] text-slate-400 font-normal block">Bab Sebelumnya</span>
                    <span>{prevDoc.title}</span>
                  </div>
                </button>
              ) : <div />}

              {nextDoc ? (
                <button
                  onClick={() => handleNavigate(nextDoc.id)}
                  className="w-full sm:w-auto flex items-center justify-end gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary transition-all text-slate-700 dark:text-slate-300 hover:text-primary cursor-pointer text-right ml-auto"
                >
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-normal block">Bab Selanjutnya</span>
                    <span>{nextDoc.title}</span>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : <div />}
            </div>

          </div>
        </main>

        {/* COLUMN 3: RIGHT IN-PAGE TABLE OF CONTENTS (TOC) */}
        {activeDoc.toc.length > 0 && (
          <aside className="hidden xl:block w-56 shrink-0 sticky top-24 self-start bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sleek rounded-2xl p-5 text-xs">
            <div className="font-bold uppercase tracking-wider text-[10px] text-slate-400 mb-3 px-2">
              Daftar Isi Halaman
            </div>
            <ul className="space-y-1">
              {activeDoc.toc.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className={`block px-3 py-1.5 rounded-lg font-medium transition-all ${
                      activeHeadingId === item.id
                        ? "bg-slate-100 dark:bg-slate-900 text-primary font-bold"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </aside>
        )}

      </div>
    </AdminPage>
  );
}

/* ─── 3. HELPER COMPONENTS (Docusaurus Callouts & Badges) ─── */

function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-bold text-slate-900 dark:text-slate-100">{children}</strong>;
}

function DocMenuLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link 
      to={to} 
      className="inline-flex items-center gap-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-primary hover:text-primary transition-all duration-200 shadow-sm"
    >
      {children} <ExternalLink className="h-3 w-3 opacity-70" />
    </Link>
  );
}

function StepList({ steps }: { steps: React.ReactNode[] }) {
  return (
    <ol className="space-y-3 mb-6">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3 text-xs sm:text-sm">
          <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold mt-0.5 shadow-sm">
            {i + 1}
          </span>
          <span className="flex-1 text-slate-700 dark:text-slate-300 leading-relaxed">{step}</span>
        </li>
      ))}
    </ol>
  );
}

function DocCallout({ 
  type = "note", 
  title, 
  children 
}: { 
  type?: "note" | "tip" | "warning" | "danger"; 
  title?: string; 
  children: React.ReactNode 
}) {
  const styles = {
    note: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40 text-blue-900 dark:text-blue-300",
    tip: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300",
    warning: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-300",
    danger: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 text-red-900 dark:text-red-300",
  };

  const icons = {
    note: Info,
    tip: Lightbulb,
    warning: AlertTriangle,
    danger: AlertTriangle,
  };

  const IconComp = icons[type];

  return (
    <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-1 shadow-sm ${styles[type]}`}>
      <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[10px]">
        <IconComp className="h-4 w-4 shrink-0" />
        <span>{title || type}</span>
      </div>
      <div className="pl-6">{children}</div>
    </div>
  );
}

function FaqAccordion({ q, children }: { q: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-hidden transition-all duration-300">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between text-left font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2.5">
          <HelpCircle className="h-4 w-4 text-primary shrink-0" /> {q}
        </span>
        <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${isOpen ? "rotate-90 text-primary" : ""}`} />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="pl-6">{children}</div>
        </div>
      )}
    </div>
  );
}

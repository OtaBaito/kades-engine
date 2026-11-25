// Konten untuk mekanik "desa hidup": aspirasi, pegawai, dekorasi, misi, pencapaian.
// Semua nama dan kejadian fiktif.
import type { GroupId, StatKey, VillageState } from '../types.ts';

const JT = 1_000_000;

/** Jumlah rumah warga di peta (harus sama dengan tata letak peta di web). */
export const JUMLAH_RUMAH = 100;

export const ASPIRASI: Record<GroupId, string[]> = {
  petani: [
    'Pupuk langka lagi, Pak Kades.',
    'Tikus sawah makin berani, perlu gropyokan.',
    'Harga gabah turun pas panen, kok bisa?',
    'Saluran air ke sawah mampet.',
  ],
  pedagang: [
    'Lapak depan balai becek kalau hujan.',
    'Pembeli sepi, desa perlu acara ramai-ramai.',
    'Ada pungutan liar di parkiran pasar.',
    'Jalan rusak, barang dagangan telat sampai.',
  ],
  pemuda: [
    'Sinyal di dusun timur hilang timbul.',
    'Karang taruna butuh tempat latihan band.',
    'Turnamen voli kapan diadakan lagi?',
    'Lowongan kerja di desa sedikit sekali.',
  ],
  pkk: [
    'Jadwal posyandu bulan ini kapan?',
    'Air sumur keruh, anak-anak gatal-gatal.',
    'Lampu gang gelap, ibu-ibu takut pulang malam.',
    'Arisan PKK butuh tempat yang layak.',
  ],
  tokoh: [
    'Kegiatan rumah ibadah perlu pengeras suara baru.',
    'Anak muda jarang ikut kerja bakti.',
    'Tolong transparan soal dana desa.',
    'Makam desa perlu dibersihkan.',
  ],
  perantau: [
    'Kirim uang ke kampung susah, tidak ada agen.',
    'Video call dengan keluarga putus-putus.',
    'Jalan ke desa rusak, mudik jadi berat.',
    'Anak di kampung butuh beasiswa.',
  ],
};

export interface PegawaiDef {
  id: string;
  nama: string;
  peran: string;
  gajiBulanan: number;
  biayaRekrut: number;
  efek: string;
  warna: number;
  /** Level kades minimal untuk bisa merekrut. */
  minLevel?: number;
  /** Level desa saat tiap kursi tambahan terbuka (panjang = jumlah kursi maksimal). */
  slotLevel?: number[];
  /** Bonus target kepuasan kelompok selama pegawai bekerja. */
  kepuasanTarget?: Partial<Record<GroupId, number>>;
  /** Efek harian kecil (dibagi 30 dari angka bulanan). */
  bulanan?: { kecurigaan?: number; indeks?: Partial<Record<'sosial' | 'ekonomi' | 'lingkungan', number>>; popularitas?: number };
  /** Kenaikan pendapatan BUMDes (mis. 0,25 = +25%). */
  bonusBumdes?: number;
}

export const PEGAWAI: PegawaiDef[] = [
  {
    id: 'bendahara', slotLevel: [1, 4],
    nama: 'Bu Ratna',
    peran: 'Kaur Keuangan',
    gajiBulanan: 4 * JT,
    biayaRekrut: 5 * JT,
    efek: 'Menagih retribusi otomatis setiap hari',
    warna: 0x2f7fbf,
  },
  {
    id: 'kader', slotLevel: [1, 3, 6],
    nama: 'Bu Endah',
    peran: 'Kader Posyandu',
    gajiBulanan: 3 * JT,
    biayaRekrut: 3 * JT,
    efek: 'Ibu-ibu PKK dan tokoh lebih puas',
    warna: 0xd85a8a,
  },
  {
    id: 'linmas', slotLevel: [1, 2, 4, 6],
    nama: 'Pak Slamet',
    peran: 'Linmas',
    gajiBulanan: 3 * JT,
    biayaRekrut: 3 * JT,
    efek: 'Desa lebih aman, semua warga sedikit lebih puas',
    warna: 0x4a5d3a,
  },
  {
    id: 'humas', slotLevel: [1, 5],
    nama: 'Mas Bayu',
    peran: 'Admin Medsos Desa',
    gajiBulanan: 3 * JT,
    biayaRekrut: 4 * JT,
    efek: 'Menanggapi satu aspirasi warga tiap hari dan menjaga popularitas',
    warna: 0xe0a526,
  },
  { id: 'operator', slotLevel: [2, 5], nama: 'Mas Dimas', peran: 'Operator Sistem Desa', gajiBulanan: 3 * JT, biayaRekrut: 3 * JT, efek: 'Laporan rapi, gosip dan kecurigaan turun tiap bulan', warna: 0x6a8a9a, minLevel: 2, bulanan: { kecurigaan: -3 } },
  { id: 'kebersihan', slotLevel: [2, 3, 5], nama: 'Pak Gimin', peran: 'Petugas Kebersihan', gajiBulanan: 2.5 * JT, biayaRekrut: 2 * JT, efek: 'Lingkungan pelan-pelan membaik, ibu-ibu senang', warna: 0x3e8e5a, minLevel: 2, kepuasanTarget: { pkk: 2 }, bulanan: { indeks: { lingkungan: 0.6 } } },
  { id: 'penyuluh_agama', slotLevel: [2, 6], nama: 'Pak Hanif', peran: 'Penyuluh Agama', gajiBulanan: 2.5 * JT, biayaRekrut: 2 * JT, efek: 'Tokoh agama dan adat lebih puas', warna: 0x2f6b3f, minLevel: 2, kepuasanTarget: { tokoh: 5 } },
  { id: 'penyuluh_tani', slotLevel: [3, 6], nama: 'Mbak Lilis', peran: 'Penyuluh Pertanian', gajiBulanan: 4 * JT, biayaRekrut: 4 * JT, efek: 'Petani lebih puas, ekonomi naik pelan', warna: 0x7a9a3a, minLevel: 3, kepuasanTarget: { petani: 5 }, bulanan: { indeks: { ekonomi: 0.4 } } },
  { id: 'pelatih', slotLevel: [3, 7], nama: 'Coach Rendi', peran: 'Pelatih Olahraga', gajiBulanan: 3 * JT, biayaRekrut: 3 * JT, efek: 'Pemuda lebih puas dan jauh dari balapan liar', warna: 0x2f7fbf, minLevel: 3, kepuasanTarget: { pemuda: 5 } },
  { id: 'guru_paud', slotLevel: [3, 5], nama: 'Bu Anis', peran: 'Guru PAUD', gajiBulanan: 3 * JT, biayaRekrut: 2 * JT, efek: 'Ibu-ibu dan keluarga muda lebih puas, sosial naik', warna: 0xd85a8a, minLevel: 3, kepuasanTarget: { pkk: 3, perantau: 2 }, bulanan: { indeks: { sosial: 0.4 } } },
  { id: 'manajer_bumdes', slotLevel: [4], nama: 'Mas Fikri', peran: 'Manajer BUMDes', gajiBulanan: 6 * JT, biayaRekrut: 8 * JT, efek: 'Pendapatan semua usaha BUMDes naik 25%', warna: 0x6a4a9a, minLevel: 4, bonusBumdes: 0.25 },
  { id: 'pendamping_hukum', slotLevel: [5], nama: 'Pak Yusuf, S.H.', peran: 'Pendamping Hukum', gajiBulanan: 7 * JT, biayaRekrut: 10 * JT, efek: 'Kecurigaan turun cepat, integritas terjaga', warna: 0x3b4a5a, minLevel: 5, bulanan: { kecurigaan: -5 } },
];

export interface DekorasiDef {
  id: string;
  nama: string;
  biaya: number;
  efek: { popularitas?: number; semuaKepuasan?: number; indeks?: { sosial?: number; lingkungan?: number; ekonomi?: number }; kepuasan?: Partial<Record<GroupId, number>> };
  minLevel?: number;
}

export const DEKORASI: DekorasiDef[] = [
  { id: 'taman', nama: 'Taman Bunga Desa', biaya: 15 * JT, efek: { popularitas: 3, indeks: { lingkungan: 2 } } },
  { id: 'gapura', nama: 'Gapura Selamat Datang', biaya: 25 * JT, efek: { popularitas: 5, kepuasan: { tokoh: 4, perantau: 3 } } },
  { id: 'pos_ronda', nama: 'Pos Ronda', biaya: 10 * JT, efek: { semuaKepuasan: 2, kepuasan: { pemuda: 2 } } },
  { id: 'tugu', nama: 'Tugu Desa', biaya: 20 * JT, efek: { popularitas: 4, indeks: { sosial: 2 } } },
  { id: 'mural', nama: 'Mural Tembok Desa', biaya: 15 * JT, minLevel: 2, efek: { popularitas: 3, kepuasan: { pemuda: 3 } } },
  { id: 'lampu_hias', nama: 'Lampu Hias Jalan Utama', biaya: 18 * JT, minLevel: 2, efek: { popularitas: 3, kepuasan: { pedagang: 3 } } },
  { id: 'patung_padi', nama: 'Patung Padi Emas', biaya: 30 * JT, minLevel: 3, efek: { popularitas: 3, kepuasan: { petani: 4 } } },
  { id: 'air_mancur', nama: 'Air Mancur Alun-alun', biaya: 35 * JT, minLevel: 3, efek: { popularitas: 5, indeks: { lingkungan: 1 } } },
  { id: 'spot_foto', nama: 'Spot Foto "I Love Desa"', biaya: 20 * JT, minLevel: 4, efek: { popularitas: 4, kepuasan: { perantau: 3, pemuda: 2 } } },
  { id: 'taman_bacaan', nama: 'Taman Bacaan Terbuka', biaya: 25 * JT, minLevel: 4, efek: { indeks: { sosial: 3 }, kepuasan: { pemuda: 2, pkk: 2 } } },
  { id: 'menara_pandang', nama: 'Menara Pandang Sawah', biaya: 60 * JT, minLevel: 5, efek: { popularitas: 6, indeks: { ekonomi: 2 } } },
  { id: 'kubah_masjid', nama: 'Balai Kerukunan Umat', biaya: 80 * JT, minLevel: 6, efek: { popularitas: 4, kepuasan: { tokoh: 8 } } },
];

export interface MisiTemplate {
  jenis: StatKey;
  judul: (n: number) => string;
  target: [number, number];
  hadiahKas: number;
  hadiahXp: number;
}

export const MISI: MisiTemplate[] = [
  { jenis: 'tagih', judul: (n) => `Tagih iuran warga ${n} kali`, target: [15, 30], hadiahKas: 8 * JT, hadiahXp: 25 },
  { jenis: 'aspirasi', judul: (n) => `Tanggapi ${n} aspirasi warga`, target: [3, 6], hadiahKas: 10 * JT, hadiahXp: 30 },
  { jenis: 'kartu', judul: (n) => `Selesaikan ${n} urusan warga`, target: [3, 6], hadiahKas: 10 * JT, hadiahXp: 30 },
  { jenis: 'proyekMulai', judul: () => 'Mulai satu pembangunan', target: [1, 1], hadiahKas: 15 * JT, hadiahXp: 35 },
  { jenis: 'upgrade', judul: () => 'Tingkatkan satu bangunan', target: [1, 1], hadiahKas: 15 * JT, hadiahXp: 35 },
  { jenis: 'dekorasi', judul: () => 'Percantik desa dengan satu dekorasi', target: [1, 1], hadiahKas: 6 * JT, hadiahXp: 20 },
  { jenis: 'bumdes', judul: () => 'Buka atau tingkatkan satu usaha BUMDes', target: [1, 1], hadiahKas: 12 * JT, hadiahXp: 30 },
];

/** Misi mingguan: target lebih besar, hadiah lebih besar. Berganti tiap 7 hari game. */
export const MISI_MINGGUAN: MisiTemplate[] = [
  { jenis: 'tagih', judul: (n) => `Tagih iuran warga ${n} kali minggu ini`, target: [12, 20], hadiahKas: 20 * JT, hadiahXp: 60 },
  { jenis: 'kartu', judul: (n) => `Selesaikan ${n} urusan warga minggu ini`, target: [4, 7], hadiahKas: 25 * JT, hadiahXp: 70 },
  { jenis: 'aspirasi', judul: (n) => `Tanggapi ${n} keluhan warga minggu ini`, target: [3, 5], hadiahKas: 20 * JT, hadiahXp: 60 },
  { jenis: 'proyekMulai', judul: () => 'Mulai satu pembangunan minggu ini', target: [1, 1], hadiahKas: 30 * JT, hadiahXp: 70 },
  { jenis: 'bumdes', judul: () => 'Buka atau tingkatkan usaha BUMDes minggu ini', target: [1, 1], hadiahKas: 25 * JT, hadiahXp: 60 },
];

export const JUDUL_MISI: Record<StatKey, (n: number) => string> = Object.fromEntries(
  MISI.map((m) => [m.jenis, m.judul]),
) as Record<StatKey, (n: number) => string>;

export interface PencapaianDef {
  id: string;
  judul: string;
  teks: string;
  syarat: (s: VillageState) => boolean;
}

export const PENCAPAIAN: PencapaianDef[] = [
  { id: 'tagih_pertama', judul: 'Uang Masuk', teks: 'Tagih retribusi untuk pertama kali.', syarat: (s) => s.statistik.tagih >= 1 },
  { id: 'aspirasi_pertama', judul: 'Kades Mendengar', teks: 'Tanggapi aspirasi warga pertama.', syarat: (s) => s.statistik.aspirasi >= 1 },
  { id: 'proyek_pertama', judul: 'Peletakan Batu Pertama', teks: 'Selesaikan satu pembangunan.', syarat: (s) => s.proyekSelesai.length >= 1 },
  { id: 'tiga_proyek', judul: 'Desa Mulai Berubah', teks: 'Punya tiga bangunan baru.', syarat: (s) => s.proyekSelesai.length >= 3 },
  { id: 'semua_proyek', judul: 'Desa Membangun', teks: 'Punya delapan bangunan baru.', syarat: (s) => s.proyekSelesai.length >= 8 },
  { id: 'upgrade_pertama', judul: 'Naik Kelas', teks: 'Tingkatkan satu bangunan.', syarat: (s) => s.proyekSelesai.some((b) => b.level >= 2) },
  { id: 'bangunan_maks', judul: 'Kualitas Kabupaten', teks: 'Satu bangunan mencapai level 3.', syarat: (s) => s.proyekSelesai.some((b) => b.level >= 3) },
  { id: 'aspirasi_25', judul: 'Telinga Rakyat', teks: 'Tanggapi 25 aspirasi.', syarat: (s) => s.statistik.aspirasi >= 25 },
  { id: 'pegawai_pertama', judul: 'Tim Solid', teks: 'Rekrut pegawai desa pertama.', syarat: (s) => s.pegawai.length >= 1 },
  { id: 'dekorasi_semua', judul: 'Desa Instagramable', teks: 'Pasang empat dekorasi.', syarat: (s) => s.dekorasi.length >= 4 },
  { id: 'menang_pilkades', judul: 'Dipercaya Lagi', teks: 'Menang pilkades.', syarat: (s) => s.pilkades.some((p) => p.menang) },
  { id: 'bersih', judul: 'Tangan Bersih', teks: 'Integritas mencapai 90.', syarat: (s) => s.integritas >= 90 },
  { id: 'kas_500', judul: 'Kas Gemuk', teks: 'Kas desa menembus Rp2 miliar.', syarat: (s) => s.kas >= 2000 * JT },
  { id: 'berkembang', judul: 'Desa Berkembang', teks: 'Status desa naik ke Berkembang.', syarat: (s) => (s.indeks.sosial + s.indeks.ekonomi + s.indeks.lingkungan) / 3 >= 45 },
  { id: 'maju', judul: 'Desa Maju', teks: 'Status desa naik ke Maju.', syarat: (s) => (s.indeks.sosial + s.indeks.ekonomi + s.indeks.lingkungan) / 3 >= 60 },
  { id: 'bumdes_pertama', judul: 'Desa Berdikari', teks: 'Buka atau tingkatkan usaha BUMDes sendiri.', syarat: (s) => (s.statistik.bumdes ?? 0) >= 1 },
  { id: 'bumdes_semua', judul: 'Konglomerat Desa', teks: 'Punya empat usaha BUMDes.', syarat: (s) => Object.values(s.bumdes ?? {}).filter((l) => l > 0).length >= 4 },
  { id: 'lunas_pertama', judul: 'Bebas Utang', teks: 'Lunasi satu pinjaman.', syarat: (s) => (s.statistikKredit?.lunas ?? 0) >= 1 },
  { id: 'korban_pinjol', judul: 'Dikejar Penagih', teks: 'Telat bayar cicilan tiga kali. Jangan ditiru.', syarat: (s) => (s.statistikKredit?.telat ?? 0) >= 3 },
  { id: 'level_5', judul: 'Kades Berpengalaman', teks: 'Capai level 5.', syarat: (s) => s.level >= 5 },
  { id: 'level_10', judul: 'Kades Legendaris', teks: 'Capai level 10.', syarat: (s) => s.level >= 10 },
];

// ---------------------------------------------------------------- BUMDes: pendapatan pasif

export interface BumdesDef {
  id: string;
  nama: string;
  deskripsi: string;
  biaya: number;
  /** Pendapatan per hari game di level 1. Tiap level naik 50%. */
  pendapatanHarian: number;
  maksLevel: number;
  syaratProyek?: string;
  /** Lapangan kerja: menaikkan sedikit kepuasan kelompok ini tiap level. */
  kelompok: GroupId;
  minLevel?: number;
}

export const BUMDES: BumdesDef[] = [
  {
    id: 'warung_desa',
    nama: 'Warung BUMDes',
    deskripsi: 'Warung sembako milik desa. Untung kecil tapi rutin.',
    biaya: 30 * JT,
    pendapatanHarian: 1 * JT,
    maksLevel: 5,
    kelompok: 'pedagang',
  },
  {
    id: 'kolam_ikan',
    nama: 'Kolam Ikan Lele',
    deskripsi: 'Kolam lele di tepi kali, dikelola karang taruna.',
    biaya: 55 * JT,
    pendapatanHarian: 1.8 * JT,
    maksLevel: 5,
    kelompok: 'pemuda',
  },
  {
    id: 'penggilingan',
    nama: 'Penggilingan Padi',
    deskripsi: 'Gabah warga digiling di desa sendiri, tidak lagi ke tengkulak.',
    biaya: 95 * JT,
    pendapatanHarian: 3 * JT,
    maksLevel: 5,
    syaratProyek: 'irigasi',
    kelompok: 'petani',
  },
  {
    id: 'homestay',
    nama: 'Homestay Desa Wisata',
    deskripsi: 'Rumah warga disewakan untuk wisatawan. Butuh jalan yang bagus.',
    biaya: 130 * JT,
    pendapatanHarian: 4.4 * JT,
    maksLevel: 5,
    syaratProyek: 'jalan_aspal',
    kelompok: 'perantau',
  },
  { id: 'laundry', nama: 'Laundry Kiloan', deskripsi: 'Dikelola ibu-ibu PKK, langganan anak kos dan perantau.', biaya: 40 * JT, pendapatanHarian: 1.3 * JT, maksLevel: 5, kelompok: 'pkk', minLevel: 2 },
  { id: 'sewa_tenda', nama: 'Sewa Tenda & Sound', deskripsi: 'Hajatan tiap minggu, tenda dan sound system desa laris.', biaya: 45 * JT, pendapatanHarian: 1.4 * JT, maksLevel: 5, kelompok: 'pemuda', minLevel: 2 },
  { id: 'depot_air', nama: 'Depot Air Minum', deskripsi: 'Air sumur bor disaring dan dijual per galon.', biaya: 80 * JT, pendapatanHarian: 2.4 * JT, maksLevel: 5, syaratProyek: 'sumur_bor', kelompok: 'pkk', minLevel: 3 },
  { id: 'pupuk_organik', nama: 'Pabrik Pupuk Organik', deskripsi: 'Kotoran ternak dan sampah organik jadi pupuk yang dijual ke petani.', biaya: 70 * JT, pendapatanHarian: 2 * JT, maksLevel: 5, kelompok: 'petani', minLevel: 3 },
  { id: 'kedai_kopi', nama: 'Kedai Kopi Desa', deskripsi: 'Kopi dari kebun warga, tempat nongkrong pemuda dan pelancong.', biaya: 110 * JT, pendapatanHarian: 3.5 * JT, maksLevel: 5, kelompok: 'pemuda', minLevel: 4 },
  { id: 'toko_oleh', nama: 'Toko Oleh-oleh', deskripsi: 'Keripik, batik, dan anyaman warga. Butuh wisata yang ramai.', biaya: 120 * JT, pendapatanHarian: 3.8 * JT, maksLevel: 5, syaratProyek: 'wisata_air', kelompok: 'pedagang', minLevel: 4 },
  { id: 'simpan_pinjam', nama: 'Unit Simpan Pinjam', deskripsi: 'Pinjaman modal kecil untuk warga, bunga ringan, untung pelan tapi pasti.', biaya: 150 * JT, pendapatanHarian: 4.5 * JT, maksLevel: 5, kelompok: 'perantau', minLevel: 5 },
  { id: 'agrowisata', nama: 'Agrowisata Petik Buah', deskripsi: 'Kebun buah di tepi embung, tiket masuk plus petik sendiri.', biaya: 220 * JT, pendapatanHarian: 6.5 * JT, maksLevel: 5, syaratProyek: 'embung', kelompok: 'petani', minLevel: 6 },
];

// Sidang klarifikasi audit: kades mencoba ngeles dari pertanyaan auditor.
// Makin sering kena audit, makin banyak pertanyaan, makin sedikit salah yang dimaafkan,
// dan alasan yang pernah dipakai sudah dihafal auditor.
import { GameError } from './errors.ts';
import { nextRandom } from './rng.ts';
import type { VillageState } from './types.ts';

export interface JawabanDef {
  id: string;
  teks: string;
  /** Seberapa meyakinkan (0 = jelas bohong, 3 = sulit dibantah). */
  kekuatan: number;
  /** Tanggapan auditor kalau jawaban ini gagal. */
  bantah: string;
}

export interface SoalDef {
  id: string;
  tanya: string;
  jawaban: JawabanDef[];
}

export const SOAL_AUDIT: SoalDef[] = [
  {
    id: 'kuitansi',
    tanya: 'Kuitansi pembelian semen ini tanggalnya hari Minggu, toko bangunannya tutup. Bisa dijelaskan?',
    jawaban: [
      { id: 'pesan_antar', teks: 'Kami pesan lewat telepon, barang diantar hari Minggu.', kekuatan: 2, bantah: 'Toko itu tidak punya layanan antar. Kami sudah cek.' },
      { id: 'salah_tanggal', teks: 'Itu salah tulis tanggal oleh tokonya, Pak.', kekuatan: 1, bantah: 'Kebetulan sekali, salah tulisnya di semua kuitansi.' },
      { id: 'kuitansi_asli', teks: 'Silakan cek buku kas toko, tanggalnya sama dengan surat jalan.', kekuatan: 3, bantah: 'Surat jalannya ternyata juga tidak ada.' },
      { id: 'lupa', teks: 'Wah, saya lupa, Pak. Sudah lama sekali.', kekuatan: 0, bantah: 'Lupa bukan jawaban, Pak Kades.' },
    ],
  },
  {
    id: 'volume_jalan',
    tanya: 'Di RAB tertulis jalan 500 meter, tapi kami ukur di lapangan cuma 380 meter.',
    jawaban: [
      { id: 'tambahan_drainase', teks: 'Sisanya dialihkan untuk drainase, ada berita acara musdes.', kekuatan: 3, bantah: 'Berita acaranya tidak ditandatangani BPD.' },
      { id: 'tanah_labil', teks: 'Tanahnya labil, kontraktor menambah ketebalan.', kekuatan: 2, bantah: 'Hasil uji ketebalan menunjukkan sebaliknya.' },
      { id: 'ukur_ulang', teks: 'Mungkin alat ukurnya yang salah, Pak.', kekuatan: 1, bantah: 'Kami ukur pakai GPS dan meteran. Hasilnya sama.' },
      { id: 'tanya_kontraktor', teks: 'Itu urusan kontraktor, saya tidak tahu.', kekuatan: 0, bantah: 'Kades penanggung jawab anggaran. Tidak bisa lepas tangan.' },
    ],
  },
  {
    id: 'honor_fiktif',
    tanya: 'Ada honor narasumber pelatihan, tapi narasumbernya bilang tidak pernah diundang.',
    jawaban: [
      { id: 'ganti_narsum', teks: 'Narasumbernya diganti mendadak, namanya lupa diubah di laporan.', kekuatan: 2, bantah: 'Penggantinya juga tidak tercatat di daftar hadir.' },
      { id: 'daftar_hadir', teks: 'Ada foto kegiatan dan daftar hadir peserta, silakan dicek.', kekuatan: 3, bantah: 'Fotonya ternyata dari kegiatan tahun lalu.' },
      { id: 'bukan_saya', teks: 'Itu yang urus sekdes, Pak.', kekuatan: 1, bantah: 'Sekdes bilang semua atas perintah kades.' },
      { id: 'honor_wajar', teks: 'Semua desa juga begitu, Pak.', kekuatan: 0, bantah: 'Kami tidak sedang memeriksa desa lain.' },
    ],
  },
  {
    id: 'rekening',
    tanya: 'Ada transfer Rp 20 juta dari rekening kontraktor ke rekening istri Bapak.',
    jawaban: [
      { id: 'utang', teks: 'Itu pelunasan utang pribadi, ada perjanjiannya di notaris.', kekuatan: 3, bantah: 'Akta notarisnya dibuat minggu lalu.' },
      { id: 'jual_mobil', teks: 'Kontraktor itu membeli mobil bekas kami.', kekuatan: 2, bantah: 'BPKB mobilnya masih atas nama Bapak.' },
      { id: 'arisan', teks: 'Itu uang arisan ibu-ibu.', kekuatan: 1, bantah: 'Arisan apa yang setorannya Rp 20 juta sekali?' },
      { id: 'tidak_tahu_istri', teks: 'Saya tidak tahu urusan rekening istri.', kekuatan: 0, bantah: 'Rekeningnya dibuka pakai KTP Bapak.' },
    ],
  },
  {
    id: 'pengadaan',
    tanya: 'Laptop desa dibeli Rp 25 juta per unit. Harga pasarannya Rp 9 juta.',
    jawaban: [
      { id: 'spek_tinggi', teks: 'Spesifikasinya khusus untuk aplikasi keuangan desa.', kekuatan: 2, bantah: 'Spesifikasinya sama persis dengan laptop pasaran.' },
      { id: 'katalog', teks: 'Kami beli lewat e-katalog, harganya sudah ditetapkan.', kekuatan: 3, bantah: 'Penyedianya ternyata perusahaan milik keponakan Bapak.' },
      { id: 'garansi', teks: 'Sudah termasuk garansi dan pelatihan.', kekuatan: 1, bantah: 'Pelatihannya tidak pernah ada.' },
      { id: 'harga_naik', teks: 'Waktu itu harga sedang naik, Pak.', kekuatan: 0, bantah: 'Naik hampir tiga kali lipat?' },
    ],
  },
  {
    id: 'bantuan',
    tanya: 'Warga penerima bantuan mengaku hanya menerima Rp 300 ribu dari Rp 600 ribu.',
    jawaban: [
      { id: 'potongan_sukarela', teks: 'Itu iuran sukarela untuk perbaikan rumah ibadah, ada tanda tangan warga.', kekuatan: 2, bantah: 'Warga bilang dipaksa tanda tangan.' },
      { id: 'tahap_dua', teks: 'Sisanya dibayar tahap kedua bulan depan.', kekuatan: 3, bantah: 'Tahap kedua tidak ada di jadwal penyaluran.' },
      { id: 'warga_salah', teks: 'Warganya mungkin salah hitung, Pak.', kekuatan: 1, bantah: 'Tiga puluh warga salah hitung dengan angka yang sama?' },
      { id: 'ongkos', teks: 'Untuk ongkos transport petugas.', kekuatan: 0, bantah: 'Ongkos transport sudah ada anggarannya sendiri.' },
    ],
  },
  {
    id: 'tanah_kas',
    tanya: 'Tanah kas desa disewakan, tapi uang sewanya tidak pernah masuk kas.',
    jawaban: [
      { id: 'dipakai_desa', teks: 'Uangnya langsung dipakai perbaikan saluran, ada notanya.', kekuatan: 2, bantah: 'Notanya dari toko yang sudah tutup dua tahun.' },
      { id: 'pinjam_pakai', teks: 'Itu pinjam pakai gratis untuk kelompok tani, bukan sewa.', kekuatan: 3, bantah: 'Penyewanya pengusaha dari kota, bukan kelompok tani.' },
      { id: 'belum_bayar', teks: 'Penyewanya belum bayar, Pak.', kekuatan: 1, bantah: 'Penyewa punya bukti transfer ke rekening Bapak.' },
      { id: 'warisan', teks: 'Itu tanah warisan keluarga saya.', kekuatan: 0, bantah: 'Sertifikatnya jelas atas nama desa.' },
    ],
  },
  {
    id: 'proyek_fiktif',
    tanya: 'Ada pembayaran proyek sumur bor, tapi sumurnya tidak ditemukan.',
    jawaban: [
      { id: 'sumur_kering', teks: 'Sumurnya sudah dibor tapi kering, lalu ditimbun lagi.', kekuatan: 2, bantah: 'Tidak ada bekas pengeboran di titik itu.' },
      { id: 'pindah_lokasi', teks: 'Lokasinya dipindah ke dusun sebelah atas usulan warga.', kekuatan: 3, bantah: 'Dusun sebelah juga tidak punya sumur baru.' },
      { id: 'masih_proses', teks: 'Masih dalam proses, Pak.', kekuatan: 1, bantah: 'Pembayarannya sudah lunas delapan bulan lalu.' },
      { id: 'dicuri', teks: 'Pipanya dicuri orang.', kekuatan: 0, bantah: 'Lubangnya juga dicuri?' },
    ],
  },
];

const SOAL_BY_ID = new Map(SOAL_AUDIT.map((s) => [s.id, s]));

export interface Sidang {
  tingkat: number;
  soal: string[];
  /** Urutan tampil jawaban tiap soal (diacak sekali saat sidang dibuka). */
  urutan: string[][];
  ke: number;
  salah: number;
  salahMaks: number;
  riwayat: { soal: string; jawaban: string; lolos: boolean; tanggapan: string }[];
}

/** Aturan sidang menurut berapa kali kades sudah pernah diaudit. */
export function aturanSidang(tingkat: number) {
  return {
    jumlahSoal: Math.min(6, 1 + tingkat),
    salahMaks: tingkat <= 1 ? 2 : tingkat <= 3 ? 1 : 0,
    kekuatanMin: Math.min(3, 1 + Math.floor(tingkat / 2)),
  };
}

function acak<T>(s: VillageState, xs: T[]): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom(s) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function bukaSidang(s: VillageState): string {
  const p = s.politik;
  if (!p.kasus) throw new GameError('Tidak ada audit yang sedang berjalan.');
  if (p.kasus.sidang) throw new GameError('Sidang klarifikasi sedang berjalan.');
  if (p.kasus.ngelesGagal) throw new GameError('Auditor sudah tidak mau mendengar alasan lagi untuk kasus ini.');
  const tingkat = Math.max(1, p.pernahKasus);
  const aturan = aturanSidang(tingkat);
  // auditor memeriksa apa yang benar-benar dilakukan kades dulu, baru pertanyaan umum
  const TERKAIT: Record<string, string[]> = {
    markup: ['kuitansi', 'volume_jalan', 'pengadaan', 'proyek_fiktif'],
    fee_kontraktor: ['rekening', 'pengadaan'],
    sewa_bengkok: ['tanah_kas'],
    potong_bantuan: ['bantuan', 'honor_fiktif'],
  };
  const dilakukan = Object.keys(s.politik.jeda ?? {})
    .filter((k) => k.startsWith('gelap:'))
    .flatMap((k) => TERKAIT[k.slice(6)] ?? []);
  const acakSemua = acak(s, SOAL_AUDIT);
  const soal = [...acakSemua.filter((x) => dilakukan.includes(x.id)), ...acakSemua.filter((x) => !dilakukan.includes(x.id))].slice(0, aturan.jumlahSoal);
  p.kasus.sidang = {
    tingkat,
    soal: soal.map((x) => x.id),
    urutan: soal.map((x) => acak(s, x.jawaban).map((j) => j.id)),
    ke: 0,
    salah: 0,
    salahMaks: aturan.salahMaks,
    riwayat: [],
  };
  return `Sidang klarifikasi dibuka. Auditor menyiapkan ${aturan.jumlahSoal} pertanyaan.`;
}

/** Jawab satu pertanyaan. Mengembalikan pesan; status sidang berubah di state. */
export function jawabAuditor(s: VillageState, jawabanId: string): { pesan: string; selesai: 'lolos' | 'gagal' | null } {
  const p = s.politik;
  const sidang = p.kasus?.sidang;
  if (!p.kasus || !sidang) throw new GameError('Tidak ada sidang klarifikasi yang berjalan.');
  const soal = SOAL_BY_ID.get(sidang.soal[sidang.ke]);
  const jawaban = soal?.jawaban.find((j) => j.id === jawabanId);
  if (!soal || !jawaban) throw new GameError('Jawaban tidak dikenal.');
  const aturan = aturanSidang(sidang.tingkat);
  p.alasanDipakai ??= [];
  // alasan yang sudah pernah dipakai di audit sebelumnya sudah dihafal auditor
  const basi = p.alasanDipakai.includes(jawaban.id);
  const kekuatan = jawaban.kekuatan - (basi ? 2 : 0);
  const lolos = kekuatan >= aturan.kekuatanMin;
  const tanggapan = lolos
    ? 'Auditor mencatat, lalu pindah ke pertanyaan berikutnya.'
    : basi
      ? 'Alasan ini sudah Bapak pakai di audit sebelumnya.'
      : jawaban.bantah;
  if (!p.alasanDipakai.includes(jawaban.id)) p.alasanDipakai.push(jawaban.id);
  sidang.riwayat.push({ soal: soal.id, jawaban: jawaban.id, lolos, tanggapan });
  if (!lolos) sidang.salah += 1;
  sidang.ke += 1;

  if (sidang.salah > sidang.salahMaks) {
    // gagal ngeles: temuan membesar, tenggat diperpendek, dan tidak bisa ngeles lagi di kasus ini
    p.kasus.sidang = undefined;
    p.kasus.ngelesGagal = true;
    p.kasus.nilai = Math.round(p.kasus.nilai * 1.5);
    p.kasus.batas = Math.min(p.kasus.batas, s.hari + 7);
    p.kecurigaan = Math.min(100, p.kecurigaan + 12);
    s.integritas = Math.max(0, s.integritas - 3);
    return { pesan: `${tanggapan} Auditor menutup map: "Keterangan Bapak tidak konsisten." Temuan membesar jadi Rp ${Math.round(p.kasus.nilai / 1e6)} jt.`, selesai: 'gagal' };
  }
  if (sidang.ke >= sidang.soal.length) {
    p.kasus = null;
    p.kecurigaan = Math.max(0, p.kecurigaan - 15);
    s.popularitas = Math.max(0, s.popularitas - 2);
    p.lolosNgeles = (p.lolosNgeles ?? 0) + 1;
    return { pesan: `${tanggapan} Auditor tidak menemukan cukup bukti. Kasus ditutup, tapi namamu tercatat di daftar pantauan.`, selesai: 'lolos' };
  }
  return { pesan: tanggapan, selesai: null };
}

export function viewSidang(s: VillageState) {
  const k = s.politik.kasus;
  const tingkat = Math.max(1, s.politik.pernahKasus);
  const aturan = aturanSidang(tingkat);
  if (!k) return null;
  const sidang = k.sidang;
  const soal = sidang ? SOAL_BY_ID.get(sidang.soal[sidang.ke]) : undefined;
  return {
    bisaNgeles: !k.ngelesGagal,
    tingkat,
    jumlahSoal: aturan.jumlahSoal,
    salahMaks: aturan.salahMaks,
    berjalan: sidang
      ? {
          ke: sidang.ke + 1,
          dari: sidang.soal.length,
          salah: sidang.salah,
          salahMaks: sidang.salahMaks,
          tanya: soal?.tanya ?? '',
          // kekuatan jawaban tidak pernah dikirim ke UI
          pilihan: (sidang.urutan[sidang.ke] ?? []).map((id) => ({ id, teks: soal?.jawaban.find((j) => j.id === id)?.teks ?? '' })),
          terakhir: sidang.riwayat.at(-1) ?? null,
        }
      : null,
  };
}

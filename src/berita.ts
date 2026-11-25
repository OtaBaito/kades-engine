// Berita dan suasana politik nasional.
//
// - Kabar: tajuk berita dari media fiktif (nasional, daerah, desa, ekonomi). Sebagian kabar nasional
//   dan ekonomi berdampak ke warga (harga pupuk, harga gabah, kemarau, dan sebagainya).
// - Pidato presiden: sesekali presiden berpidato soal efisiensi anggaran, program wajib (MBG, Kopdes),
//   swasembada pangan, karpet merah investasi, atau perang melawan korupsi. Isinya mengubah aturan main
//   untuk sementara, dan kades bisa menanggapi: mendukung, diam, atau mengkritik.
// Semua nama orang dan media fiktif (kecuali mitra yang memang disebut namanya).
import { arus } from './arus.ts';
import { GameError } from './errors.ts';
import { nextRandom } from './rng.ts';
import { stateRelasi } from './relasi.ts';
import type { GroupId, IndexId, VillageState } from './types.ts';

const JT = 1_000_000;
const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
type Catat = (j: 'info' | 'baik' | 'buruk' | 'politik', t: string) => void;

export type KategoriBerita = 'nasional' | 'daerah' | 'desa' | 'ekonomi' | 'hiburan';

export interface Berita {
  id: string;
  hari: number;
  judul: string;
  isi: string;
  sumber: string;
  kategori: KategoriBerita;
  dampak?: string;
}

export type TemaPidato = 'efisiensi' | 'mbg_kopdes' | 'swasembada' | 'investasi' | 'antikorupsi' | 'digital';

export interface Pidato {
  id: string;
  hari: number;
  tema: TemaPidato;
  judul: string;
  kutipan: string[];
  dampak: string[];
  tanggapan: 'dukung' | 'diam' | 'kritik' | null;
}

export interface StateNasional {
  berita: Berita[];
  dibacaSampai: number;
  beritaBerikut: number;
  pidatoBerikut: number;
  pidato: Pidato | null;
  /** Efek sementara dari pidato: kunci -> berlaku sampai hari ke. */
  efek: Record<string, number>;
  jeda: Record<string, number>;
  nomor: number;
}

const MAKS_BERITA = 40;

export function stateNasional(s: VillageState): StateNasional {
  s.nasional ??= { berita: [], dibacaSampai: 0, beritaBerikut: Math.max(s.hari + 3, 6), pidatoBerikut: Math.max(s.hari + 20, 45), pidato: null, efek: {}, jeda: {}, nomor: 1 };
  return s.nasional;
}

export function tambahBerita(s: VillageState, b: Omit<Berita, 'id' | 'hari'>): void {
  const n = stateNasional(s);
  n.berita.unshift({ ...b, id: `b${n.nomor++}`, hari: s.hari });
  if (n.berita.length > MAKS_BERITA) n.berita.length = MAKS_BERITA;
}

export function efekAktif(s: VillageState, kunci: string): boolean {
  return (s.nasional?.efek[kunci] ?? -1) >= s.hari;
}

/** Pengali termin dana desa dari kebijakan pusat (efisiensi anggaran). Sekali pakai. */
export function potongEfisiensi(s: VillageState): number {
  const n = s.nasional;
  if (!n || !n.efek.efisiensi_termin) return 1;
  delete n.efek.efisiensi_termin;
  return 0.9;
}

/** Pengali peluang audit selama kampanye antikorupsi nasional. */
export function faktorAuditNasional(s: VillageState): number {
  return efekAktif(s, 'antikorupsi') ? 1.2 : 1;
}

// ---------------------------------------------------------------- kabar berdampak

interface KabarDef {
  id: string;
  judul: string;
  isi: string;
  sumber: string;
  kategori: KategoriBerita;
  dampak?: string;
  efek?: { kepuasan?: Partial<Record<GroupId, number>>; indeks?: Partial<Record<IndexId, number>>; popularitas?: number; kecurigaan?: number };
  syarat?: (s: VillageState) => boolean;
  jeda: number;
}

const KABAR: KabarDef[] = [
  {
    id: 'pupuk_naik',
    judul: 'Harga Pupuk Nonsubsidi Naik 20 Persen',
    isi: 'Distributor menyebut kenaikan bahan baku impor. Petani mengeluh biaya tanam musim ini membengkak.',
    sumber: 'Kabar Nusantara',
    kategori: 'ekonomi',
    dampak: 'Petani -3',
    efek: { kepuasan: { petani: -3 } },
    jeda: 120,
  },
  {
    id: 'gabah_naik',
    judul: 'Harga Gabah Kering Panen Tembus Rekor',
    isi: 'Permintaan beras melonjak menjelang akhir tahun. Penggilingan berebut gabah petani.',
    sumber: 'Kabar Nusantara',
    kategori: 'ekonomi',
    dampak: 'Petani +3, ibu rumah tangga -1',
    efek: { kepuasan: { petani: 3, pkk: -1 } },
    jeda: 120,
  },
  {
    id: 'bbm_naik',
    judul: 'Harga BBM Nonsubsidi Naik Mulai Pekan Depan',
    isi: 'Ongkos angkut sayur dan bahan bangunan diperkirakan ikut naik. Ojek pangkalan menaikkan tarif.',
    sumber: 'Kabar Nusantara',
    kategori: 'ekonomi',
    dampak: 'Pedagang -2, pemuda -1',
    efek: { kepuasan: { pedagang: -2, pemuda: -1 } },
    jeda: 150,
  },
  {
    id: 'kemarau',
    judul: 'BMKG: Kemarau Tahun Ini Lebih Panjang',
    isi: 'Sejumlah daerah diminta bersiap menghadapi kekeringan dan menghemat air irigasi.',
    sumber: 'Warta Kabupaten',
    kategori: 'daerah',
    dampak: 'Petani -2, lingkungan -2',
    efek: { kepuasan: { petani: -2 }, indeks: { lingkungan: -2 } },
    jeda: 180,
  },
  {
    id: 'korupsi_tetangga',
    judul: 'Kades di Kabupaten Sebelah Ditahan karena Dana Desa',
    isi: 'Warga ramai membandingkan dengan kades masing-masing. Grup WhatsApp desa mendadak sibuk.',
    sumber: 'Warta Kabupaten',
    kategori: 'daerah',
    dampak: 'Gosip +3',
    efek: { kecurigaan: 3 },
    jeda: 150,
  },
  {
    id: 'perantau_pulang',
    judul: 'Gelombang PHK di Kota, Banyak Perantau Pulang Kampung',
    isi: 'Pabrik-pabrik di kota besar merumahkan karyawan. Desa-desa kebanjiran tenaga kerja.',
    sumber: 'Kabar Nusantara',
    kategori: 'nasional',
    dampak: 'Perantau -3, pemuda -1',
    efek: { kepuasan: { perantau: -3, pemuda: -1 } },
    jeda: 200,
  },
  {
    id: 'umkm_digital',
    judul: 'Penjualan UMKM Desa Lewat Marketplace Naik Tajam',
    isi: 'Kerupuk, kopi, dan kerajinan desa laris di toko daring. Pembayaran QRIS makin umum di warung.',
    sumber: 'Kabar Nusantara',
    kategori: 'ekonomi',
    dampak: 'Pedagang +2, pemuda +1',
    efek: { kepuasan: { pedagang: 2, pemuda: 1 } },
    jeda: 150,
  },
  {
    id: 'festival_budaya',
    judul: 'Festival Budaya Kabupaten Digelar Bulan Ini',
    isi: 'Setiap desa diundang mengirim kesenian. Penonton dari luar kota diperkirakan ribuan.',
    sumber: 'Warta Kabupaten',
    kategori: 'daerah',
    dampak: 'Tokoh masyarakat +2, popularitas +1',
    efek: { kepuasan: { tokoh: 2 }, popularitas: 1 },
    jeda: 180,
  },
  {
    id: 'jalan_viral',
    judul: 'Video Jalan Rusak di Desa-desa Viral, Netizen Tandai Pejabat',
    isi: 'Warga ramai mengunggah jalan berlubang dengan tagar desa masing-masing.',
    sumber: 'Kabar Nusantara',
    kategori: 'nasional',
    dampak: 'Popularitas -1',
    efek: { popularitas: -1 },
    jeda: 200,
  },
  {
    id: 'ohayou_festival',
    judul: 'Festival Jejepangan Pertama di Kota Kabupaten',
    isi: 'Lomba cosplay, karaoke anisong, dan bazar manga. Anak muda desa ramai-ramai berangkat.',
    sumber: 'The Ohayou Post',
    kategori: 'hiburan',
    dampak: 'Pemuda +2',
    efek: { kepuasan: { pemuda: 2 } },
    jeda: 240,
  },
  {
    id: 'ohayou_vtuber',
    judul: 'VTuber Lokal Ramai Ditonton, Anak Desa Ikut Bikin Kanal',
    isi: 'Agensi kreator virtual membuka audisi. Banyak remaja mulai belajar menggambar dan streaming.',
    sumber: 'The Ohayou Post',
    kategori: 'hiburan',
    dampak: 'Pemuda +1',
    efek: { kepuasan: { pemuda: 1 } },
    jeda: 240,
  },
  {
    id: 'bansos_telat',
    judul: 'Penyaluran Bansos Triwulan Ini Molor',
    isi: 'Kementerian beralasan pemutakhiran data. Warga kurang mampu bolak-balik bertanya ke kantor desa.',
    sumber: 'Kabar Nusantara',
    kategori: 'nasional',
    dampak: 'Ibu rumah tangga -2',
    efek: { kepuasan: { pkk: -2 } },
    jeda: 150,
  },
];

const SUMBER_DESA = 'Suara Desa';

function terapkanKabar(s: VillageState, k: KabarDef) {
  const e = k.efek;
  if (!e) return;
  for (const [g, d] of Object.entries(e.kepuasan ?? {})) s.kepuasan[g as GroupId] = clamp(s.kepuasan[g as GroupId] + (d ?? 0));
  for (const [i, d] of Object.entries(e.indeks ?? {})) s.indeks[i as IndexId] = clamp(s.indeks[i as IndexId] + (d ?? 0));
  if (e.popularitas) s.popularitas = clamp(s.popularitas + e.popularitas);
  if (e.kecurigaan) s.politik.kecurigaan = clamp(s.politik.kecurigaan + e.kecurigaan);
}

// ---------------------------------------------------------------- pidato presiden

const FEMININ = new Set(['Kirana', 'Wening', 'Sekar', 'Larasati', 'Ratna', 'Lilis', 'Hesti']);

export function presidenPerempuan(nama: string): boolean {
  return FEMININ.has(nama.split(' ')[0]);
}

function sudahBangun(s: VillageState, id: string): boolean {
  return s.proyekSelesai.some((b) => b.proyekId === id);
}

function buatPidato(s: VillageState, tema: TemaPidato, catat: Catat): Pidato {
  const n = stateNasional(s);
  const r = stateRelasi(s);
  const pres = r.tokoh.presiden;
  let judul = '';
  let kutipan: string[] = [];
  const dampak: string[] = [];
  if (tema === 'efisiensi') {
    judul = 'Presiden: Semua Harus Efisien, Tidak Ada Lagi Anggaran Seremonial';
    kutipan = [
      'Saudara-saudara, uang rakyat bukan untuk seminar di hotel dan studi banding ke luar kota.',
      'Saya minta semua, dari kementerian sampai desa, potong belanja yang tidak perlu. Efisiensi! Efisiensi!',
      'Yang tidak efisien, silakan minggir.',
    ];
    n.efek.efisiensi_termin = s.hari + 400;
    dampak.push('Termin dana desa berikutnya dipotong 10%.');
  } else if (tema === 'mbg_kopdes') {
    judul = 'Presiden Tagih Komitmen Daerah untuk MBG dan Koperasi Desa';
    kutipan = [
      'Anak-anak kita harus makan bergizi. Tidak boleh ada desa yang tertinggal!',
      'Koperasi desa adalah soko guru ekonomi. Saya sudah perintahkan, setiap desa harus punya.',
      'Kepala desa yang tidak mendukung program ini, saya catat.',
    ];
    const lengkap = sudahBangun(s, 'dapur_mbg') && sudahBangun(s, 'kopdes');
    if (lengkap) {
      pres.relasi = clamp(pres.relasi + 8);
      arus(s, 'Bonus & hadiah', 25 * JT);
      dampak.push('Desamu sudah punya Dapur MBG dan Kopdes: relasi presiden +8, dana apresiasi Rp 25 jt.');
    } else {
      pres.relasi = clamp(pres.relasi - 8);
      s.popularitas = clamp(s.popularitas - 1);
      dampak.push('Desamu belum lengkap Dapur MBG dan Kopdes: relasi presiden -8, popularitas -1.');
    }
  } else if (tema === 'swasembada') {
    judul = 'Presiden Canangkan Swasembada Pangan Tiga Tahun';
    kutipan = [
      'Bangsa besar tidak boleh bergantung pada beras impor.',
      'Petani adalah pahlawan. Saya minta semua kepala daerah dan kepala desa turun ke sawah.',
      'Lahan sawah jangan dialihfungsikan sembarangan!',
    ];
    s.kepuasan.petani = clamp(s.kepuasan.petani + 3);
    n.efek.swasembada = s.hari + 90;
    dampak.push('Petani +3. Selama 90 hari, menolak pabrik di lahan sawah tidak membuat bupati kesal.');
  } else if (tema === 'investasi') {
    judul = 'Presiden: Gelar Karpet Merah untuk Investor, Izin Jangan Dipersulit';
    kutipan = [
      'Investor datang membawa lapangan kerja. Jangan dipersulit, jangan dimintai macam-macam!',
      'Izin yang bisa sehari, jangan dibuat sebulan.',
      'Siapa yang main pungli ke investor, saya minta aparat tindak tegas.',
    ];
    n.efek.karpet_merah = s.hari + 120;
    n.efek.awasi_pungli = s.hari + 120;
    dampak.push('Selama 120 hari: perusahaan lebih sering melamar masuk desa, tapi minta uang pelicin jauh lebih berisiko.');
  } else if (tema === 'antikorupsi') {
    judul = 'Presiden Perintahkan Bersih-bersih Korupsi sampai ke Desa';
    kutipan = [
      'Saya tidak akan ragu. Siapa pun yang korupsi, tangkap!',
      'Dana desa itu besar. Saya minta inspektorat dan aparat periksa sampai ke tingkat desa.',
      'Kepala desa yang bersih tidak perlu takut.',
    ];
    n.efek.antikorupsi = s.hari + 60;
    dampak.push('Selama 60 hari peluang audit inspektorat naik 20%.');
  } else {
    judul = 'Presiden Dorong Desa Digital: Semua Layanan Harus Bisa Lewat Ponsel';
    kutipan = [
      'Anak muda desa jangan cuma jadi penonton. Jadilah pembuat aplikasi!',
      'Saya ingin surat-menyurat desa bisa diurus dari ponsel, pembayaran pakai QRIS.',
      'Desa yang melek digital akan kita dukung penuh.',
    ];
    s.kepuasan.pemuda = clamp(s.kepuasan.pemuda + 2);
    const digital = (s.usaha?.daftar ?? []).some((u) => u.id === 'sabako' && u.status === 'beroperasi') || sudahBangun(s, 'internet_desa');
    if (digital) {
      pres.relasi = clamp(pres.relasi + 6);
      dampak.push('Pemuda +2. Desamu sudah melek digital: relasi presiden +6.');
    } else dampak.push('Pemuda +2.');
  }
  const p: Pidato = { id: `p${n.nomor++}`, hari: s.hari, tema, judul, kutipan, dampak, tanggapan: null };
  tambahBerita(s, { judul, isi: `${pres.nama}: "${kutipan[0]}"`, sumber: 'Kabar Nusantara', kategori: 'nasional', dampak: dampak.join(' ') });
  catat('politik', `Pidato Presiden ${pres.nama}: ${judul}. ${dampak.join(' ')}`);
  return p;
}

export function tanggapiPidato(s: VillageState, tanggapan: 'dukung' | 'diam' | 'kritik'): string {
  const n = stateNasional(s);
  const p = n.pidato;
  if (!p) throw new GameError('Tidak ada pidato presiden yang perlu ditanggapi.');
  if (p.tanggapan) throw new GameError('Pidato ini sudah kamu tanggapi.');
  p.tanggapan = tanggapan;
  const pres = stateRelasi(s).tokoh.presiden;
  if (tanggapan === 'dukung') {
    pres.relasi = clamp(pres.relasi + 4);
    s.kepuasan.pemuda = clamp(s.kepuasan.pemuda - 1);
    return 'Kades mengunggah potongan pidato presiden dengan tulisan "Siap laksanakan!". Akun resmi kabupaten ikut membagikan. (relasi presiden +4)';
  }
  if (tanggapan === 'kritik') {
    pres.relasi = clamp(pres.relasi - 8);
    s.popularitas = clamp(s.popularitas + 2);
    s.kepuasan.pemuda = clamp(s.kepuasan.pemuda + 3);
    return 'Kades menulis kritik panjang soal pidato itu di media sosial. Anak muda membagikannya, pejabat pusat mencatat namanya. (relasi presiden -8, popularitas +2)';
  }
  return 'Kades memilih tidak berkomentar. Aman, tapi tidak ada yang ingat.';
}

export function bacaBerita(s: VillageState): string {
  const n = stateNasional(s);
  n.dibacaSampai = n.berita[0] ? Number(n.berita[0].id.slice(1)) : n.dibacaSampai;
  return 'Semua berita sudah dibaca.';
}

// ---------------------------------------------------------------- harian

export function harianBerita(s: VillageState, catat: Catat): void {
  const n = stateNasional(s);
  // pidato yang tidak ditanggapi 30 hari dianggap diam
  if (n.pidato && !n.pidato.tanggapan && s.hari - n.pidato.hari > 30) n.pidato.tanggapan = 'diam';
  if (s.hari >= n.pidatoBerikut) {
    const tema: TemaPidato[] = ['efisiensi', 'mbg_kopdes', 'swasembada', 'investasi', 'antikorupsi', 'digital'];
    const kandidat = tema.filter((t) => s.hari >= (n.jeda[`pidato:${t}`] ?? 0));
    const pilih = (kandidat.length ? kandidat : tema)[Math.floor(nextRandom(s) * (kandidat.length || tema.length))];
    n.jeda[`pidato:${pilih}`] = s.hari + 300;
    n.pidato = buatPidato(s, pilih, catat);
    n.pidatoBerikut = s.hari + 90 + Math.floor(nextRandom(s) * 60);
  }
  if (s.hari >= n.beritaBerikut) {
    n.beritaBerikut = s.hari + 7 + Math.floor(nextRandom(s) * 8);
    const siap = KABAR.filter((k) => s.hari >= (n.jeda[k.id] ?? 0) && (!k.syarat || k.syarat(s)));
    if (siap.length) {
      const k = siap[Math.floor(nextRandom(s) * siap.length)];
      n.jeda[k.id] = s.hari + k.jeda;
      terapkanKabar(s, k);
      tambahBerita(s, { judul: k.judul, isi: k.isi, sumber: k.sumber, kategori: k.kategori, dampak: k.dampak });
    }
  }
}

/** Berita dari kejadian di desa (dipanggil modul lain). */
export function beritaDesa(s: VillageState, judul: string, isi: string, kategori: KategoriBerita = 'desa', sumber = SUMBER_DESA): void {
  tambahBerita(s, { judul, isi, sumber, kategori });
}

export function viewBerita(s: VillageState) {
  const n = stateNasional(s);
  const p = n.pidato;
  const pres = stateRelasi(s).tokoh.presiden;
  return {
    daftar: n.berita.map((b) => ({ ...b, baru: Number(b.id.slice(1)) > n.dibacaSampai })),
    belumDibaca: n.berita.filter((b) => Number(b.id.slice(1)) > n.dibacaSampai).length,
    pidato: p
      ? {
          id: p.id,
          judul: p.judul,
          kutipan: p.kutipan,
          dampak: p.dampak,
          tanggapan: p.tanggapan,
          presiden: pres.nama,
          perempuan: presidenPerempuan(pres.nama),
          partai: pres.kubu,
          hariLalu: s.hari - p.hari,
        }
      : null,
    efek: Object.entries(n.efek)
      .filter(([, sampai]) => sampai >= s.hari)
      .map(([k, sampai]) => ({ kunci: k, sisaHari: sampai - s.hari })),
  };
}

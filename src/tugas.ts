// Tugas nyata tiap jabatan pegawai. Setiap jabatan punya efek yang terasa kalau terisi, dan akibat yang
// terasa kalau kursinya kosong (setelah jabatan itu terbuka di level desa). Kekuatan jabatan mengikuti
// kekuatanPeran: pegawai pertama penuh, tambahan setengah, dikali kinerja.
import { arus } from './arus.ts';
import { PEGAWAI } from './content/fitur.ts';
import { infoKantor, kekuatanPeran } from './kepegawaian.ts';
import { nextRandom } from './rng.ts';
import type { GroupId, VillageState } from './types.ts';

const JT = 1_000_000;
const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
type Catat = (j: 'info' | 'baik' | 'buruk' | 'politik', t: string) => void;

/** Teks untuk tampilan: apa gunanya jabatan ini, dan apa akibatnya kalau kosong. */
export const TUGAS: Record<string, { ada: string[]; kosong: string[] }> = {
  bendahara: {
    ada: ['Menagih retribusi otomatis setiap hari', 'Pembukuan rapi: peluang audit inspektorat turun sampai 20%'],
    kosong: ['Retribusi harus ditagih manual', 'Pembukuan amburadul: gosip +1,5 tiap bulan'],
  },
  kader: {
    ada: ['Ibu-ibu PKK dan tokoh lebih puas', 'Indeks sosial naik tiap bulan', 'Kalau Dapur MBG berdiri: menu dipantau, ibu-ibu makin puas'],
    kosong: ['Tiap bulan ada risiko kasus stunting: ibu-ibu -3, popularitas -1, relasi presiden turun'],
  },
  linmas: {
    ada: ['Semua warga sedikit lebih puas', 'Demo dan blokade lebih jarang muncul', 'Aksi massa memanas lebih lambat'],
    kosong: ['Tiap bulan ada risiko pencurian di desa: kas -5 sampai 15 jt, pedagang kesal'],
  },
  humas: {
    ada: ['Menanggapi satu aspirasi warga tiap hari', 'Popularitas naik pelan'],
    kosong: ['Hoaks tidak ada yang meluruskan: popularitas -1 tiap bulan'],
  },
  operator: {
    ada: ['Laporan Siskeudes tepat waktu: gosip turun tiap bulan'],
    kosong: ['Laporan Siskeudes sering telat: termin dana desa bisa tertahan 30 hari'],
  },
  kebersihan: {
    ada: ['Lingkungan membaik tiap bulan', 'Ibu-ibu lebih puas'],
    kosong: ['Lingkungan memburuk pelan', 'Risiko sampah menyumbat selokan dan banjir'],
  },
  penyuluh_agama: {
    ada: ['Tokoh agama dan adat lebih puas', 'Dukungan BPD naik pelan (tokoh masyarakat duduk di BPD)'],
    kosong: ['Tokoh masyarakat merasa ditinggalkan: tokoh -0,3 tiap bulan'],
  },
  penyuluh_tani: {
    ada: ['Petani lebih puas', 'Ekonomi naik pelan', 'Mencegah gagal panen'],
    kosong: ['Tiap bulan ada risiko gagal panen: petani -4, ekonomi -1'],
  },
  pelatih: {
    ada: ['Pemuda lebih puas', 'Mencegah balapan liar dan tawuran'],
    kosong: ['Tiap bulan ada risiko tawuran pemuda: pemuda -2, popularitas -1 (berkurang kalau ada linmas)'],
  },
  guru_paud: {
    ada: ['Ibu-ibu dan keluarga muda lebih puas', 'Indeks sosial naik', 'Gedung PAUD berfungsi penuh'],
    kosong: ['Kalau gedung PAUD sudah berdiri tapi tanpa guru: ibu-ibu -0,5 tiap bulan'],
  },
  manajer_bumdes: {
    ada: ['Pendapatan semua usaha BUMDes naik 25%'],
    kosong: ['Usaha BUMDes dikelola seadanya: pendapatan -10%'],
  },
  pendamping_hukum: {
    ada: ['Gosip turun cepat', 'Temuan audit diperkecil sampai 30%', 'Peluang mosi pemakzulan lolos turun 10%'],
    kosong: ['Tanpa pendamping, temuan audit dan mosi BPD dihadapi sendiri'],
  },
};

function kuat(s: VillageState, peran: string): number {
  return Math.min(1.5, kekuatanPeran(s, peran));
}

/** Jabatan sudah terbuka di level desa ini (kalau belum, kursi kosong tidak berakibat apa-apa). */
export function jabatanTerbuka(s: VillageState, peran: string): boolean {
  const def = PEGAWAI.find((p) => p.id === peran);
  return (s.level ?? 1) >= (def?.minLevel ?? 1);
}

/** Kursi dianggap lalai dikosongkan kalau jabatannya terbuka dan kantor masih punya meja kosong. */
export function kantorAdaMeja(s: VillageState): boolean {
  return infoKantor(s).kapasitas > (s.staf ?? []).length;
}

function kosong(s: VillageState, peran: string): boolean {
  return jabatanTerbuka(s, peran) && kekuatanPeran(s, peran) <= 0 && kantorAdaMeja(s);
}

const sudahBangun = (s: VillageState, id: string) => s.proyekSelesai.some((b) => b.proyekId === id);

// ---------------------------------------------------------------- pengali untuk sistem lain

/** Pengali peluang audit: bendahara rapi menurunkan sampai 20%. */
export function faktorAuditPegawai(s: VillageState): number {
  return 1 - Math.min(0.2, 0.15 * kuat(s, 'bendahara'));
}

/** Pengali nilai temuan audit: pendamping hukum memperkecil sampai 30%. */
export function faktorTemuan(s: VillageState): number {
  return 1 - Math.min(0.3, 0.25 * kuat(s, 'pendamping_hukum'));
}

/** Pengurang peluang mosi pemakzulan lolos. */
export function bantuMosi(s: VillageState): number {
  return Math.min(0.1, 0.08 * kuat(s, 'pendamping_hukum'));
}

/** Pengali peluang aksi massa muncul (linmas, pelatih untuk pemuda). */
export function faktorPemicuPegawai(s: VillageState, kelompok?: GroupId): number {
  let f = 1 - Math.min(0.3, 0.25 * kuat(s, 'linmas'));
  if (kelompok === 'pemuda') f *= 1 - Math.min(0.3, 0.25 * kuat(s, 'pelatih'));
  return f;
}

/** Pengurang kenaikan panas aksi massa per hari (linmas berjaga). */
export function redamUnjuk(s: VillageState): number {
  return Math.min(1.5, 1.2 * kuat(s, 'linmas'));
}

/** Penyesuaian pendapatan BUMDes saat kursi manajer kosong. */
export function potonganBumdes(s: VillageState): number {
  const adaUsaha = Object.values(s.bumdes ?? {}).some((l) => l > 0);
  return adaUsaha && kosong(s, 'manajer_bumdes') ? -0.1 : 0;
}

// ---------------------------------------------------------------- bulanan

export function bulananTugas(s: VillageState, catat: Catat): void {
  const relasi = s.relasi;

  // Kaur Keuangan
  if (kosong(s, 'bendahara')) s.politik.kecurigaan = clamp(s.politik.kecurigaan + 1.5);

  // Kader Posyandu
  if (kosong(s, 'kader')) {
    if (nextRandom(s) < 0.12) {
      s.kepuasan.pkk = clamp(s.kepuasan.pkk - 3);
      s.popularitas = clamp(s.popularitas - 1);
      if (relasi) relasi.tokoh.presiden.relasi = clamp(relasi.tokoh.presiden.relasi - 2);
      catat('buruk', 'Puskesmas mencatat kasus stunting baru di desa. Tidak ada kader posyandu yang memantau tumbuh kembang balita.');
    }
  } else {
    const k = kuat(s, 'kader');
    s.indeks.sosial = clamp(s.indeks.sosial + 0.3 * k);
    if (sudahBangun(s, 'dapur_mbg')) s.kepuasan.pkk = clamp(s.kepuasan.pkk + 0.5 * k);
  }

  // Linmas
  if (kosong(s, 'linmas') && nextRandom(s) < 0.12) {
    const hilang = Math.round((5 + nextRandom(s) * 10) * JT);
    arus(s, 'Keputusan & kejadian', -hilang);
    s.kepuasan.pedagang = clamp(s.kepuasan.pedagang - 2);
    catat('buruk', `Maling membobol gudang desa dan beberapa kios malam-malam. Kerugian Rp ${Math.round(hilang / JT)} jt. Tidak ada linmas yang berjaga.`);
  }

  // Admin Medsos
  if (kosong(s, 'humas')) s.popularitas = clamp(s.popularitas - 1);

  // Operator Sistem Desa
  if (kosong(s, 'operator') && !s.flags.includes('termin_ditahan') && s.hari >= (s.politik.jeda['ingat:operator'] ?? 0)) {
    s.politik.jeda['ingat:operator'] = s.hari + 90;
    catat('buruk', 'Kursi operator sistem desa kosong. Laporan Siskeudes bisa telat dan termin dana desa ikut tertahan. Rekrut operator di menu pegawai.');
  }
  // sanksi baru berlaku setidaknya 30 hari setelah peringatan pertama
  const sudahDiingatkan = (s.politik.jeda['ingat:operator'] ?? Infinity) - 90 <= s.hari - 30;
  if (kosong(s, 'operator') && sudahDiingatkan && nextRandom(s) < 0.15 && !s.flags.includes('termin_ditahan')) {
    s.flags = [...s.flags, 'termin_ditahan'];
    s.alasanTerminDitahan = 'laporan Siskeudes telat karena kursi operator kosong';
    catat('buruk', 'Laporan Siskeudes desa telat diunggah karena tidak ada operator. Termin dana desa berikutnya tertahan.');
  }

  // Petugas Kebersihan
  if (kosong(s, 'kebersihan')) {
    s.indeks.lingkungan = clamp(s.indeks.lingkungan - 0.5);
    s.kepuasan.pkk = clamp(s.kepuasan.pkk - 0.3);
    if (nextRandom(s) < 0.08) {
      s.indeks.lingkungan = clamp(s.indeks.lingkungan - 2);
      s.popularitas = clamp(s.popularitas - 1);
      catat('buruk', 'Sampah menyumbat selokan. Hujan semalam membuat jalan desa tergenang dan bau.');
    }
  }

  // Penyuluh Agama
  if (kosong(s, 'penyuluh_agama')) s.kepuasan.tokoh = clamp(s.kepuasan.tokoh - 0.3);
  else if (relasi && jabatanTerbuka(s, 'penyuluh_agama')) relasi.bpd = clamp(relasi.bpd + 0.5 * kuat(s, 'penyuluh_agama'));

  // Penyuluh Pertanian
  if (kosong(s, 'penyuluh_tani') && nextRandom(s) < 0.1) {
    s.kepuasan.petani = clamp(s.kepuasan.petani - 4);
    s.indeks.ekonomi = clamp(s.indeks.ekonomi - 1);
    catat('buruk', 'Hama wereng menyerang sawah dan tidak ada penyuluh yang memandu penanganannya. Sebagian petani gagal panen.');
  }

  // Pelatih Olahraga
  if (kosong(s, 'pelatih')) {
    const peluang = kuat(s, 'linmas') > 0 ? 0.04 : 0.08;
    if (nextRandom(s) < peluang) {
      s.kepuasan.pemuda = clamp(s.kepuasan.pemuda - 2);
      s.popularitas = clamp(s.popularitas - 1);
      catat('buruk', 'Pemuda desa tawuran dengan pemuda desa tetangga setelah balapan liar. Videonya beredar di grup.');
    }
  }

  // Guru PAUD
  if (sudahBangun(s, 'paud')) {
    if (kosong(s, 'guru_paud')) s.kepuasan.pkk = clamp(s.kepuasan.pkk - 0.5);
    else if (jabatanTerbuka(s, 'guru_paud')) s.indeks.sosial = clamp(s.indeks.sosial + 0.3 * kuat(s, 'guru_paud'));
  }
}

// Aksi massa: demo warga, mogok perangkat, mogok buruh proyek, dan blokade jalan.
//
// Muncul dari keadaan desa (kelompok yang kecewa, gosip korupsi, honor telat, proyek berjalan), berefek
// setiap hari selama berlangsung, dan makin panas kalau dibiarkan sampai akhirnya ricuh.
// Kades bisa menemui massa, memenuhi tuntutan, atau membubarkan dengan polisi, tentara, atau ormas.
// Semua acak memakai RNG ber-seed di state (deterministik).
import { arus } from './arus.ts';
import { GROUPS } from './content/groups.ts';
import { GameError } from './errors.ts';
import { nextRandom } from './rng.ts';
import type { GroupId, VillageState } from './types.ts';

const JT = 1_000_000;

export type JenisUnjuk = 'demo' | 'mogok_perangkat' | 'mogok_buruh' | 'blokade';
export type CaraTangani = 'temui' | 'penuhi' | 'polisi' | 'tentara' | 'ormas' | 'biarkan';

export interface StateUnjuk {
  id: string;
  jenis: JenisUnjuk;
  kelompok: GroupId;
  tuntutan: string;
  massa: number;
  /** 0..100; 100 = ricuh. */
  intensitas: number;
  mulaiHari: number;
  /** Penanganan yang sedang tampil di peta (aparat/ormas berjaga) sampai hari ini. */
  penanganan?: { cara: CaraTangani; sampaiHari: number; berhasil: boolean } | null;
  /** Upaya temui yang gagal: tidak bisa dicoba lagi untuk aksi ini. */
  temuiGagal?: boolean;
}

const TUNTUTAN: Record<GroupId, string> = {
  petani: 'Harga pupuk mencekik, irigasi rusak, minta desa turun tangan',
  pedagang: 'Retribusi pasar kemahalan dan jalan ke pasar rusak',
  pemuda: 'Lapangan kerja dan fasilitas pemuda tidak pernah dipikirkan',
  pkk: 'Posyandu tidak layak dan bantuan sembako tidak merata',
  tokoh: 'Transparansi dana desa: ke mana uangnya?',
  perantau: 'Jalan dan internet desa tertinggal, perantau malu pulang',
};

const NAMA_JENIS: Record<JenisUnjuk, string> = {
  demo: 'Demo warga',
  mogok_perangkat: 'Mogok perangkat desa',
  mogok_buruh: 'Mogok buruh proyek',
  blokade: 'Blokade jalan',
};

const namaKelompok = (g: GroupId) => GROUPS.find((x) => x.id === g)?.nama ?? g;
const clamp = (n: number) => Math.max(0, Math.min(100, n));

function jiwa(s: VillageState, g: GroupId): number {
  return s.penduduk?.[g] ?? GROUPS.find((x) => x.id === g)?.jiwa ?? 100;
}

function mulai(s: VillageState, jenis: JenisUnjuk, kelompok: GroupId, tuntutan: string, catat: Catat) {
  const massa = Math.max(15, Math.round(jiwa(s, kelompok) * (0.05 + nextRandom(s) * 0.08)));
  s.unjuk = { id: `u${s.nomorUrut++}`, jenis, kelompok, tuntutan, massa, intensitas: 20, mulaiHari: s.hari, penanganan: null };
  const lokasi = jenis === 'demo' ? 'di depan kantor desa' : jenis === 'blokade' ? 'di jalan utama desa' : jenis === 'mogok_buruh' ? 'di lokasi proyek' : 'di kantor desa';
  catat('buruk', `${NAMA_JENIS[jenis]}: sekitar ${massa} ${jenis === 'mogok_perangkat' ? 'perangkat dan staf' : namaKelompok(kelompok).toLowerCase()} berkumpul ${lokasi}. Tuntutan: ${tuntutan}.`);
}

type Catat = (j: 'baik' | 'buruk' | 'info' | 'politik', t: string) => void;

/** Dipanggil setiap hari: picu aksi baru, jalankan efek aksi yang sedang berlangsung. */
export function harianUnjuk(s: VillageState, catat: Catat): void {
  const u = s.unjuk;
  if (u) {
    // aparat/ormas selesai berjaga: aksi bubar kalau penanganan berhasil
    if (u.penanganan && s.hari >= u.penanganan.sampaiHari) {
      if (u.penanganan.berhasil) {
        s.unjuk = null;
        s.unjukTerakhir = s.hari;
        return;
      }
      u.penanganan = null;
    }
    if (u.penanganan?.berhasil) return;
    efekHarian(s, u, catat);
    return;
  }
  if (s.hari - (s.unjukTerakhir ?? -999) < 25 || s.hari < 20) return;

  // mogok perangkat: honor telat (kas minus)
  if (s.kas < 0 && nextRandom(s) < 0.08) {
    mulai(s, 'mogok_perangkat', 'tokoh', 'Honor perangkat dan RT belum dibayar, kami tidak mau kerja dulu', catat);
    return;
  }
  // mogok buruh proyek: hanya saat ada pembangunan
  if (s.proyekBerjalan.length > 0 && nextRandom(s) < (s.kas < 0 ? 0.03 : 0.006)) {
    mulai(s, 'mogok_buruh', 'pemuda', 'Upah buruh proyek telat dan di bawah UMR, minta dinaikkan', catat);
    return;
  }
  // demo / blokade dari kelompok yang paling kecewa
  let terburuk: GroupId = 'petani';
  for (const g of Object.keys(s.kepuasan) as GroupId[]) if (s.kepuasan[g] < s.kepuasan[terburuk]) terburuk = g;
  const k = s.kepuasan[terburuk];
  const gosip = s.politik?.kecurigaan ?? 0;
  const peluang = (k < 35 ? ((35 - k) / 35) * 0.035 : 0) + (gosip > 60 ? (gosip - 60) / 1500 : 0);
  if (peluang > 0 && nextRandom(s) < peluang) {
    const transparansi = gosip > 60 && nextRandom(s) < 0.5;
    const kelompok: GroupId = transparansi ? 'tokoh' : terburuk;
    const jenis: JenisUnjuk = !transparansi && (kelompok === 'petani' || kelompok === 'pedagang') && nextRandom(s) < 0.35 ? 'blokade' : 'demo';
    mulai(s, jenis, kelompok, TUNTUTAN[kelompok], catat);
  }
}

function efekHarian(s: VillageState, u: StateUnjuk, catat: Catat) {
  const kuat = 0.5 + u.intensitas / 100;
  if (u.jenis === 'demo') {
    s.popularitas = clamp(s.popularitas - 0.4 * kuat);
    s.kepuasan[u.kelompok] = clamp(s.kepuasan[u.kelompok] - 0.3 * kuat);
  } else if (u.jenis === 'blokade') {
    s.kepuasan.pedagang = clamp(s.kepuasan.pedagang - 0.5 * kuat);
    s.popularitas = clamp(s.popularitas - 0.2 * kuat);
  } else if (u.jenis === 'mogok_buruh') {
    // semua pembangunan berhenti: tanggal selesai mundur
    for (const p of s.proyekBerjalan) p.selesaiHari += 1;
    if (s.mega && !s.mega.mangkrak) s.mega.selesaiHari += 1;
  } else if (u.jenis === 'mogok_perangkat') {
    s.popularitas = clamp(s.popularitas - 0.2 * kuat);
    // honor dibayar (kas kembali positif): perangkat kembali bekerja
    if (s.kas > 0 && s.hari - u.mulaiHari >= 2) {
      catat('baik', 'Honor perangkat dibayar. Kantor desa kembali buka dan iuran warga kembali ditagih.');
      s.unjuk = null;
      s.unjukTerakhir = s.hari;
      return;
    }
  }
  u.intensitas = Math.min(100, u.intensitas + (u.jenis === 'mogok_perangkat' ? 3 : 4));
  if (u.intensitas >= 100) ricuh(s, u, catat);
}

function ricuh(s: VillageState, u: StateUnjuk, catat: Catat) {
  const rusak = Math.round((10 + nextRandom(s) * 30) * JT);
  arus(s, 'Keputusan & kejadian', -rusak);
  s.popularitas = clamp(s.popularitas - 8);
  s.politik.kecurigaan = clamp(s.politik.kecurigaan + 6);
  for (const g of Object.keys(s.kepuasan) as GroupId[]) s.kepuasan[g] = clamp(s.kepuasan[g] - 3);
  catat(
    'buruk',
    `${NAMA_JENIS[u.jenis]} berakhir RICUH. ${u.jenis === 'blokade' ? 'Ban dibakar di tengah jalan' : 'Kaca kantor desa pecah'}, kerugian Rp ${Math.round(rusak / JT)} jt, videonya viral dan inspektorat ikut memantau.`,
  );
  s.unjuk = null;
  s.unjukTerakhir = s.hari;
}

/** Faktor pemasukan iuran/retribusi harian selama aksi berlangsung. */
export function faktorKoinUnjuk(s: VillageState): { rumah: number; usaha: number } {
  const u = s.unjuk;
  if (!u || u.penanganan?.berhasil) return { rumah: 1, usaha: 1 };
  if (u.jenis === 'mogok_perangkat') return { rumah: 0, usaha: 0.5 };
  if (u.jenis === 'blokade') return { rumah: 0.7, usaha: 0.4 };
  return { rumah: 1, usaha: 1 };
}

/** Biaya memenuhi tuntutan (kas desa). */
export function biayaTuntutan(u: StateUnjuk): number {
  const per = u.jenis === 'mogok_buruh' ? 400_000 : u.jenis === 'mogok_perangkat' ? 300_000 : 150_000;
  return Math.max(5 * JT, Math.round((u.massa * per) / JT) * JT);
}

export const CARA: Record<CaraTangani, { label: string; teks: string }> = {
  temui: { label: 'Temui massa, bicara baik-baik', teks: 'Gratis. Berhasil kalau warga percaya padamu (popularitas & integritas). Gagal: massa makin panas.' },
  penuhi: { label: 'Penuhi tuntutan', teks: 'Bayar dari kas desa. Hampir pasti bubar dan warga senang.' },
  polisi: { label: 'Minta polisi membubarkan', teks: 'Efektif. Warga kesal, ada risiko bentrok.' },
  tentara: { label: 'Minta bantuan tentara', teks: 'Paling ampuh, tapi warga takut dan beritanya bisa viral.' },
  ormas: { label: 'Kerahkan ormas untuk menghadang', teks: 'Murah dari kantong sendiri, tapi rawan ricuh dan gosip korupsi naik.' },
  biarkan: { label: 'Biarkan saja', teks: 'Tidak ada biaya sekarang. Massa makin panas setiap hari.' },
};

export function tanganiUnjuk(s: VillageState, cara: CaraTangani): string {
  const u = s.unjuk;
  if (!u) throw new GameError('Tidak ada aksi massa saat ini.');
  if (u.penanganan?.berhasil) throw new GameError('Aksi ini sedang dibubarkan.');
  const g = u.kelompok;
  const r = nextRandom(s);
  const selesai = (cara: CaraTangani, hari = 1) => {
    u.penanganan = { cara, sampaiHari: s.hari + hari, berhasil: true };
  };

  if (cara === 'biarkan') {
    u.intensitas = Math.min(100, u.intensitas + 5);
    return 'Kades memilih menunggu. Massa makin berani.';
  }
  if (cara === 'temui') {
    if (u.temuiGagal) throw new GameError('Massa sudah menolak bertemu lagi. Pilih cara lain.');
    const peluang = Math.min(0.9, 0.2 + s.popularitas / 250 + s.integritas / 300 - u.intensitas / 400);
    if (r < peluang) {
      selesai('temui');
      s.kepuasan[g] = clamp(s.kepuasan[g] + 6);
      s.popularitas = clamp(s.popularitas + 3);
      s.integritas = clamp(s.integritas + 1);
      return `Kades duduk lesehan bersama massa dan mendengar tuntutan satu per satu. Suasana mencair, ${namaKelompok(g).toLowerCase()} pulang dengan tenang.`;
    }
    u.temuiGagal = true;
    u.intensitas = Math.min(100, u.intensitas + 15);
    s.popularitas = clamp(s.popularitas - 2);
    return 'Kades disoraki saat naik ke mobil komando. Massa makin panas.';
  }
  if (cara === 'penuhi') {
    const biaya = biayaTuntutan(u);
    if (s.kas < biaya) throw new GameError(`Kas tidak cukup memenuhi tuntutan (butuh Rp ${Math.round(biaya / JT)} jt).`);
    arus(s, 'Keputusan & kejadian', -biaya);
    selesai('penuhi');
    s.kepuasan[g] = clamp(s.kepuasan[g] + 10);
    s.popularitas = clamp(s.popularitas + 2);
    return `Tuntutan dipenuhi (Rp ${Math.round(biaya / JT)} jt). Massa bubar sambil bertepuk tangan.`;
  }
  if (cara === 'polisi') {
    arus(s, 'Keputusan & kejadian', -3 * JT); // konsumsi dan uang lelah aparat
    s.kepuasan[g] = clamp(s.kepuasan[g] - 6);
    s.popularitas = clamp(s.popularitas - 2);
    s.integritas = clamp(s.integritas - 1);
    if (r < 0.2) {
      s.popularitas = clamp(s.popularitas - 6);
      s.politik.kecurigaan = clamp(s.politik.kecurigaan + 3);
      selesai('polisi', 2);
      return 'Polisi membubarkan massa, tapi sempat terjadi dorong-dorongan dan beberapa warga terluka. Warga menyalahkan kades.';
    }
    selesai('polisi', 2);
    return 'Polisi datang dan meminta massa membubarkan diri. Aksi bubar, tapi warga pulang dengan kesal.';
  }
  if (cara === 'tentara') {
    s.kepuasan[g] = clamp(s.kepuasan[g] - 10);
    for (const k of Object.keys(s.kepuasan) as GroupId[]) s.kepuasan[k] = clamp(s.kepuasan[k] - 2);
    s.popularitas = clamp(s.popularitas - 5);
    s.integritas = clamp(s.integritas - 3);
    if (r < 0.35) {
      s.politik.kecurigaan = clamp(s.politik.kecurigaan + 6);
      selesai('tentara', 2);
      return 'Truk tentara masuk desa dan massa langsung bubar. Fotonya viral: "Kades kerahkan tentara hadapi warga sendiri."';
    }
    selesai('tentara', 2);
    return 'Babinsa dan pasukan datang, massa langsung bubar. Desa sepi dan warga enggan bicara.';
  }
  // ormas: dibayar dari kantong pribadi kades
  if (s.politik.dompet < 10 * JT) throw new GameError('Uang pribadimu kurang untuk membayar ormas (butuh Rp 10 jt).');
  s.politik.dompet -= 10 * JT;
  s.politik.kecurigaan = clamp(s.politik.kecurigaan + 6);
  s.integritas = clamp(s.integritas - 5);
  s.kepuasan[g] = clamp(s.kepuasan[g] - 5);
  s.flags = [...new Set([...(s.flags ?? []), 'ormas_dibayar'])];
  if (r < 0.4) {
    u.penanganan = { cara: 'ormas', sampaiHari: s.hari + 1, berhasil: false };
    u.intensitas = Math.min(100, u.intensitas + 30);
    s.popularitas = clamp(s.popularitas - 4);
    return 'Ormas bayaran datang menghadang, tapi massa melawan. Bentrokan pecah dan aksi makin besar.';
  }
  selesai('ormas', 2);
  s.popularitas = clamp(s.popularitas - 2);
  return 'Ormas bayaran menghadang dan massa mundur. Warga tahu siapa yang membayar mereka.';
}

export function viewUnjuk(s: VillageState) {
  const u = s.unjuk;
  if (!u) return null;
  return {
    id: u.id,
    jenis: u.jenis,
    nama: NAMA_JENIS[u.jenis],
    kelompok: u.kelompok,
    namaKelompok: u.jenis === 'mogok_perangkat' ? 'Perangkat desa' : namaKelompok(u.kelompok),
    tuntutan: u.tuntutan,
    massa: u.massa,
    intensitas: Math.round(u.intensitas),
    hari: s.hari - u.mulaiHari + 1,
    penanganan: u.penanganan ?? null,
    biayaTuntutan: biayaTuntutan(u),
    temuiGagal: Boolean(u.temuiGagal),
    efek:
      u.jenis === 'demo'
        ? 'Popularitas dan kepuasan kelompok turun setiap hari'
        : u.jenis === 'blokade'
          ? 'Pedagang rugi, iuran dan retribusi berkurang'
          : u.jenis === 'mogok_buruh'
            ? 'Semua pembangunan berhenti, tanggal selesai mundur'
            : 'Iuran warga berhenti masuk sampai honor dibayar',
    cara: (Object.keys(CARA) as CaraTangani[]).map((id) => ({ id, ...CARA[id] })),
  };
}

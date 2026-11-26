// Wakil kades sebagai pemain politik: punya pamor sendiri (panggung), bisa ditugaskan, bisa digoyang isu
// ijazah sampai ke persidangan, dan bisa dimakzulkan lewat BPD. Semua tokoh dan kejadian fiktif.
import { arus } from './arus.ts';
import { GameError } from './errors.ts';
import { nextRandom } from './rng.ts';
import { GROUPS } from './content/groups.ts';
import { cekJeda, stateRelasi, ubahRelasi, wakilMembelot, type LatarWakil, type StateRelasi, type Wakil } from './relasi.ts';
import type { GroupId, VillageState } from './types.ts';

const JT = 1_000_000;
const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

export type TugasWakil = 'blusukan' | 'lobi' | 'redam_bpd';

export const TUGAS_WAKIL: Record<TugasWakil, { nama: string; teks: string; biaya: number }> = {
  blusukan: { nama: 'Blusukan ke warga', teks: 'Wakil turun ke kelompok warga yang paling kecewa. Popularitas dan kepuasan kelompok itu naik.', biaya: 2 * JT },
  lobi: { nama: 'Lobi ke kabupaten', teks: 'Wakil menemui camat dan bupati. Hasilnya lebih besar kalau wakil punya jalur keluarga di kabupaten.', biaya: 3 * JT },
  redam_bpd: { nama: 'Redam BPD', teks: 'Wakil mengajak anggota BPD ngopi dan mendengar keluhan mereka. Dukungan BPD naik.', biaya: 2 * JT },
};
export const JEDA_TUGAS_WAKIL = 20;
const JEDA_MAKZUL_WAKIL = 90;
const LAMA_SIDANG_MAKZUL = 15;

/** Latar yang punya beking di kabupaten: tidak bisa diberhentikan sepihak selama bupati masih dekat. */
const BERBEKING: LatarWakil[] = ['anak_pejabat', 'keponakan_bupati'];

export interface MakzulWakil {
  mulaiHari: number;
  batasHari: number;
  alasan: 'ijazah' | 'belot' | 'politik';
  /** true kalau kades yang mengusulkan; false kalau BPD bergerak sendiri (mis. setelah ijazah terbukti palsu). */
  olehKades: boolean;
  /** Usul dari kartu: pesan jurnal belum ditulis. */
  belumDicatat?: boolean;
}

export interface KasusIjazah {
  sikap: 'uji' | 'bela' | 'diam';
  sidang?: 'terbuka' | 'tunda' | 'lobi';
}

export interface EfekWakil {
  loyalitas?: number;
  panggung?: number;
  ambisi?: number;
  sikapIjazah?: KasusIjazah['sikap'];
  sidang?: NonNullable<KasusIjazah['sidang']>;
  /** Kades mengusulkan pemakzulan wakil ke BPD. */
  makzul?: boolean;
}

function hash(t: string): number {
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Pamor awal per latar: wajah muda yang viral mulai tinggi, guru honorer mulai rendah. */
export function panggungAwal(latar: LatarWakil, r: number): number {
  const dasar: Partial<Record<LatarWakil, number>> = { anak_pejabat: 62, rival_pilkades: 48, kader_partai: 42, keponakan_bupati: 38, mantan_aktivis: 40 };
  return Math.round((dasar[latar] ?? 28) + r * 10);
}

/** Ijazah palsu atau tidak: tersembunyi dari pemain, tetap untuk satu orang. */
export function ijazahAwal(latar: LatarWakil, r: number): 'asli' | 'palsu' {
  return r < (latar === 'anak_pejabat' ? 0.5 : 0.12) ? 'palsu' : 'asli';
}

export function panggung(w: Wakil): number {
  return w.panggung ?? 30;
}

function ijazahPalsu(w: Wakil): boolean {
  const i = w.ijazah ?? ijazahAwal(w.latar, (hash(`${w.nama}|${w.id}|ijazah`) % 1000) / 1000);
  w.ijazah = i;
  return i === 'palsu';
}

// ---------------------------------------------------------------- aksi pemain

export function tugaskanWakil(s: VillageState, tugas: TugasWakil | undefined): string {
  const r = stateRelasi(s);
  const w = r.wakil;
  if (!w) throw new GameError('Belum ada wakil kades.');
  const def = tugas ? TUGAS_WAKIL[tugas] : undefined;
  if (!tugas || !def) throw new GameError('Pilih tugas: blusukan, lobi, atau redam_bpd.');
  if (r.makzulWakil) throw new GameError('Wakil sedang menghadapi sidang pemakzulan di BPD. Dia tidak mau menerima tugas.');
  cekJeda(s, r, 'wakil:tugas', 'Menugaskan wakil');
  if (s.kas < def.biaya) throw new GameError(`Kas kurang untuk biaya tugas wakil (Rp ${Math.round(def.biaya / JT)} jt).`);
  arus(s, 'Operasional kantor', -def.biaya);
  r.jeda['wakil:tugas'] = s.hari + JEDA_TUGAS_WAKIL;
  const setia = w.loyalitas >= 50;
  const k = setia ? 1 : 0.5;
  w.panggung = clamp(panggung(w) + (setia ? 2 : 6));
  let hasil: string;
  if (tugas === 'blusukan') {
    const g = [...GROUPS].sort((a, b) => s.kepuasan[a.id] - s.kepuasan[b.id])[0];
    const viral = w.latar === 'anak_pejabat' || panggung(w) >= 60;
    const pop = Math.round((viral ? 3 : 2) * k);
    const puas = Math.round(4 * k);
    s.popularitas = clamp(s.popularitas + pop);
    s.kepuasan[g.id as GroupId] = clamp(s.kepuasan[g.id as GroupId] + puas);
    hasil = `${w.nama} blusukan ke ${g.nama.toLowerCase()}${viral ? ' dan videonya ramai dibagikan' : ''}. (popularitas +${pop}, ${g.nama} +${puas})`;
  } else if (tugas === 'lobi') {
    const jalur = BERBEKING.includes(w.latar) ? 2 : 1;
    const b = Math.round(4 * jalur * k);
    const c = Math.round(4 * k);
    ubahRelasi(r, 'bupati', b);
    ubahRelasi(r, 'camat', c);
    hasil = `${w.nama} melobi ke kabupaten${jalur > 1 ? ' lewat jalur keluarga' : ''}. (relasi bupati +${b}, camat +${c})`;
  } else {
    const pandai = (['rival_pilkades', 'mantan_aktivis', 'kader_partai'] as LatarWakil[]).includes(w.latar) ? 1.5 : 1;
    const n = Math.round(6 * pandai * k);
    r.bpd = clamp(r.bpd + n);
    hasil = `${w.nama} mengajak anggota BPD ngopi dan mendengar keluhan mereka. (BPD +${n})`;
  }
  if (!setia) {
    w.ambisi = clamp(w.ambisi + 3);
    hasil += ` Tapi ${w.nama} lebih sibuk tampil sendiri: hasilnya cuma separuh, dan fotonya lebih banyak dari namamu. (pamor wakil +6, ambisi +3)`;
  }
  return `${hasil} Biaya Rp ${Math.round(def.biaya / JT)} jt dari kas.`;
}

export function peluangMakzulWakil(s: VillageState, r: StateRelasi, alasan: MakzulWakil['alasan']): number {
  const w = r.wakil;
  if (!w) return 0;
  const dasar = alasan === 'ijazah' ? 0.85 : alasan === 'belot' ? 0.55 : 0.3;
  const dukungBpd = (r.bpd - 50) / 100;
  const beking = BERBEKING.includes(w.latar) ? Math.max(0, (r.tokoh.bupati.relasi - 30) / 200) : 0;
  const pamor = panggung(w) / 400;
  return Math.max(0.05, Math.min(0.95, dasar + dukungBpd - beking - pamor));
}

function alasanMakzul(r: StateRelasi): MakzulWakil['alasan'] {
  const w = r.wakil!;
  return w.ijazahTerbukti ? 'ijazah' : wakilMembelot(r) ? 'belot' : 'politik';
}

const TEKS_ALASAN: Record<MakzulWakil['alasan'], string> = {
  ijazah: 'ijazah yang terbukti tidak sah',
  belot: 'manuver politik melawan kades',
  politik: 'ketidakcocokan dengan kades',
};

export function usulMakzulWakil(s: VillageState, olehKades = true): string {
  const r = stateRelasi(s);
  const w = r.wakil;
  if (!w) throw new GameError('Belum ada wakil kades.');
  if (r.makzulWakil) throw new GameError('Sidang pemakzulan wakil di BPD sudah berjalan.');
  if (olehKades) cekJeda(s, r, 'wakil:makzul', 'Mengusulkan pemakzulan wakil');
  const alasan = alasanMakzul(r);
  r.makzulWakil = { mulaiHari: s.hari, batasHari: s.hari + LAMA_SIDANG_MAKZUL, alasan, olehKades };
  if (olehKades) {
    r.jeda['wakil:makzul'] = s.hari + JEDA_MAKZUL_WAKIL;
    w.loyalitas = clamp(w.loyalitas - 20);
  }
  const peluang = Math.round(peluangMakzulWakil(s, r, alasan) * 100);
  return `${olehKades ? 'Kades mengusulkan' : 'BPD menggulirkan'} pemakzulan wakil kades ${w.nama} dengan alasan ${TEKS_ALASAN[alasan]}. BPD bersidang dan memutuskan ${LAMA_SIDANG_MAKZUL} hari lagi (peluang lolos sekitar ${peluang}%).${olehKades ? ' (loyalitas wakil -20)' : ''}`;
}

/** Wakil berbeking tidak bisa diberhentikan sepihak selama bupati masih dekat. */
export function cekBolehBerhentikan(r: StateRelasi): void {
  const w = r.wakil;
  if (w && BERBEKING.includes(w.latar) && r.tokoh.bupati.relasi >= 40) {
    throw new GameError(`${w.nama} punya beking di kabupaten. Bupati tidak akan meneken pemberhentian sepihak; usulkan pemakzulan lewat BPD (aksi makzulkan).`);
  }
}

// ---------------------------------------------------------------- efek kartu

export function efekWakil(s: VillageState, e: EfekWakil): void {
  const r = stateRelasi(s);
  const w = r.wakil;
  if (!w) return;
  if (e.loyalitas) w.loyalitas = clamp(w.loyalitas + e.loyalitas);
  if (e.panggung) w.panggung = clamp(panggung(w) + e.panggung);
  if (e.ambisi) w.ambisi = clamp(w.ambisi + e.ambisi);
  if (e.sikapIjazah) r.kasusIjazah = { sikap: e.sikapIjazah };
  if (e.sidang) r.kasusIjazah = { sikap: r.kasusIjazah?.sikap ?? 'diam', sidang: e.sidang };
  if (e.makzul && !r.makzulWakil) {
    // dipicu kartu: tetap lewat sidang BPD; pesannya dicatat saat harian
    r.makzulWakil = { mulaiHari: s.hari, batasHari: s.hari + LAMA_SIDANG_MAKZUL, alasan: alasanMakzul(r), olehKades: true, belumDicatat: true };
    r.jeda['wakil:makzul'] = s.hari + JEDA_MAKZUL_WAKIL;
    w.loyalitas = clamp(w.loyalitas - 20);
  }
}

export function describeEfekWakil(e: EfekWakil): string[] {
  const out: string[] = [];
  const tanda = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  if (e.loyalitas) out.push(`Loyalitas wakil ${tanda(e.loyalitas)}`);
  if (e.panggung) out.push(`Pamor wakil ${tanda(e.panggung)}`);
  if (e.ambisi) out.push(`Ambisi wakil ${tanda(e.ambisi)}`);
  if (e.makzul) out.push('Usul pemakzulan wakil ke BPD (loyalitas wakil -20)');
  return out;
}

// ---------------------------------------------------------------- harian dan bulanan

type Catat = (j: 'baik' | 'buruk' | 'info' | 'politik', t: string) => void;

function selesaiWakil(r: StateRelasi): void {
  r.wakil = null;
  r.makzulWakil = null;
  r.kasusIjazah = null;
}

function putuskanIjazah(s: VillageState, r: StateRelasi, catat: Catat): void {
  const w = r.wakil!;
  const k = r.kasusIjazah!;
  r.kasusIjazah = null;
  w.ijazahDiuji = true;
  const palsu = ijazahPalsu(w);
  if (k.sidang === 'lobi') {
    if (palsu && nextRandom(s) < 0.5) {
      s.politik.kecurigaan = clamp(s.politik.kecurigaan + 8);
      w.loyalitas = clamp(w.loyalitas + 10);
      w.panggung = clamp(panggung(w) - 5);
      catat('politik', `Majelis menolak gugatan ijazah ${w.nama} karena "kurang bukti". Bisik-bisik soal kenalan bupati beredar di warung kopi. (gosip +8, loyalitas wakil +10)`);
      return;
    }
    if (palsu) {
      s.integritas = clamp(s.integritas - 10);
      s.politik.kecurigaan = clamp(s.politik.kecurigaan + 15);
      s.popularitas = clamp(s.popularitas - 6);
      catat('buruk', `Upaya kades menitip pesan ke majelis bocor ke wartawan. Ijazah ${w.nama} dinyatakan tidak sah. (integritas -10, gosip +15, popularitas -6)`);
      ijazahTerbongkar(s, r, w, k, catat, true);
      return;
    }
    s.politik.kecurigaan = clamp(s.politik.kecurigaan + 6);
    w.panggung = clamp(panggung(w) + 6);
    catat('politik', `Ijazah ${w.nama} dinyatakan sah. Lobinya ternyata tidak perlu, tapi kabar "kades titip pesan ke majelis" terlanjur beredar. (gosip +6)`);
    return;
  }
  if (k.sidang === 'tunda') {
    if (palsu) {
      s.integritas = clamp(s.integritas - 4);
      catat('buruk', `Majelis menolak alasan berkas kebanjiran dan memutus tanpa berkas desa: ijazah ${w.nama} tidak terbukti asli. Warga menilai kantor desa ikut menutupi. (integritas -4)`);
      ijazahTerbongkar(s, r, w, k, catat, false);
      return;
    }
    s.popularitas = clamp(s.popularitas - 2);
    w.panggung = clamp(panggung(w) + 4);
    catat('politik', `Sidang ijazah ${w.nama} ditunda dua kali sebelum akhirnya dinyatakan sah. Warga lelah menunggu. (popularitas -2)`);
    return;
  }
  if (palsu) {
    catat('buruk', `Majelis memeriksa berkas yang diserahkan kantor desa. Ijazah ${w.nama} dinyatakan tidak sah: sekolahnya sudah tutup dua tahun sebelum tahun lulus yang tertulis.`);
    ijazahTerbongkar(s, r, w, k, catat, false);
    return;
  }
  w.panggung = clamp(panggung(w) + 8);
  if (k.sikap === 'bela') w.loyalitas = clamp(w.loyalitas + 6);
  if (k.sikap === 'uji') s.integritas = clamp(s.integritas + 2);
  catat('baik', `Majelis menyatakan ijazah ${w.nama} sah. Penggugat diminta meminta maaf terbuka.${k.sikap === 'bela' ? ' Wakil berterima kasih karena kades pasang badan. (loyalitas +6)' : k.sikap === 'uji' ? ' Kades dinilai adil karena mau menguji terbuka. (integritas +2)' : ''} (pamor wakil +8)`);
}

function ijazahTerbongkar(s: VillageState, r: StateRelasi, w: Wakil, k: KasusIjazah, catat: Catat, sudahDihukum: boolean): void {
  w.ijazahTerbukti = true;
  w.panggung = clamp(panggung(w) - 25);
  if (!sudahDihukum && k.sikap === 'bela') {
    s.integritas = clamp(s.integritas - 6);
    s.popularitas = clamp(s.popularitas - 5);
    catat('buruk', 'Kades yang dulu pasang badan ikut kena getahnya. (integritas -6, popularitas -5)');
  } else if (k.sikap === 'uji') {
    s.integritas = clamp(s.integritas + 3);
    s.popularitas = clamp(s.popularitas + 3);
    catat('baik', 'Warga memuji kades yang sejak awal meminta uji terbuka. (integritas +3, popularitas +3)');
  }
  if (!r.makzulWakil) catat('politik', usulMakzulWakil(s, false));
}

function putuskanMakzul(s: VillageState, r: StateRelasi, catat: Catat): void {
  const m = r.makzulWakil!;
  const w = r.wakil!;
  r.makzulWakil = null;
  const peluang = peluangMakzulWakil(s, r, m.alasan);
  if (nextRandom(s) < peluang) {
    const backed = BERBEKING.includes(w.latar);
    if (backed) ubahRelasi(r, 'bupati', -10);
    if (w.ambisi >= 60) s.flags = [...new Set([...(s.flags ?? []), 'mantan_wakil_dendam'])];
    if (m.alasan === 'ijazah') {
      s.integritas = clamp(s.integritas + 2);
      s.popularitas = clamp(s.popularitas + 3);
    } else if (m.alasan === 'politik') {
      s.popularitas = clamp(s.popularitas - 2);
    }
    selesaiWakil(r);
    catat(
      'politik',
      `BPD memakzulkan wakil kades ${w.nama} (${TEKS_ALASAN[m.alasan]}). Kursi wakil kosong; pilih calon baru di tab Politik.${backed ? ' Kabupaten tidak senang. (relasi bupati -10)' : ''}${m.alasan === 'ijazah' ? ' (integritas +2, popularitas +3)' : m.alasan === 'politik' ? ' Sebagian warga menilai kades tidak akur dengan wakilnya. (popularitas -2)' : ''}${w.ambisi >= 60 ? ' Dia pulang dengan dendam.' : ''}`,
    );
    return;
  }
  w.ambisi = clamp(w.ambisi + 10);
  w.panggung = clamp(panggung(w) + 8);
  if (m.olehKades) {
    r.bpd = clamp(r.bpd - 5);
    s.popularitas = clamp(s.popularitas - 3);
  }
  catat('buruk', `Usul pemakzulan wakil kades ${w.nama} kandas di BPD. Dia tampil sebagai korban dan makin percaya diri. (ambisi +10, pamor wakil +8${m.olehKades ? ', BPD -5, popularitas -3' : ''})`);
}

/** Dipanggil tiap hari dari harianRelasi. */
export function harianWakil(s: VillageState, r: StateRelasi, catat: Catat): void {
  if (!r.wakil) {
    r.makzulWakil = null;
    r.kasusIjazah = null;
  } else {
    if (r.kasusIjazah?.sidang) putuskanIjazah(s, r, catat);
    if (r.wakil && r.makzulWakil?.belumDicatat) {
      r.makzulWakil.belumDicatat = false;
      catat('politik', `Usul pemakzulan wakil kades ${r.wakil.nama} (${TEKS_ALASAN[r.makzulWakil.alasan]}) masuk ke BPD. Sidang ${Math.max(0, r.makzulWakil.batasHari - s.hari)} hari lagi (peluang lolos sekitar ${Math.round(peluangMakzulWakil(s, r, r.makzulWakil.alasan) * 100)}%).`);
    }
    if (r.wakil && r.makzulWakil && s.hari >= r.makzulWakil.batasHari) putuskanMakzul(s, r, catat);
  }
  // penanda untuk syarat kartu
  const w = r.wakil;
  const tanda = new Set<string>();
  if (w) {
    tanda.add('wk_ada');
    if (w.latar === 'anak_pejabat') tanda.add('wk_anak_pejabat');
    if (panggung(w) >= 60) tanda.add('wk_panggung');
    if (wakilMembelot(r) || (w.loyalitas < 40 && w.ambisi >= 60)) tanda.add('wk_belot');
    // isu ijazah tidak menimpa semua wakil: putra pejabat hampir selalu digoyang, yang lain sebagian saja
    const digoyang = w.latar === 'anak_pejabat' || hash(`${w.nama}|${w.id}|isu`) % 100 < 35;
    if (digoyang && !w.ijazahDiuji && !r.kasusIjazah && s.hari - (w.sejakHari ?? 0) >= 45) tanda.add('wk_ijazah');
  }
  s.flags = [...s.flags.filter((f) => !f.startsWith('wk_')), ...tanda];
}

/** Dipanggil tiap bulan: pamor wakil naik-turun sendiri. */
export function bulananWakil(r: StateRelasi): void {
  const w = r.wakil;
  if (!w) return;
  const p = panggung(w);
  if (w.latar === 'anak_pejabat') w.panggung = clamp(p + 1, 0, 85);
  else if (p > 30) w.panggung = p - 1;
  else if (p < 30) w.panggung = p + 1;
}

/**
 * Pengaruh wakil ke suara calon kades di pilkades (poin persen per kelompok): wakil setia yang pamornya tinggi
 * ikut mendulang suara (putra pejabat kuat di pemuda); wakil yang tidak setia diam-diam menggembosi.
 */
export function bonusSuaraWakil(s: VillageState, g: GroupId): number {
  const w = s.relasi?.wakil;
  if (!w) return 0;
  const p = panggung(w);
  if (w.loyalitas >= 60) return clamp((p - 50) / 10, -1, 4) + (w.latar === 'anak_pejabat' && g === 'pemuda' ? 3 : 0);
  if (w.loyalitas < 35) return -clamp((p - 40) / 15, 0, 3);
  return 0;
}

/** Kekuatan wakil yang membelot saat maju sebagai lawan di pilkades. */
export function kekuatanWakilLawan(w: Wakil): number {
  return Math.round(35 + w.ambisi / 6 + panggung(w) / 4);
}

export function viewWakilPolitik(s: VillageState, r: StateRelasi) {
  const w = r.wakil;
  const sisa = (k: string) => Math.max(0, (r.jeda[k] ?? 0) - s.hari);
  return {
    tugas: (Object.keys(TUGAS_WAKIL) as TugasWakil[]).map((id) => ({ id, ...TUGAS_WAKIL[id] })),
    jedaTugas: sisa('wakil:tugas'),
    jedaMakzul: sisa('wakil:makzul'),
    bisaDiberhentikan: !(w && BERBEKING.includes(w.latar) && r.tokoh.bupati.relasi >= 40),
    peluangMakzul: w ? Math.round(peluangMakzulWakil(s, r, alasanMakzul(r)) * 100) : 0,
    alasanMakzul: w ? TEKS_ALASAN[alasanMakzul(r)] : null,
    makzul: r.makzulWakil && w
      ? { sisaHari: Math.max(0, r.makzulWakil.batasHari - s.hari), alasan: TEKS_ALASAN[r.makzulWakil.alasan], olehKades: r.makzulWakil.olehKades, peluang: Math.round(peluangMakzulWakil(s, r, r.makzulWakil.alasan) * 100) }
      : null,
    kasusIjazah: r.kasusIjazah ? { sikap: r.kasusIjazah.sikap, sidang: r.kasusIjazah.sidang ?? null } : null,
  };
}


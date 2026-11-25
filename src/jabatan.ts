// Jabatan desa untuk keluarga kades: pilih posisinya sendiri dan gantikan pemegang lama.
// Jabatan organisasi desa (BUMDes, Karang Taruna, Kopdes, PKK, BPD) dipegang warga fiktif;
// jabatan pegawai kantor dipegang staf yang sedang bekerja dan harus diberhentikan dulu.
import { PEGAWAI } from './content/fitur.ts';
import { GameError } from './errors.ts';
import { syncPegawai } from './kepegawaian.ts';
import type { GroupId, VillageState } from './types.ts';

const JT = 1_000_000;

export interface JabatanDef {
  id: string;
  nama: string;
  pemegangAwal: string;
  /** Kelompok warga yang paling merasa kalau jabatan ini diambil keluarga kades. */
  kelompok: GroupId;
  elektabilitas: number;
  kompetensi: number;
  integritas: number;
  kecurigaan: number;
  /** Honor bulanan yang masuk ke keluarga (dompet kades). */
  honor: number;
  syaratProyek?: string;
  teks: string;
}

export const JABATAN_DESA: JabatanDef[] = [
  { id: 'ketua_pkk', nama: 'Ketua TP-PKK Desa', pemegangAwal: 'Bu Tini', kelompok: 'pkk', elektabilitas: 8, kompetensi: 4, integritas: -1, kecurigaan: 1, honor: 1 * JT, teks: 'Lazimnya dipegang pasangan kades. Ibu-ibu PKK jadi basis suara.' },
  { id: 'ketua_bumdes', nama: 'Ketua BUMDes', pemegangAwal: 'Pak Darmin', kelompok: 'pedagang', elektabilitas: 12, kompetensi: 6, integritas: -3, kecurigaan: 3, honor: 3 * JT, teks: 'Mengurus usaha desa. Terlihat sibuk dan sukses, tapi rawan disorot.' },
  { id: 'karang_taruna', nama: 'Ketua Karang Taruna', pemegangAwal: 'Mas Yoga', kelompok: 'pemuda', elektabilitas: 10, kompetensi: 4, integritas: -2, kecurigaan: 2, honor: 0, teks: 'Dekat dengan pemuda dan acara 17-an. Bagus untuk citra muda.' },
  { id: 'ketua_kopdes', nama: 'Ketua Koperasi Desa', pemegangAwal: 'Bu Wartini', kelompok: 'petani', elektabilitas: 12, kompetensi: 6, integritas: -3, kecurigaan: 4, honor: 3 * JT, syaratProyek: 'kopdes', teks: 'Memegang simpan pinjam dan gerai sembako. Petani bergantung padanya.' },
  { id: 'panitia_17', nama: 'Ketua Panitia 17-an', pemegangAwal: 'Pak Slamet', kelompok: 'tokoh', elektabilitas: 7, kompetensi: 2, integritas: -1, kecurigaan: 1, honor: 0, teks: 'Muncul di panggung tiap Agustus. Ringan, tapi sering dilihat warga.' },
  { id: 'ketua_bpd', nama: 'Ketua BPD', pemegangAwal: 'Pak Haji Somad', kelompok: 'tokoh', elektabilitas: 15, kompetensi: 5, integritas: -7, kecurigaan: 9, honor: 2 * JT, teks: 'Pengawas kades. Diisi keluarga sendiri = tidak ada yang mengawasi. Gosip pasti naik.' },
];

function pemegang(s: VillageState, id: string): string {
  s.jabatanDesa ??= {};
  return s.jabatanDesa[id] ?? JABATAN_DESA.find((j) => j.id === id)!.pemegangAwal;
}

/** Lepaskan jabatan lama anggota keluarga (dikembalikan ke warga). */
function lepasJabatanLama(s: VillageState, keluargaId: string) {
  s.jabatanDesa ??= {};
  for (const [id, h] of Object.entries(s.jabatanDesa)) if (h === `kel:${keluargaId}`) s.jabatanDesa[id] = JABATAN_DESA.find((j) => j.id === id)!.pemegangAwal;
  s.staf = (s.staf ?? []).filter((x) => x.keluargaId !== keluargaId);
}

export function angkatKeluarga(s: VillageState, keluargaId: string, jabatanId: string): string {
  const m = s.politik.keluarga.find((k) => k.id === keluargaId);
  if (!m) throw new GameError('Anggota keluarga tidak ditemukan.');
  const p = s.politik;
  const clamp = (n: number) => Math.max(0, Math.min(100, n));

  // jabatan pegawai kantor: gantikan staf yang sedang bekerja
  if (jabatanId.startsWith('staf:')) {
    const stafId = jabatanId.slice(5);
    const lama = (s.staf ?? []).find((x) => x.id === stafId);
    if (!lama) throw new GameError('Pegawai itu sudah tidak bekerja.');
    if (lama.keluargaId) throw new GameError('Posisi itu sudah dipegang keluarga sendiri.');
    const def = PEGAWAI.find((x) => x.id === lama.peran);
    lepasJabatanLama(s, keluargaId);
    s.staf = s.staf.filter((x) => x !== lama);
    s.staf.push({
      id: `st${s.nomorUrut++}`,
      peran: lama.peran,
      nama: m.nama,
      sifat: ['kerabat'],
      kinerja: Math.max(0.4, Math.min(1.6, Math.round((m.kompetensi / 60) * 100) / 100)),
      gaji: lama.gaji,
      hariMasuk: s.hari,
      keluargaId,
    });
    syncPegawai(s);
    m.jabatan = def?.peran ?? lama.peran;
    m.elektabilitas = clamp(m.elektabilitas + 6);
    m.kompetensi = clamp(m.kompetensi + 3);
    s.integritas = clamp(s.integritas - 4);
    s.popularitas = clamp(s.popularitas - 2);
    p.kecurigaan = clamp(p.kecurigaan + 5);
    return `${lama.nama} diberhentikan dari ${m.jabatan} supaya ${m.nama} bisa masuk. Pegawai lain saling pandang, warga mulai menyebut kantor desa "kantor keluarga".`;
  }

  const def = JABATAN_DESA.find((j) => j.id === jabatanId);
  if (!def) throw new GameError('Jabatan tidak dikenal.');
  if (def.syaratProyek && !s.proyekSelesai.some((b) => b.proyekId === def.syaratProyek)) throw new GameError(`${def.nama} baru ada setelah bangunannya berdiri.`);
  const sekarang = pemegang(s, def.id);
  if (sekarang === `kel:${keluargaId}`) throw new GameError(`${m.nama} sudah menjabat ${def.nama}.`);
  if (sekarang.startsWith('kel:')) {
    const lain = s.politik.keluarga.find((k) => `kel:${k.id}` === sekarang);
    throw new GameError(`${def.nama} sudah dipegang ${lain?.nama ?? 'keluarga sendiri'}.`);
  }
  lepasJabatanLama(s, keluargaId);
  s.jabatanDesa![def.id] = `kel:${keluargaId}`;
  m.jabatan = def.nama;
  // pasangan kades memimpin PKK itu lazim, hampir tanpa gunjingan
  const wajar = def.id === 'ketua_pkk' && m.peran === 'pasangan';
  m.elektabilitas = clamp(m.elektabilitas + def.elektabilitas);
  m.kompetensi = clamp(m.kompetensi + def.kompetensi);
  s.integritas = clamp(s.integritas + (wajar ? 0 : def.integritas));
  p.kecurigaan = clamp(p.kecurigaan + (wajar ? 0 : def.kecurigaan));
  if (!wajar) s.kepuasan[def.kelompok] = clamp(s.kepuasan[def.kelompok] - 4);
  return wajar
    ? `${m.nama} resmi memimpin ${def.nama}, seperti kebiasaan di banyak desa.`
    : `${sekarang} dicopot dari ${def.nama} dan digantikan ${m.nama}. ${sekarang} pulang dengan muka masam, pendukungnya mulai bisik-bisik.`;
}

/** Honor bulanan dari jabatan keluarga, masuk ke dompet kades. */
export function honorKeluarga(s: VillageState): number {
  return Object.entries(s.jabatanDesa ?? {})
    .filter(([, h]) => h?.startsWith('kel:'))
    .reduce((t, [id]) => t + (JABATAN_DESA.find((j) => j.id === id)?.honor ?? 0), 0);
}

export function viewJabatan(s: VillageState) {
  const namaKeluarga = (h: string) => s.politik.keluarga.find((k) => `kel:${k.id}` === h)?.nama;
  return {
    organisasi: JABATAN_DESA.map((j) => {
      const h = pemegang(s, j.id);
      return {
        id: j.id,
        nama: j.nama,
        teks: j.teks,
        pemegang: h.startsWith('kel:') ? (namaKeluarga(h) ?? 'keluarga') : h,
        dipegangKeluarga: h.startsWith('kel:'),
        terbuka: !j.syaratProyek || s.proyekSelesai.some((b) => b.proyekId === j.syaratProyek),
        elektabilitas: j.elektabilitas,
        honor: j.honor,
        tingkatGosip: j.kecurigaan >= 8 ? 'tinggi' : j.kecurigaan >= 3 ? 'sedang' : 'rendah',
      };
    }),
    kantor: (s.staf ?? []).map((x) => ({
      id: `staf:${x.id}`,
      nama: PEGAWAI.find((p) => p.id === x.peran)?.peran ?? x.peran,
      pemegang: x.nama,
      dipegangKeluarga: Boolean(x.keluargaId),
    })),
  };
}

/** Desa lama: jabatan keluarga dari sistem acak lama dicatat sebagai pemegang jabatan organisasi. */
export function migrasiJabatan(s: VillageState): void {
  if (s.jabatanDesa) return;
  s.jabatanDesa = {};
  for (const k of s.politik?.keluarga ?? []) {
    const def = JABATAN_DESA.find((j) => j.nama === k.jabatan || (k.jabatan === 'Pengurus Koperasi' && j.id === 'ketua_kopdes'));
    if (def && !s.jabatanDesa[def.id]) {
      s.jabatanDesa[def.id] = `kel:${k.id}`;
      k.jabatan = def.nama;
    }
  }
}

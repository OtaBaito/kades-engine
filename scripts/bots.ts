// Bot sederhana untuk tes dan balancing.
import { applyAction, buildView, GameError, type VillageState } from '../src/index.ts';

export type BotName = 'pasif' | 'acak' | 'serakah' | 'jujur';

function scoreEfek(efek: string[], gaya: BotName): number {
  let s = 0;
  for (const e of efek) {
    const m = e.match(/(-?\+?[\d,.]+)/);
    const raw = m ? Number(m[1].replace('+', '').replace(',', '.')) : 0;
    if (e.startsWith('Kas')) s += (e.includes('-') ? -1 : 1) * 0.5 * Math.abs(raw);
    else if (e.startsWith('Integritas')) s += raw * (gaya === 'jujur' ? 1.5 : gaya === 'serakah' ? 0 : 0.7);
    else if (e.startsWith('Semua warga')) s += raw * 4;
    else if (e.startsWith('Indeks')) s += raw * 1.5;
    else if (e.startsWith('Pemasukan')) s += 4;
    else s += raw;
  }
  return s;
}

function biayaOpsi(efek: string[]): number {
  const kas = efek.find((e) => e.startsWith('Kas -'));
  if (!kas) return 0;
  const m = kas.match(/([\d,]+)\s*(jt|rb|M)/);
  if (!m) return 0;
  const n = Number(m[1].replace(',', '.'));
  return n * (m[2] === 'M' ? 1e9 : m[2] === 'jt' ? 1e6 : 1e3);
}

/** Satu "sesi buka game": putuskan semua kartu lalu mungkin mulai proyek. */
export function botTurn(state: VillageState, bot: BotName, rand: () => number): VillageState {
  if (bot === 'pasif' || state.status !== 'menjabat') return state;
  let s = state;
  const coba = (a: Parameters<typeof applyAction>[1]) => {
    try {
      s = applyAction(s, a).state;
    } catch (err) {
      if (!(err instanceof GameError)) throw err;
    }
  };
  // rutinitas kecil: tagih, tanggapi aspirasi, klaim misi
  coba({ type: 'tagih' });
  for (const a of buildView(s).aspirasi) if (bot !== 'acak' || rand() < 0.5) coba({ type: 'tanggapi_aspirasi', id: a.id });
  for (const m of buildView(s).misi) if (!m.diklaim && m.progres >= m.target) coba({ type: 'klaim_misi', id: m.id });
  const view = buildView(s);
  for (const kartu of view.kotakMasuk) {
    const urutan =
      bot === 'acak'
        ? [...kartu.opsi].sort(() => rand() - 0.5)
        : [...kartu.opsi].sort((a, b) => scoreEfek(b.efek, bot) - scoreEfek(a.efek, bot));
    const termurah = Math.min(...kartu.opsi.map((o) => biayaOpsi(o.efek)));
    for (const opsi of urutan) {
      // bot pintar tidak mau kas jatuh di bawah cadangan Rp40 jt demi satu kartu
      if (bot !== 'acak' && biayaOpsi(opsi.efek) > termurah && s.kas - biayaOpsi(opsi.efek) < 40_000_000) continue;
      try {
        s = applyAction(s, { type: 'putuskan', instanceId: kartu.instanceId, opsiId: opsi.id }).state;
        break;
      } catch (err) {
        if (!(err instanceof GameError)) throw err;
      }
    }
  }
  const v2 = buildView(s);
  const berjalan = v2.proyek.filter((p) => p.status === 'dibangun').length;
  if (berjalan < v2.maksProyekBersamaan) {
    const kandidat = v2.proyek
      .filter((p) => p.status === 'tersedia')
      .sort((a, b) => (bot === 'acak' ? rand() - 0.5 : a.biayaBagus - b.biayaBagus));
    // semua proyek sudah ada: tingkatkan bangunan termurah
    if (kandidat.length === 0) {
      const up = v2.proyek
        .filter((p) => p.status === 'selesai' && p.level < 3)
        .sort((a, b) => a.biayaUpgradeBagus - b.biayaUpgradeBagus)[0];
      if (up && (bot === 'acak' || s.kas - up.biayaUpgradeBagus > 60_000_000)) {
        coba({ type: 'upgrade_proyek', proyekId: up.id, kontraktor: 'bagus' });
      }
    }
    for (const p of kandidat) {
      const kontraktor = bot === 'acak' ? (rand() < 0.5 ? 'murah' : 'bagus') : s.kas > p.biayaBagus + 80_000_000 ? 'bagus' : 'murah';
      const biaya = kontraktor === 'bagus' ? p.biayaBagus : p.biayaMurah;
      // bot pintar menyisakan cadangan kas untuk gaji dan kejadian mendadak
      if (bot !== 'acak' && s.kas - biaya < 60_000_000) continue;
      try {
        s = applyAction(s, { type: 'mulai_proyek', proyekId: p.id, kontraktor }).state;
        break;
      } catch (err) {
        if (!(err instanceof GameError)) throw err;
      }
    }
  }
  return s;
}

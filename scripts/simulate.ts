// Simulasi massal untuk balancing: node packages/engine/scripts/simulate.ts [jumlahDesa]
import { advance, createVillage, raporWarisan, skorDesa } from '../src/index.ts';
import { botTurn, type BotName } from './bots.ts';

const N = Number(process.argv[2] ?? 300);
const BOTS: BotName[] = ['pasif', 'acak', 'serakah', 'jujur'];
const SESI_TIAP_HARI = 2; // pemain buka game kira-kira tiap 2 hari game (4 menit nyata)

for (const bot of BOTS) {
  let menangP1 = 0;
  let periodeTotal = 0;
  let skorTotal = 0;
  let ditangkap = 0;
  let purna = 0;
  let warisan = 0;
  const akhir: Record<string, number> = {};
  const gelar: Record<string, number> = {};
  let kasMinus = 0;
  let suaraP1 = 0;
  for (let i = 0; i < N; i++) {
    let s = createVillage({ seed: `${bot}-${i}`, namaDesa: 'Uji', namaKades: 'Bot' });
    let r = i * 7919 + 1;
    const rand = () => ((r = (r * 48271) % 2147483647) / 2147483647);
    let pernahMinus = false;
    while (s.status === 'menjabat' && s.hari < 360 * 3) {
      s = botTurn(s, bot, rand);
      s = advance(s, SESI_TIAP_HARI).state;
      if (s.kas < 0) pernahMinus = true;
    }
    if (s.pilkades[0]?.menang) menangP1++;
    suaraP1 += s.pilkades[0]?.persen ?? 0;
    periodeTotal += s.pilkades.filter((p) => p.menang).length;
    skorTotal += skorDesa(s);
    if (s.status === 'ditangkap') ditangkap++;
    if (s.status === 'purna') purna++;
    akhir[s.status] = (akhir[s.status] ?? 0) + 1;
    const rapor = raporWarisan(s);
    warisan += rapor.total;
    gelar[rapor.gelar] = (gelar[rapor.gelar] ?? 0) + 1;
    if (pernahMinus) kasMinus++;
  }
  const pct = (x: number) => `${Math.round((x / N) * 100)}%`;
  console.log(
    `${bot.padEnd(8)} menang periode 1: ${pct(menangP1).padStart(4)} | rata suara P1: ${(suaraP1 / N).toFixed(1)}% | ` +
      `rata menang: ${(periodeTotal / N).toFixed(2)} | purna 3 periode: ${pct(purna).padStart(4)} | ` +
      `ditangkap: ${pct(ditangkap).padStart(4)} | pernah kas minus: ${pct(kasMinus).padStart(4)} | skor desa: ${(skorTotal / N).toFixed(1)} | Warisan: ${(warisan / N).toFixed(1)}`,
  );
  console.log(`         akhir: ${Object.entries(akhir).map(([k, v]) => `${k} ${pct(v)}`).join(', ')}`);
  console.log(`         gelar: ${Object.entries(gelar).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} ${pct(v)}`).join(', ')}`);
}

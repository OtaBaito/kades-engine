import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARDS, GameError, advance, applyAction, buildView, createVillage, raporWarisan } from '../src/index.ts';
import { opsiTersedia } from '../src/engine.ts';

const JT = 1_000_000;
const baru = (seed = 'politik') => createVillage({ seed, namaDesa: 'Sukamaju', namaKades: 'Budi' });

test('desa baru punya dompet, keluarga, dan batas 2 periode', () => {
  const s = baru();
  assert.equal(s.politik.maksPeriode, 2);
  assert.equal(s.politik.keluarga.length, 3);
  assert.ok(s.politik.dompet > 0);
  const v = buildView(s);
  assert.equal(v.politik.bolehNyalon, true);
  assert.ok(v.keuangan.perkiraan.totalMasuk > 0);
});

test('aksi gelap mengisi dompet, menaikkan kecurigaan, dan punya jeda', () => {
  let s = baru();
  const dompet = s.politik.dompet;
  s = applyAction(s, { type: 'aksi_gelap', jenis: 'potong_bantuan' }).state;
  assert.equal(s.politik.dompet, dompet + 20 * JT);
  assert.ok(s.politik.kecurigaan > 0);
  assert.throws(() => applyAction(s, { type: 'aksi_gelap', jenis: 'potong_bantuan' }), GameError);
  assert.throws(() => applyAction(s, { type: 'aksi_gelap', jenis: 'markup' }), /proyek/);
});

test('korupsi terus-menerus berujung audit, dan audit bisa dihadapi', () => {
  let s = baru('audit');
  for (let i = 0; i < 36 && !s.politik.kasus && s.status === 'menjabat'; i++) {
    for (const jenis of ['potong_bantuan', 'sewa_bengkok'] as const) {
      try {
        s = applyAction(s, { type: 'aksi_gelap', jenis }).state;
      } catch {
        // masih jeda
      }
    }
    s = advance(s, 30).state;
  }
  assert.ok(s.politik.kasus || s.status !== 'menjabat', 'audit datang');
  if (s.politik.kasus && s.status === 'menjabat') {
    const r = applyAction(s, { type: 'hadapi_audit', pilihan: 'kembalikan' }).state;
    assert.equal(r.politik.kasus, null);
  }
});

test('setelah 2 periode pemain tidak bisa nyalon, penerus bisa maju dan jadi kades', () => {
  let s = baru('dinasti');
  s.politik.periodePemain = 2;
  s.politik.penerusId = s.politik.keluarga[1].id;
  s.politik.keluarga[1].elektabilitas = 90;
  s.politik.keluarga[1].kompetensi = 80;
  for (const g of Object.keys(s.kepuasan) as (keyof typeof s.kepuasan)[]) s.kepuasan[g] = 75;
  s.popularitas = 70;
  s = advance(s, 9 * 30).state; // masuk bulan ke-10: kampanye
  assert.ok(s.politik.kampanye, 'kampanye dimulai');
  assert.equal(s.politik.kampanye!.calon, 'penerus');
  assert.throws(() => applyAction(s, { type: 'pilih_calon', calon: 'pemain' }), /periode/);
  s = advance(s, 3 * 30).state;
  if (s.status === 'menjabat') {
    assert.equal(s.politik.pemimpin, s.politik.keluarga[1].id);
    assert.match(raporWarisan(s).gelar, /Dinasti/);
  }
});

test('tidak nyalon = pensiun dengan rapor warisan', () => {
  let s = advance(baru('pensiun'), 9 * 30).state;
  s = applyAction(s, { type: 'pilih_calon', calon: 'tidak' }).state;
  s = advance(s, 3 * 30).state;
  assert.equal(s.status, 'pensiun');
  const r = raporWarisan(s);
  assert.ok(r.total > 0 && r.gelar.length > 0);
});

test('opsi kartu bercabang: setelah pasang kamera muncul opsi cek rekaman', () => {
  const s = baru();
  const kartu = CARDS.find((c) => c.id === 'maling_ayam')!;
  const awal = opsiTersedia(s, kartu).map((o) => o.id);
  assert.ok(awal.includes('cctv') && !awal.includes('cek_rekaman'));
  s.flags.push('cctv_desa');
  const lanjut = opsiTersedia(s, kartu).map((o) => o.id);
  assert.ok(!lanjut.includes('cctv') && lanjut.includes('cek_rekaman') && lanjut.includes('kamera_malam'));
});

test('setiap kartu tetap punya minimal 2 opsi di semua cabang', () => {
  const flags = [...new Set(CARDS.flatMap((c) => c.opsi.flatMap((o) => [o.syarat?.flag, o.syarat?.tanpaFlag]).filter(Boolean) as string[]))];
  for (const c of CARDS) {
    const relevan = flags.filter((f) => c.opsi.some((o) => o.syarat?.flag === f || o.syarat?.tanpaFlag === f));
    const kombinasi = 1 << relevan.length;
    for (let m = 0; m < kombinasi; m++) {
      const s = baru();
      relevan.forEach((f, i) => m & (1 << i) && s.flags.push(f));
      assert.ok(opsiTersedia(s, c).length >= 2, `${c.id} dengan ${relevan.filter((_, i) => m & (1 << i)).join(',')}`);
    }
  }
});

test('uang pribadi: beli usaha menghasilkan tiap bulan, barang gengsi bikin gosip, aset bisa dijual', () => {
  let s = baru('aset');
  s.politik.dompet = 500 * JT;
  s = applyAction(s, { type: 'beli_aset', id: 'warung' }).state;
  assert.equal(s.politik.dompet, 440 * JT);
  const sebelum = s.politik.dompet;
  s = advance(s, 30).state;
  assert.ok(s.politik.dompet >= sebelum + 5.5 * JT, 'gaji + usaha masuk dompet');
  const gosip = s.politik.kecurigaan;
  s = applyAction(s, { type: 'beli_aset', id: 'mobil' }).state;
  assert.ok(s.politik.kecurigaan > gosip);
  assert.throws(() => applyAction(s, { type: 'beli_aset', id: 'mobil' }), GameError);
  const d = s.politik.dompet;
  s = applyAction(s, { type: 'jual_aset', id: 'mobil' }).state;
  assert.equal(s.politik.dompet, d + 224 * JT);
  assert.ok(buildView(s).politik.hartaBersih > s.politik.dompet);
});

test('kartu berkembang: setelah PMT stunting, kemunculan berikutnya melanjutkan cerita', async () => {
  const { LANJUTAN } = await import('../src/content/lanjutan.ts');
  const { teksKartu } = await import('../src/engine.ts');
  const s = baru('lanjut');
  const kartu = CARDS.find((c) => c.id === 'stunting')!;
  assert.equal(teksKartu(s, kartu), kartu.teks);
  s.pilihanKartu.stunting = 'pmt';
  assert.notEqual(teksKartu(s, kartu), kartu.teks);
  assert.ok(opsiTersedia(s, kartu).some((o) => o.id === 'pmt_lanjut'));
  // semua lanjutan merujuk kartu & opsi yang ada, dan punya minimal 2 opsi
  for (const [id, peta] of Object.entries(LANJUTAN)) {
    const c = CARDS.find((x) => x.id === id);
    assert.ok(c, id);
    const idOpsi = new Set([...c!.opsi, ...Object.values(peta).flatMap((l) => l.opsi)].map((o) => o.id));
    for (const [kunci, l] of Object.entries(peta)) {
      assert.ok(idOpsi.has(kunci), `${id}.${kunci}`);
      assert.ok(l.opsi.length >= 2, `${id}.${kunci} minimal 2 opsi`);
    }
  }
});

test('paket kartu contoh: id kartu unik', () => {
  assert.ok(CARDS.length >= 30, String(CARDS.length));
  assert.equal(new Set(CARDS.map((c) => c.id)).size, CARDS.length);
});

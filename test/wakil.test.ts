import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameError, advance, applyAction, buildView, createVillage } from '../src/index.ts';
import { stateRelasi } from '../src/relasi.ts';
import type { VillageState } from '../src/types.ts';

function denganWakil(latar: string, seed = 'wakil'): VillageState {
  let s = createVillage({ seed, namaDesa: 'Sukawakil', namaKades: 'Budi' });
  s = advance(s, 1).state;
  const r = stateRelasi(s);
  r.kandidatWakil = [{ id: 'wx', nama: 'Mas Gilang', latar: latar as never, loyalitas: 60, ambisi: 85, panggung: 65, ijazah: 'palsu' }];
  s.kas = 500_000_000;
  return applyAction(s, { type: 'wakil', aksi: 'pilih', id: 'wx' }).state;
}

test('wakil putra pejabat: beking kabupaten, tidak bisa diberhentikan sepihak, ijazah tersembunyi', () => {
  const s = denganWakil('anak_pejabat');
  const r = stateRelasi(s);
  assert.equal(r.wakil?.latar, 'anak_pejabat');
  assert.ok(r.tokoh.bupati.relasi >= 60);
  assert.throws(() => applyAction(s, { type: 'wakil', aksi: 'berhentikan' }), (e: unknown) => e instanceof GameError && /pemakzulan/.test(e.message));
  const v = buildView(s) as { relasi: { wakil: Record<string, unknown>; wakilPolitik: { bisaDiberhentikan: boolean } } };
  assert.equal(v.relasi.wakil.ijazah, undefined, 'keaslian ijazah tidak bocor ke tampilan');
  assert.equal(v.relasi.wakilPolitik.bisaDiberhentikan, false);
});

test('tugaskan wakil: setia bekerja penuh, ada jeda', () => {
  let s = denganWakil('guru_honorer');
  const pop = s.popularitas;
  s = applyAction(s, { type: 'wakil', aksi: 'tugaskan', tugas: 'blusukan' }).state;
  assert.ok(s.popularitas > pop);
  assert.throws(() => applyAction(s, { type: 'wakil', aksi: 'tugaskan', tugas: 'lobi' }), GameError);
  const bpd = stateRelasi(s).bpd;
  s = advance(s, 21).state;
  s = applyAction(s, { type: 'wakil', aksi: 'tugaskan', tugas: 'redam_bpd' }).state;
  assert.ok(stateRelasi(s).bpd > bpd - 3);
});

test('isu ijazah sampai sidang: ijazah palsu terbongkar, BPD memakzulkan wakil', () => {
  let s = denganWakil('anak_pejabat', 'ijazah');
  s.kotakMasuk = [{ instanceId: 'ij1', cardId: 'wakil_ijazah_1', hariMasuk: s.hari }];
  s = applyAction(s, { type: 'putuskan', instanceId: 'ij1', opsiId: 'uji' }).state;
  assert.equal(stateRelasi(s).kasusIjazah?.sikap, 'uji');
  s.kotakMasuk = [{ instanceId: 'ij2', cardId: 'wakil_ijazah_2', hariMasuk: s.hari }];
  s.antreanKartu = [];
  const integ = s.integritas;
  s = applyAction(s, { type: 'putuskan', instanceId: 'ij2', opsiId: 'terbuka' }).state;
  s = advance(s, 1).state;
  const r = stateRelasi(s);
  assert.equal(r.wakil?.ijazahTerbukti, true);
  assert.ok(r.makzulWakil, 'BPD menggulirkan pemakzulan');
  assert.ok(s.integritas >= integ, 'kades yang minta uji terbuka tidak dihukum');
  assert.ok(s.jurnal.some((l) => /tidak sah/.test(l.teks)));
  s = advance(s, 16).state;
  assert.equal(stateRelasi(s).makzulWakil ?? null, null, 'sidang pemakzulan sudah diputus');
  assert.ok(s.jurnal.some((l) => /pemakzulan wakil|memakzulkan wakil/.test(l.teks)));
});

test('makzulkan lewat BPD: usul tercatat, diputus 15 hari kemudian', () => {
  let s = denganWakil('rival_pilkades', 'makzul');
  s = applyAction(s, { type: 'wakil', aksi: 'makzulkan' }).state;
  assert.ok(stateRelasi(s).makzulWakil);
  assert.throws(() => applyAction(s, { type: 'wakil', aksi: 'makzulkan' }), GameError);
  s = advance(s, 16).state;
  assert.equal(stateRelasi(s).makzulWakil ?? null, null);
});

test('wakil setia berpamor menambah suara di survei, wakil tidak setia menggembosi', async () => {
  const { surveiElektabilitas } = await import('../src/politik.ts');
  const s = denganWakil('anak_pejabat', 'suara');
  const w = stateRelasi(s).wakil!;
  w.loyalitas = 80;
  w.panggung = 80;
  const setia = surveiElektabilitas(s).persen;
  w.loyalitas = 20;
  const belot = surveiElektabilitas(s).persen;
  stateRelasi(s).wakil = null;
  const tanpa = surveiElektabilitas(s).persen;
  assert.ok(setia > tanpa && tanpa > belot, `${setia} > ${tanpa} > ${belot}`);
});

test('wakil baru belum terhitung membelot; nama calon tidak berulang dengan latar lain', () => {
  let s = createVillage({ seed: 'belot', namaDesa: 'Sukabelot', namaKades: 'Budi' });
  s = advance(s, 1).state;
  const r = stateRelasi(s);
  r.kandidatWakil = [{ id: 'wb', nama: 'Mas Bowo', latar: 'rival_pilkades', loyalitas: 20, ambisi: 85, panggung: 40, ijazah: 'asli' }];
  s.kas = 500_000_000;
  s = applyAction(s, { type: 'wakil', aksi: 'pilih', id: 'wb' }).state;
  const v = buildView(s) as { relasi: { wakil: { membelot: boolean }; wakilPolitik: { alasanMakzul: string } } };
  assert.equal(v.relasi.wakil.membelot, false);
  assert.equal(v.relasi.wakilPolitik.alasanMakzul, 'ketidakcocokan dengan kades');
  s = applyAction(s, { type: 'wakil', aksi: 'rangkul' }).state;
  stateRelasi(s).wakil!.loyalitas = 20;
  s = advance(s, 31).state;
  stateRelasi(s).wakil!.loyalitas = 20;
  const v2 = buildView(s) as { relasi: { wakil: { membelot: boolean } } };
  assert.equal(v2.relasi.wakil.membelot, true);
  // nama calon: tidak ada yang muncul dua kali sepanjang banyak pencarian
  const r2 = stateRelasi(s);
  r2.wakil = null;
  const lihat = new Set<string>(['Mas Bowo']);
  for (let i = 0; i < 20; i++) {
    stateRelasi(s).jeda['wakil:cari'] = 0;
    s = applyAction(s, { type: 'wakil', aksi: 'cari' }).state;
    for (const k of stateRelasi(s).kandidatWakil) {
      assert.ok(!lihat.has(k.nama), `${k.nama} muncul lagi`);
      lihat.add(k.nama);
    }
  }
});

test('sidang ijazah tetap diputus walau tergugat sudah mundur dan maju pilkades', () => {
  let s = denganWakil('anak_pejabat', 'mantan');
  s.kotakMasuk = [{ instanceId: 'm1', cardId: 'wakil_ijazah_1', hariMasuk: s.hari }];
  s = applyAction(s, { type: 'putuskan', instanceId: 'm1', opsiId: 'diam' }).state;
  // wakil mundur dan jadi lawan pilkades
  const r = stateRelasi(s);
  const nama = r.wakil!.nama;
  s.politik.kampanye = { calon: 'pemain', lawan: [{ id: 'wakil', nama, kubu: 'mantan wakil kades', kekuatan: 70 }, { id: 'x', nama: 'Pak Sardi', kubu: 'x', kekuatan: 50 }], bonusSuara: 0 } as typeof s.politik.kampanye;
  r.wakil = null;
  s.kotakMasuk = [{ instanceId: 'm2', cardId: 'wakil_ijazah_2', hariMasuk: s.hari }];
  s.antreanKartu = [];
  const v = buildView(s) as { kotakMasuk: { teks: string }[] };
  assert.ok(v.kotakMasuk[0].teks.includes(nama), 'kartu sidang menyebut nama tergugat');
  s = applyAction(s, { type: 'putuskan', instanceId: 'm2', opsiId: 'terbuka' }).state;
  s = advance(s, 1).state;
  assert.equal(stateRelasi(s).kasusIjazah ?? null, null);
  assert.ok(s.jurnal.some((l) => l.teks.includes(`ijazah ${nama}, mantan wakil kades`)));
  // ijazah palsu (diset di helper): dicoret dari pilkades
  assert.ok(!s.politik.kampanye?.lawan.some((l) => l.nama === nama));
});

test('pilkades: suara terbanyak menang, jurnal menyebut pemenang', async () => {
  const { bagiSuaraLawan } = await import('../src/politik.ts');
  const bagi = bagiSuaraLawan([{ nama: 'A', kekuatan: 70 }, { nama: 'B', kekuatan: 50 }], 60);
  assert.ok(bagi[0].persen > bagi[1].persen * 2, 'suara lawan terkumpul ke penantang terkuat');
  assert.ok(Math.abs(bagi[0].persen + bagi[1].persen - 60) < 0.2);
});

test('label latar ikut gender: putri pejabat untuk perempuan', async () => {
  const { namaLatarWakil } = await import('../src/relasi.ts');
  assert.equal(namaLatarWakil('anak_pejabat', 'Mbak Sekar'), 'Putri pejabat kabupaten');
  assert.equal(namaLatarWakil('anak_pejabat', 'Mas Aris'), 'Putra pejabat kabupaten');
});

test('mantan wakil dendam: tampil dengan nama dan sebab yang benar, ijazah palsu ditolak panitia', () => {
  const s = denganWakil('anak_pejabat', 'dendam');
  const r = stateRelasi(s);
  // dimakzulkan karena ijazah palsu: tidak boleh maju
  r.mantanWakil = { nama: 'Mas Aris', sebab: 'dimakzulkan', ijazahPalsu: true };
  r.wakil = null;
  s.flags = [...s.flags, 'mantan_wakil_dendam'];
  s.politik.kampanye = { calon: 'pemain', lawan: [{ id: 'x', nama: 'Pak Sardi', kubu: 'x', kekuatan: 50 }], bonusSuara: 0 } as typeof s.politik.kampanye;
  let n = advance(s, 1).state;
  assert.ok(!n.politik.kampanye!.lawan.some((l) => l.id === 'mantan_wakil'));
  assert.ok(n.jurnal.some((l) => /panitia menolak berkasnya/.test(l.teks)));
  // dimakzulkan, ijazah sah: maju dengan nama aslinya
  const r2 = stateRelasi(s);
  r2.mantanWakil = { nama: 'Mas Aris', sebab: 'dimakzulkan', ijazahPalsu: false };
  n = advance(s, 1).state;
  assert.ok(n.politik.kampanye!.lawan.some((l) => l.id === 'mantan_wakil' && l.nama === 'Mas Aris'));
  assert.ok(n.jurnal.some((l) => /Mas Aris, mantan wakil kades yang dimakzulkan BPD/.test(l.teks)));
});

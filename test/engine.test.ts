import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CARDS,
  GameError,
  PROJECTS,
  advance,
  applyAction,
  buildView,
  createVillage,
  skorDesa,
} from '../src/index.ts';

const baru = (seed = 'uji') => createVillage({ seed, namaDesa: 'Sukamaju', namaKades: 'Budi' });

test('seed yang sama menghasilkan desa yang identik (determinis)', () => {
  const a = advance(baru('x'), 200).state;
  const b = advance(baru('x'), 200).state;
  assert.deepEqual(a, b);
});

test('advance tidak mengubah state masukan (fungsi murni)', () => {
  const s = baru();
  const salinan = structuredClone(s);
  advance(s, 50);
  assert.deepEqual(s, salinan);
});

test('termin pertama dana desa cair saat dilantik', () => {
  const s = baru();
  assert.ok(s.kas > 400_000_000);
});

test('pilkades terjadi di hari ke-360 dan desa tanpa kerja kalah', () => {
  const s = advance(baru(), 400).state;
  assert.equal(s.pilkades.length, 1);
  assert.equal(s.status, 'kalah');
  assert.equal(s.hari, 360);
});

test('mulai proyek memotong kas dan selesai sesuai durasi', () => {
  const s = baru();
  const p = PROJECTS.find((x) => x.id === 'lampu_jalan')!;
  const r = applyAction(s, { type: 'mulai_proyek', proyekId: p.id, kontraktor: 'bagus' });
  assert.equal(r.state.kas, s.kas - Math.round(p.biaya * 1.15));
  const sebelum = skorDesa(r.state);
  const jadi = advance(r.state, p.durasiHari + 1).state;
  assert.ok(jadi.proyekSelesai.some((b) => b.proyekId === p.id));
  assert.ok(skorDesa(jadi) > sebelum);
});

test('proyek yang sama tidak bisa dibangun dua kali', () => {
  const s = applyAction(baru(), { type: 'mulai_proyek', proyekId: 'lampu_jalan', kontraktor: 'murah' }).state;
  assert.throws(
    () => applyAction(s, { type: 'mulai_proyek', proyekId: 'lampu_jalan', kontraktor: 'murah' }),
    GameError,
  );
});

test('kas tidak cukup menolak proyek', () => {
  const s = { ...baru(), kas: 10_000_000 };
  assert.throws(() => applyAction(s, { type: 'mulai_proyek', proyekId: 'pasar_desa', kontraktor: 'bagus' }), GameError);
});

test('memutuskan kartu menghapusnya dari kotak masuk dan mencatat alasan', () => {
  const s = baru();
  const kartu = buildView(s).kotakMasuk[0];
  assert.ok(kartu, 'desa baru harus punya kartu');
  const r = applyAction(s, { type: 'putuskan', instanceId: kartu.instanceId, opsiId: kartu.opsi[0].id, alasan: 'uji' });
  assert.ok(!r.state.kotakMasuk.some((k) => k.instanceId === kartu.instanceId));
  assert.match(r.events[0].teks, /Alasan: "uji"/);
});

test('tampilan tidak membocorkan risiko tersembunyi', () => {
  const s = advance(baru(), 300).state;
  const json = JSON.stringify(buildView(s));
  assert.ok(!json.includes('"risiko"'));
  assert.ok(!json.includes('"setelahHari"'));
  assert.ok(!json.includes('"terjadwal"'));
});

test('konten valid: id unik dan setiap kartu punya minimal 2 opsi', () => {
  const ids = new Set(CARDS.map((c) => c.id));
  assert.equal(ids.size, CARDS.length);
  for (const c of CARDS) assert.ok(c.opsi.length >= 2, c.id);
  assert.equal(new Set(PROJECTS.map((p) => p.id)).size, PROJECTS.length);
});

test('event besar tidak selalu muncul di hari yang sama untuk desa berbeda', () => {
  const geser = ['a', 'b', 'c', 'd', 'e'].map((seed) => createVillage({ seed, namaDesa: 'X', namaKades: 'Y' }).geserHari.koperasi_wajib);
  assert.ok(new Set(geser).size > 1, `geser hari sama semua: ${geser.join(',')}`);
});

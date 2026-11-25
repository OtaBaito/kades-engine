import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameError, advance, applyAction, buildView, createVillage } from '../src/index.ts';

const JT = 1_000_000;
const baru = () => createVillage({ seed: 'kredit', namaDesa: 'Sukamaju', namaKades: 'Budi' });

test('pinjaman bank cair, cicilan ditarik tiap tutup buku, lalu lunas', () => {
  let s = applyAction(baru(), { type: 'ambil_pinjaman', sumber: 'bank', jumlah: 60 * JT }).state;
  assert.equal(s.pinjaman.length, 1);
  const p = s.pinjaman[0];
  assert.equal(p.cicilanPokok, 5 * JT);
  s.kas = 1_000 * JT;
  s = advance(s, 30).state;
  assert.equal(s.pinjaman[0].sisaBulan, 11);
  assert.equal(s.pinjaman[0].sisaPokok, 55 * JT);
  s = advance(s, 30 * 11).state;
  assert.equal(s.pinjaman.length, 0);
  assert.ok(s.statistikKredit.lunas >= 1);
});

test('plafon dan syarat integritas ditegakkan', () => {
  const s = baru();
  assert.throws(() => applyAction(s, { type: 'ambil_pinjaman', sumber: 'koperasi', jumlah: 500 * JT }), GameError);
  assert.throws(() => applyAction({ ...s, integritas: 20 }, { type: 'ambil_pinjaman', sumber: 'bank', jumlah: 20 * JT }), GameError);
  assert.throws(() => applyAction(s, { type: 'ambil_pinjaman', sumber: 'pinjol', jumlah: 1 * JT }), GameError);
});

test('telat bayar pinjol menambah denda dan menurunkan popularitas', () => {
  let s = applyAction(baru(), { type: 'ambil_pinjaman', sumber: 'pinjol', jumlah: 50 * JT }).state;
  s.kas = -100 * JT;
  const pop = s.popularitas;
  s = advance(s, 30).state;
  const p = s.pinjaman[0];
  assert.equal(p.telat, 1);
  assert.ok(p.sisaPokok > 50 * JT);
  assert.ok(s.popularitas < pop);
});

test('pelunasan dipercepat memotong kas dan menghapus utang', () => {
  let s = applyAction(baru(), { type: 'ambil_pinjaman', sumber: 'rentenir', jumlah: 40 * JT }).state;
  const id = s.pinjaman[0].id;
  const v = buildView(s);
  assert.equal(v.totalUtang, 40 * JT);
  s = applyAction(s, { type: 'lunasi_pinjaman', id }).state;
  assert.equal(s.pinjaman.length, 0);
});

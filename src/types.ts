// Tipe data inti engine "Asal Warga Senang".
// Semua nilai uang dalam rupiah (angka bulat).

export type GroupId = 'petani' | 'pedagang' | 'pemuda' | 'pkk' | 'tokoh' | 'perantau';
export type IndexId = 'sosial' | 'ekonomi' | 'lingkungan';
export type NeedTag =
  | 'irigasi'
  | 'jalan'
  | 'pasar'
  | 'lampu'
  | 'lapangan'
  | 'internet'
  | 'posyandu'
  | 'air';

export interface Effect {
  kas?: number;
  kepuasan?: Partial<Record<GroupId, number>>;
  semuaKepuasan?: number;
  indeks?: Partial<Record<IndexId, number>>;
  integritas?: number;
  popularitas?: number;
  setFlag?: string[];
  hapusFlag?: string[];
  /** Pemasukan tambahan per bulan (mis. koperasi/BUMDes). */
  pemasukanBulanan?: number;
  /** Uang masuk/keluar dompet pribadi kades. */
  dompet?: number;
  kecurigaan?: number;
  /** Pegawai ini berhenti/dipecat. */
  pegawaiKeluar?: string;
  /** Efek ke pegawai yang menjadi tokoh kartu. */
  /** Jadwalkan babak berikutnya dari cerita bersambung. */
  jadwalKartu?: { cardId: string; setelahHari: number };
  stafKeluar?: boolean;
  /** Pegawai pertama di jabatan ini keluar dari kantor (cerita yang tidak punya tokoh pegawai tertentu). */
  pecatPeran?: string;
  /** Uang kas efek ini dicatat sebagai pos Dana desa (mis. termin yang sempat ditahan akhirnya cair). */
  kasDanaDesa?: boolean;
  stafKinerja?: number;
  stafGajiX?: number;
  stafTambahSifat?: string;
  stafHapusSifat?: string;
  /** Efek ke wakil kades (loyalitas, pamor, gugatan ijazah, usul pemakzulan). */
  wakil?: import('./wakil.ts').EfekWakil;
}

export interface DelayedEffect {
  setelahHari: number;
  peluang: number; // 0..1
  pesan: string;
  effect: Effect;
}

export interface CardOption {
  id: string;
  label: string;
  effect: Effect;
  /** Risiko tersembunyi: tidak ditampilkan di UI/MCP. */
  risiko?: DelayedEffect;
  /** Opsi hanya muncul kalau syarat ini terpenuhi (mis. keputusan sebelumnya sudah memasang kamera). */
  syarat?: { flag?: string; tanpaFlag?: string; butuhProyek?: string; tanpaProyek?: string; tanpaPerdes?: string };
}

export type CardCategory = 'aduan' | 'usulan' | 'politik' | 'bencana' | 'peluang' | 'kampanye';

export interface CardCondition {
  minHari?: number;
  minIntegritas?: number;
  maxIntegritas?: number;
  flag?: string;
  tanpaFlag?: string;
  /** Bulan ke-n dalam periode berjalan (1..12). */
  bulanPeriodeMin?: number;
  bulanPeriodeMax?: number;
  butuhProyek?: string;
  tanpaProyek?: string;
  /** Kartu hanya muncul kalau pegawai ini sedang bekerja. */
  butuhPegawai?: string;
  /** Kartu hanya muncul kalau ada pegawai dengan sifat ini; pegawai itu jadi tokoh ceritanya. */
  butuhSifat?: string;
  /** Tokoh pegawai (butuhSifat) hanya dari jabatan ini, supaya ceritanya cocok dengan tugasnya. */
  peranCocok?: string[];
  /** Bulan dalam tahun game (1-12) saat kartu musiman boleh muncul. */
  bulanTahun?: number[];
  /** Kartu khas corak desa tertentu. */
  butuhCorak?: TipeDesa[];
  /** Kartu hanya muncul kalau rata-rata kepuasan warga di bawah angka ini (mis. demo karena tidak didengar). */
  maxRataKepuasan?: number;
  /** Kartu tidak muncul selama perdes ini berlaku (mis. jual tanah kas desa saat perlindungan sawah). */
  tanpaPerdes?: string;
  /** Hanya muncul kalau ada proyek desa yang sedang dibangun. */
  butuhProyekBerjalan?: boolean;
  /** Tokoh pegawai (butuhPegawai/butuhSifat) tidak boleh punya sifat ini (mis. bendahara jujur tidak menggelapkan). */
  tokohTanpaSifat?: string;
  /** Hanya muncul kalau jabatan ini dipegang tepat satu orang (mis. kader tunggal cuti). */
  satuPegawai?: string;
}

export interface CardDef {
  id: string;
  judul: string;
  teks: string;
  kategori: CardCategory;
  bobot: number;
  syarat?: CardCondition;
  sekali?: boolean;
  jedaHari?: number;
  /** Teks pengganti kalau flag tertentu sudah ada (kelanjutan dari keputusan lama). Yang pertama cocok dipakai. */
  teksLanjutan?: { flag: string; teks: string }[];
  /** Babak lanjutan cerita bersambung: tidak muncul acak, hanya lewat jadwalKartu. */
  hanyaLanjutan?: boolean;
  /** Cerita masih berlanjut setelah kartu ini (ditandai di UI). */
  bersambung?: boolean;
  /** Kartu sejenis (mis. variasi templat acak): setelah satu muncul, yang lain menunggu jedaGrup hari. */
  grup?: string;
  /** Nama warga di kartu acak: warga yang sama tidak tampil di dua cerita berbeda dalam waktu dekat. */
  warga?: string;
  opsi: CardOption[];
}

export interface ProjectDef {
  id: string;
  nama: string;
  deskripsi: string;
  biaya: number;
  durasiHari: number;
  perawatanBulanan: number;
  menyediakan: NeedTag[];
  indeks: Partial<Record<IndexId, number>>;
  kepuasan: Partial<Record<GroupId, number>>;
  pemasukanBulanan?: number;
  /** Hanya bisa dibangun setelah dusun ini dibuka. */
  butuhDusun?: string;
  /** Program wajib dari pusat: dana desa ditahan sampai berdiri, dibangun paksa kalau lewat tenggat. */
  wajib?: boolean;
}

export interface GroupDef {
  id: GroupId;
  nama: string;
  jiwa: number;
  kebutuhan: NeedTag[];
}

export type Contractor = 'murah' | 'bagus';

export interface PendingCard {
  instanceId: string;
  cardId: string;
  hariMasuk: number;
  /** Pegawai yang menjadi tokoh kartu (untuk kartu berbasis sifat). */
  stafId?: string;
  /** Sudah dimusyawarahkan dengan warga: dampak buruk ke kelompok warga diperlunak. */
  musyawarah?: boolean;
  /** Sudah minta saran tokoh masyarakat. */
  tokoh?: boolean;
  /** Opsi yang paling ditolak warga saat musyawarah: dampaknya tidak diperlunak. */
  ditolakWarga?: string;
  /** Pengali uang masuk hasil tawar-menawar (1,3 berhasil, 0,85 gagal). */
  nego?: number;
  /** Catatan rembug yang tampil di surat. */
  catatan?: string[];
}

export type CaraRembug = 'musyawarah' | 'tokoh' | 'nego';

export interface ActiveProject {
  proyekId: string;
  kontraktor: Contractor;
  mulaiHari: number;
  selesaiHari: number;
  /** Diisi kalau ini pekerjaan upgrade (level tujuan). */
  upgradeKe?: number;
}

export interface BuiltProject {
  proyekId: string;
  kualitas: number; // 0..1
  selesaiHari: number;
  level: number; // 1..3
}

export interface Aspirasi {
  id: string;
  kelompok: GroupId;
  rumah: number; // indeks rumah di peta
  teks: string;
  hari: number;
}

export interface CatatanKeluhan {
  id: string;
  kelompok: GroupId;
  teks: string;
  hari: number;
  status: 'menunggu' | 'ditanggapi' | 'diwakilkan' | 'diabaikan';
  hariSelesai?: number;
}

export interface Staf {
  id: string;
  /** Id jabatan (lihat PEGAWAI). */
  peran: string;
  nama: string;
  sifat: string[];
  kinerja: number;
  gaji: number;
  hariMasuk: number;
  /** Diisi kalau pegawai ini anggota keluarga kades (nepotisme). */
  keluargaId?: string;
}

export interface Kandidat {
  id: string;
  peran: string;
  nama: string;
  sifat: string[];
  kinerja: number;
  gaji: number;
  biayaRekrut: number;
}

export interface Pinjaman {
  id: string;
  sumber: string;
  pokok: number;
  sisaPokok: number;
  bunga: number;
  tenor: number;
  sisaBulan: number;
  cicilanPokok: number;
  telat: number;
  hariAmbil: number;
}

export interface MisiAktif {
  id: string;
  jenis: StatKey;
  target: number;
  awal: number;
  hadiahKas: number;
  hadiahXp: number;
  diklaim: boolean;
}

export type StatKey =
  | 'tagih'
  | 'aspirasi'
  | 'kartu'
  | 'proyekMulai'
  | 'proyekSelesai'
  | 'upgrade'
  | 'dekorasi'
  | 'bumdes'
  | 'rekrut'
  | 'sowan'
  | 'rapatBpd'
  | 'setorPajak'
  | 'tabung'
  | 'pidato'
  | 'izinUsaha'
  | 'bacaBerita';

export interface ScheduledEffect {
  hari: number;
  peluang: number;
  pesan: string;
  effect: Effect;
}

export interface LogEntry {
  hari: number;
  jenis: 'info' | 'baik' | 'buruk' | 'politik' | 'keputusan';
  teks: string;
}

export interface MonthlyReport {
  bulan: number; // bulan ke-n sejak awal (1-based)
  pemasukan: number;
  pengeluaran: number;
  kasAkhir: number;
  /** Arus kas per pos (positif masuk, negatif keluar). */
  rincian?: Record<string, number>;
  rataKepuasan: number;
  indeks: Record<IndexId, number>;
  status: string;
}

export interface ElectionResult {
  periode: number;
  hari: number;
  menang: boolean;
  persen: number;
  perKelompok: { kelompok: GroupId; persen: number }[];
}

export type TipeDesa = 'agraris' | 'wisata' | 'pinggiran' | 'religius';

export type VillageStatus = 'menjabat' | 'kalah' | 'purna' | 'ditangkap' | 'pensiun' | 'naik_kelas' | 'dimakzulkan';

export type PeranKeluarga = 'pasangan' | 'anak' | 'adik' | 'ipar';

export interface AnggotaKeluarga {
  id: string;
  nama: string;
  peran: PeranKeluarga;
  elektabilitas: number;
  kompetensi: number;
  jabatan?: string;
  gender?: Gender;
}

export type Gender = 'l' | 'p';

export interface CalonLawan {
  id: string;
  nama: string;
  kubu: string;
  kekuatan: number;
}

export type PilihanCalon = 'pemain' | 'penerus' | 'dukung_lawan' | 'tidak';

export interface KeadaanPolitik {
  /** Harta pribadi kades (terpisah dari kas desa). */
  dompet: number;
  /** Seberapa curiga warga, wartawan, dan auditor (0..100, tidak ditampilkan persis). */
  kecurigaan: number;
  keluarga: AnggotaKeluarga[];
  penerusId: string | null;
  /** Siapa kades resmi sekarang: 'pemain' atau id anggota keluarga (pemain jadi kades bayangan). */
  pemimpin: string;
  /** Jumlah periode yang dijalani pemain sendiri (termasuk yang sedang berjalan). */
  periodePemain: number;
  periodeKeluarga: Record<string, number>;
  /** Batas periode menurut aturan yang berlaku (bisa diubah lewat lobi). */
  maksPeriode: number;
  tunjangan: boolean;
  /** Hari paling cepat sebuah aksi boleh diulang, per kunci aksi. */
  jeda: Record<string, number>;
  kasus: { mulai: number; batas: number; nilai: number; sidang?: import('./sidang.ts').Sidang; ngelesGagal?: boolean; panggilanKedua?: boolean } | null;
  /** Alasan yang pernah dipakai saat sidang audit (auditor menghafalnya). */
  alasanDipakai?: string[];
  lolosNgeles?: number;
  /** Hari kades ini mulai menjabat (desa yang diteruskan kades baru; 0 = sejak desa berdiri). */
  mulaiHari?: number;
  /** Hasil pilkades untuk jagoan yang didukung kades. */
  jagoanMenang?: boolean;
  /** Nama kades dari luar keluarga yang menang berkat dukungan pemain (pemimpin = 'jagoan'). */
  namaJagoan?: string;
  kampanye: {
    calon: PilihanCalon;
    lawan: CalonLawan[];
    bonusSuara: number;
    /** Calon lain yang didukung kades (saat calon = dukung_lawan). */
    dukungId?: string;
    /** Tambahan kekuatan jagoan dari kampanye kades (0-25). */
    dorongan?: number;
  } | null;
  /** Aset pribadi yang dibeli dari dompet (rumah, mobil, usaha). */
  aset: { id: string; hariBeli: number; nilai: number }[];
  totalKorupsi: number;
  /** Bagian totalKorupsi yang sudah pernah diusut audit (tidak dihitung dua kali). */
  korupsiTerusut?: number;
  pernahKasus: number;
  tahunDinasti: number;
}

export interface VillageState {
  versiEngine: number;
  /** Koin yang menunggu ditagih per sumber (rupiah). */
  koin: Record<string, number>;
  aspirasi: Aspirasi[];
  /** Arsip keluhan warga (terbaru di depan), termasuk yang sudah ditanggapi atau kedaluwarsa. */
  riwayatKeluhan: CatatanKeluhan[];
  xp: number;
  level: number;
  misi: { bulan: number; daftar: MisiAktif[] };
  misiMingguan?: { minggu: number; daftar: MisiAktif[] };
  /** Sifat pegawai yang pernah direkrut (untuk album koleksi). */
  sifatDikenal?: string[];
  statistik: Record<StatKey, number>;
  pencapaian: { id: string; hari: number }[];
  /** Daftar jabatan yang terisi (turunan dari staf). */
  pegawai: string[];
  staf: Staf[];
  kandidat: Record<string, Kandidat[]>;
  kantorLevel: number;
  /** Kontraktor rekanan aktif (menambah kursi proyek bersamaan). */
  rekanan?: { id: string; sampaiHari: number }[];
  /** Dusun baru yang sudah dibuka (ekspansi desa), berurutan. */
  dusun?: string[];
  /** Proyek besar yang sedang dikerjakan konsorsium (maks satu). */
  mega?: { id: string; biaya?: number; tahapKe?: number; mulaiHari: number; selesaiHari: number; dibayar: number; tahap: number; jatuhTempo: number; mangkrak: boolean; /** Batas tenggang kalau kas kurang saat jatuh tempo. */ tenggang?: number; /** Sudah diingatkan untuk tagihan ini. */ diingatkan?: number; /** Porsi manfaat (0..1) kalau sisa tagihan diambil alih kabupaten saat ganti kades. */ porsi?: number } | null;
  megaSelesai?: string[];
  /** Total belanja pembangunan sepanjang permainan (skor liga Pembangunan). */
  nilaiPembangunan?: number;
  /** Termin dana desa yang ditahan karena program wajib belum berdiri. */
  danaTertahan?: number;
  /** Pemegang jabatan organisasi desa: nama warga, atau 'kel:<id>' untuk keluarga kades. */
  jabatanDesa?: Record<string, string>;
  /** Kas yang disimpan di luar rekening kas (tidak dihitung SiLPA). */
  investasi?: { cadangan: number; modalBumdes: number; kripto: number };
  /** Titipan pajak belanja & PBB (pajak.ts). */
  pajak?: import('./pajak.ts').StatePajak;
  /** Aksi massa yang sedang berlangsung (unjuk.ts). */
  unjuk?: import('./unjuk.ts').StateUnjuk | null;
  unjukTerakhir?: number;
  /** Relasi dengan aparat dan atasan, BPD, perdes, pemilu atasan, wakil kades (relasi.ts). */
  relasi?: import('./relasi.ts').StateRelasi;
  /** Kawasan usaha: PT yang melamar dan beroperasi (usaha.ts). */
  usaha?: import('./usaha.ts').StateUsaha;
  /** Berita dan pidato presiden (berita.ts). */
  nasional?: import('./berita.ts').StateNasional;
  dekorasi: string[];
  /** Level tiap unit BUMDes (0 = belum dibangun). */
  bumdes: Record<string, number>;
  pinjaman: Pinjaman[];
  statistikKredit: { lunas: number; telat: number };
  namaDesa: string;
  namaKades: string;
  rng: number;
  hari: number; // hari game sejak dilantik (0-based)
  periode: number; // 1..3
  status: VillageStatus;
  kas: number;
  integritas: number;
  popularitas: number;
  indeks: Record<IndexId, number>;
  kepuasan: Record<GroupId, number>;
  /** Jumlah jiwa per kelompok (dinamis). */
  penduduk: Record<GroupId, number>;
  perubahanPenduduk?: Partial<Record<GroupId, number>>;
  pemasukanTambahanBulanan: number;
  flags: string[];
  kotakMasuk: PendingCard[];
  riwayatKartu: Record<string, number>;
  /** Alasan termin dana desa ditahan (untuk jurnal). */
  alasanTerminDitahan?: string;
  /** Watak pelamar pegawai yang pernah datang (kunci: nama tanpa sapaan), supaya pelamar lama konsisten. */
  pelamarLama?: Record<string, string[]>;
  /** Opsi terakhir yang dipilih per kartu, untuk melanjutkan cerita saat kartu itu muncul lagi. */
  pilihanKartu: Record<string, string>;
  /** Hari paling cepat sebuah kartu boleh muncul lagi (jeda diacak per kemunculan). */
  kartuSiap: Record<string, number>;
  /** Geser acak syarat minHari per desa, supaya event besar tidak selalu datang di hari yang sama. */
  geserHari: Record<string, number>;
  proyekBerjalan: ActiveProject[];
  proyekSelesai: BuiltProject[];
  terjadwal: ScheduledEffect[];
  bulanIni: { pemasukan: number; pengeluaran: number; rincian?: Record<string, number> };
  laporan: MonthlyReport[];
  pilkades: ElectionResult[];
  jurnal: LogEntry[];
  nomorUrut: number;
  politik: KeadaanPolitik;
  hadiahHarian?: { terakhir: string | null; beruntun: number };
  /** Babak cerita bersambung yang menunggu tanggal tayang. */
  antreanKartu?: { cardId: string; hari: number }[];
  /** Bonus warisan dari desa sebelumnya (New Game+). */
  warisanSebelum?: { gelar: string; total: number; bonusKas: number } | null;
  /** Corak desa yang dipilih saat pelantikan. */
  tipeDesa?: TipeDesa;
  /** Kades laki-laki (Pak) atau perempuan (Bu); menentukan pasangan suami/istri. */
  genderKades?: Gender;
  ringkasanPergi?: import('./harian.ts').RingkasanPergi | null;
}

export type Action =
  | { type: 'putuskan'; instanceId: string; opsiId: string; alasan?: string }
  | { type: 'rembug_kartu'; instanceId: string; cara: CaraRembug }
  | { type: 'mulai_proyek'; proyekId: string; kontraktor: Contractor; alasan?: string }
  | { type: 'upgrade_proyek'; proyekId: string; kontraktor: Contractor; alasan?: string }
  | { type: 'tagih'; sumber?: string }
  | { type: 'tanggapi_aspirasi'; id: string }
  | { type: 'klaim_misi'; id: string }
  | { type: 'rekrut_pegawai'; id: string; alasan?: string }
  | { type: 'berhentikan_pegawai'; id: string }
  | { type: 'beli_dekorasi'; id: string; alasan?: string }
  | { type: 'bangun_bumdes'; id: string; alasan?: string }
  | { type: 'ambil_pinjaman'; sumber: string; jumlah: number; alasan?: string }
  | { type: 'lunasi_pinjaman'; id: string }
  | { type: 'aksi_gelap'; jenis: JenisAksiGelap; alasan?: string }
  | { type: 'pakai_dompet'; tujuan: TujuanDompet; jumlah?: number; alasan?: string }
  | { type: 'hadapi_audit'; pilihan: PilihanAudit; alasan?: string }
  | { type: 'jawab_auditor'; jawaban: string; alasan?: string }
  | { type: 'promosi_keluarga'; id: string; cara: CaraPromosi; alasan?: string }
  | { type: 'angkat_keluarga'; id: string; jabatan: string; alasan?: string }
  | { type: 'tangani_unjuk'; cara: 'temui' | 'penuhi' | 'polisi' | 'tentara' | 'ormas' | 'biarkan'; alasan?: string }
  | { type: 'relasi'; aksi: 'sowan' | 'kritik'; tokoh: 'kapolsek' | 'danramil' | 'camat' | 'bupati' | 'gubernur' | 'presiden'; dana?: 'pribadi' | 'dinas'; alasan?: string }
  | { type: 'dukung_calon'; calonId: string | null; cara: 'netral' | 'restu' | 'kerahkan'; alasan?: string }
  | { type: 'bpd'; aksi: 'jamuan' | 'rapat_terbuka'; dana?: 'pribadi' | 'dinas'; alasan?: string }
  | { type: 'perdes'; id: string; aksi: 'usul' | 'cabut'; alasan?: string }
  | { type: 'mosi'; cara: 'lobi' | 'dialog' | 'perlindungan'; alasan?: string }
  | { type: 'wakil'; aksi: 'pilih' | 'rangkul' | 'berhentikan' | 'cari' | 'tugaskan' | 'makzulkan'; id?: string; dana?: 'pribadi' | 'dinas'; tugas?: 'blusukan' | 'lobi' | 'redam_bpd'; alasan?: string }
  | { type: 'usaha'; id: string; aksi: 'setujui' | 'csr' | 'pelicin' | 'tolak' | 'tutup'; alasan?: string }
  | { type: 'tanggapi_pidato'; tanggapan: 'dukung' | 'diam' | 'kritik'; alasan?: string }
  | { type: 'baca_berita' }
  | { type: 'pajak'; aksi: 'setor' | 'otomatis_nyala' | 'otomatis_mati' | 'pbb_normal' | 'pbb_gencar' | 'pbb_ringan'; alasan?: string }
  | { type: 'investasi'; jenis: 'cadangan' | 'modal_bumdes' | 'kripto'; arah: 'simpan' | 'tarik'; jumlah: number; alasan?: string }
  | { type: 'pilih_penerus'; id: string; alasan?: string }
  | { type: 'pilih_calon'; calon: PilihanCalon; lawanId?: string; alasan?: string }
  | { type: 'dorong_jagoan'; alasan?: string }
  | { type: 'lobi_aturan'; jenis: JenisLobi; alasan?: string }
  | { type: 'nyaleg'; alasan?: string }
  | { type: 'upgrade_kantor'; alasan?: string }
  | { type: 'kontrak_rekanan'; id: string; alasan?: string }
  | { type: 'buka_dusun'; id: string; cara: 'beli' | 'serobot'; alasan?: string }
  | { type: 'mulai_megaproyek'; id: string; alasan?: string }
  | { type: 'klaim_harian'; tanggal: string }
  | { type: 'tutup_ringkasan' }
  | { type: 'cari_kandidat'; peran: string }
  | { type: 'beli_aset'; id: string; alasan?: string }
  | { type: 'jual_aset'; id: string; alasan?: string };

export type JenisAksiGelap = 'markup' | 'fee_kontraktor' | 'sewa_bengkok' | 'potong_bantuan' | 'beking_judol' | 'beking_narkoba' | 'internet_ilegal' | 'rokok_ilegal';
export type TujuanDompet = 'sumbang_kas' | 'buzzer' | 'serangan_fajar' | 'baliho' | 'cawe_cawe' | 'amankan_aparat' | 'sumbang_masjid' | 'buzzer_redam';
export type PilihanAudit = 'kembalikan' | 'suap' | 'kambing_hitam' | 'pasrah' | 'ngeles';
export type CaraPromosi = 'jabatan' | 'baliho' | 'blusukan' | 'sekolah';
export type JenisLobi = 'perpanjang_periode' | 'tunjangan';

export interface StepResult {
  state: VillageState;
  events: LogEntry[];
}

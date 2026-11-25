// PAKET KONTEN CONTOH (dibuat otomatis oleh skrip ekspor, jangan diedit manual).
// Game lengkap Asal Warga Senang memakai 1.300+ kartu; repo ini memuat 52 kartu contoh
// supaya mesin bisa dijalankan dan dites. Tambahkan kartumu sendiri: lihat CONTRIBUTING.md.
import type { CardOption } from '../types.ts';

/** Kelanjutan kartu: opsi baru yang muncul kalau kartu yang sama datang lagi setelah pilihan tertentu. */
export interface Lanjutan {
  teks: string;
  opsi: CardOption[];
}

export const LANJUTAN: Record<string, Record<string, Lanjutan>> = {
  "staf_bendahara_selisih": {
    "bagi_dua": {
      "teks": "Selisih kas muncul lagi, kali ini Rp 25 jt. Bendahara santai saja: \"kan kemarin kades juga kebagian.\"",
      "opsi": [
        {
          "id": "pecat_lapor",
          "label": "Pecat dan laporkan, risiko ikut terseret",
          "effect": {
            "kas": 10000000,
            "integritas": 2,
            "pegawaiKeluar": "bendahara",
            "kecurigaan": 5
          }
        },
        {
          "id": "bagi_dua_lagi",
          "label": "Bagi dua lagi",
          "effect": {
            "dompet": 12000000,
            "kecurigaan": 15,
            "integritas": -6
          }
        }
      ]
    },
    "audit_internal": {
      "teks": "Setelah audit internal kemarin, buku kas rapi. Bendahara minta pelatihan aplikasi keuangan desa.",
      "opsi": [
        {
          "id": "pelatihan",
          "label": "Kirim pelatihan ke kabupaten",
          "effect": {
            "kas": -3000000,
            "integritas": 2
          }
        },
        {
          "id": "audit_internal",
          "label": "Tidak perlu, audit rutin saja",
          "effect": {
            "integritas": 1
          }
        }
      ]
    }
  },
  "staf_naik_honor": {
    "tolak": {
      "teks": "Perangkat desa datang lagi, kali ini dengan surat dari asosiasi perangkat desa kabupaten.",
      "opsi": [
        {
          "id": "naikkan",
          "label": "Beri tunjangan tambahan",
          "effect": {
            "kas": -14000000,
            "popularitas": 1
          }
        },
        {
          "id": "mogok",
          "label": "Tetap tolak, silakan mogok",
          "effect": {
            "semuaKepuasan": -3,
            "popularitas": -4
          }
        }
      ]
    }
  },
  "stunting": {
    "pmt": {
      "judul": "Kabar Program Makanan Tambahan",
      "teks": "Program makanan tambahan berjalan. Bidan melapor berat badan balita mulai naik, tapi stok susu dan telur menipis.",
      "opsi": [
        {
          "id": "pmt_lanjut",
          "label": "Lanjutkan PMT tiga bulan lagi",
          "effect": {
            "kas": -18000000,
            "kepuasan": {
              "pkk": 5
            },
            "indeks": {
              "sosial": 3
            }
          }
        },
        {
          "id": "kebun_gizi",
          "label": "Bikin kebun gizi dan kolam lele PKK",
          "effect": {
            "kas": -10000000,
            "kepuasan": {
              "pkk": 4,
              "petani": 2
            },
            "indeks": {
              "sosial": 2,
              "ekonomi": 1
            }
          }
        },
        {
          "id": "stop",
          "label": "Cukup, angka sudah membaik",
          "effect": {
            "kepuasan": {
              "pkk": -2
            }
          }
        }
      ]
    },
    "pmt_lanjut": {
      "judul": "Desa Jadi Contoh Penurunan Stunting",
      "teks": "Desa jadi contoh penurunan stunting di kecamatan. Dinas kesehatan menawarkan pendampingan, asal desa ikut membiayai.",
      "opsi": [
        {
          "id": "kemitraan",
          "label": "Ambil pendampingan dinas, bagi biaya",
          "effect": {
            "kas": -8000000,
            "popularitas": 4,
            "indeks": {
              "sosial": 3
            }
          }
        },
        {
          "id": "pamer",
          "label": "Bikin acara peresmian besar-besaran",
          "effect": {
            "kas": -6000000,
            "popularitas": 5,
            "integritas": -1
          }
        },
        {
          "id": "mandiri",
          "label": "Serahkan ke kader posyandu",
          "effect": {
            "kepuasan": {
              "pkk": 2
            }
          }
        }
      ]
    },
    "kebun_gizi": {
      "judul": "Kebun Gizi PKK Panen",
      "teks": "Kebun gizi PKK panen sayur dan lele. Ibu-ibu ingin hasilnya dijual, sebagian minta tetap dibagi gratis.",
      "opsi": [
        {
          "id": "jual_hasil",
          "label": "Jual lewat BUMDes, untung untuk PKK",
          "effect": {
            "kas": 4000000,
            "kepuasan": {
              "pkk": 3,
              "pedagang": 1
            },
            "indeks": {
              "ekonomi": 1
            }
          }
        },
        {
          "id": "bagi_gratis",
          "label": "Bagi gratis untuk keluarga balita",
          "effect": {
            "kepuasan": {
              "pkk": 4
            },
            "indeks": {
              "sosial": 2
            }
          }
        }
      ]
    },
    "penyuluhan": {
      "judul": "Angka Kurang Gizi Belum Turun",
      "teks": "Penyuluhan sudah jalan, tapi angka kurang gizi belum turun. Bidan bilang masalahnya bukan pengetahuan, tapi uang belanja.",
      "opsi": [
        {
          "id": "pmt",
          "label": "Akhirnya jalankan program makanan tambahan",
          "effect": {
            "kas": -25000000,
            "kepuasan": {
              "pkk": 8
            },
            "indeks": {
              "sosial": 3
            }
          }
        },
        {
          "id": "bansos",
          "label": "Data ulang keluarga miskin untuk bansos",
          "effect": {
            "kas": -3000000,
            "kepuasan": {
              "pkk": 3,
              "perantau": 1
            }
          }
        },
        {
          "id": "penyuluhan",
          "label": "Penyuluhan lagi, lebih sering",
          "effect": {
            "kas": -3000000,
            "kepuasan": {
              "pkk": -1
            }
          }
        }
      ]
    },
    "laporan_bagus": {
      "judul": "Tim Kabupaten Cek Angka Stunting",
      "teks": "Tim kabupaten datang mengecek angka stunting yang \"turun drastis\". Timbangan di posyandu bercerita lain.",
      "opsi": [
        {
          "id": "ngaku",
          "label": "Akui datanya keliru, minta bantuan",
          "effect": {
            "integritas": 4,
            "popularitas": -3,
            "kepuasan": {
              "pkk": 3
            }
          }
        },
        {
          "id": "tutupi",
          "label": "Ajak tim makan siang, \"rapikan\" lagi",
          "effect": {
            "kas": -5000000,
            "integritas": -6,
            "kecurigaan": 10
          }
        }
      ]
    }
  },
  "sengketa_tanah": {
    "mediasi": {
      "teks": "Mediasi bulan lalu hanya meredam sebentar. Patok baru dicabut lagi semalam, kedua keluarga saling tuduh.",
      "opsi": [
        {
          "id": "ukur_ulang",
          "label": "Datangkan juru ukur resmi",
          "effect": {
            "kas": -8000000,
            "kepuasan": {
              "petani": 4
            },
            "integritas": 2
          }
        },
        {
          "id": "sertifikat",
          "label": "Ikutkan program sertifikat tanah massal",
          "effect": {
            "kas": -12000000,
            "kepuasan": {
              "petani": 6,
              "tokoh": 2
            },
            "indeks": {
              "ekonomi": 1
            }
          }
        },
        {
          "id": "mediasi",
          "label": "Mediasi lagi, kali ini dengan sesepuh",
          "effect": {
            "kas": -1000000,
            "kepuasan": {
              "tokoh": 3,
              "petani": -1
            }
          }
        }
      ]
    },
    "ukur_ulang": {
      "teks": "Hasil ukur resmi keluar. Pihak yang kalah tidak terima dan mengancam membawa ke pengadilan.",
      "opsi": [
        {
          "id": "damai_ganti",
          "label": "Tawarkan ganti rugi kecil dari desa",
          "effect": {
            "kas": -5000000,
            "kepuasan": {
              "petani": 3,
              "tokoh": 2
            }
          }
        },
        {
          "id": "pengadilan",
          "label": "Silakan, desa pegang hasil ukur",
          "effect": {
            "integritas": 2,
            "kepuasan": {
              "petani": -1
            }
          }
        }
      ]
    },
    "menangkan_kenalan": {
      "teks": "Keluarga yang dikalahkan melapor ke kecamatan dan membawa rekaman percakapan dengan kades.",
      "opsi": [
        {
          "id": "batalkan",
          "label": "Batalkan keputusan, ukur ulang resmi",
          "effect": {
            "kas": -8000000,
            "integritas": 2,
            "popularitas": -2
          }
        },
        {
          "id": "tekan",
          "label": "Tekan pelapor lewat kerabatnya",
          "effect": {
            "integritas": -5,
            "kecurigaan": 8,
            "kepuasan": {
              "tokoh": -3
            }
          }
        }
      ]
    }
  },
  "air_kering": {
    "tangki": {
      "judul": "Warga Minta Sumur Dalam",
      "teks": "Tangki air sudah tiga kali datang. Warga mulai bertanya kenapa desa tidak bikin sumur dalam saja.",
      "opsi": [
        {
          "id": "tandon",
          "label": "Bangun tandon air komunal",
          "effect": {
            "kas": -20000000,
            "kepuasan": {
              "pkk": 5,
              "petani": 3
            },
            "indeks": {
              "lingkungan": 1
            }
          }
        },
        {
          "id": "tangki",
          "label": "Sewa tangki lagi",
          "effect": {
            "kas": -6000000,
            "kepuasan": {
              "pkk": 1
            }
          }
        },
        {
          "id": "resapan",
          "label": "Gerakan sumur resapan dan tanam pohon",
          "effect": {
            "kas": -5000000,
            "indeks": {
              "lingkungan": 3
            },
            "kepuasan": {
              "tokoh": 2
            }
          }
        }
      ]
    },
    "minta_bpbd": {
      "teks": "Bantuan kabupaten datang terlambat dua minggu. Warga sudah keburu beli air galon dengan uang sendiri.",
      "opsi": [
        {
          "id": "tangki",
          "label": "Sewa mobil tangki sendiri",
          "effect": {
            "kas": -6000000,
            "kepuasan": {
              "pkk": 3
            }
          }
        },
        {
          "id": "minta_maaf",
          "label": "Minta maaf terbuka, janji sumur bor",
          "effect": {
            "popularitas": 1,
            "kepuasan": {
              "pkk": 1
            }
          }
        }
      ]
    }
  },
  "banjir": {
    "dapur_umum": {
      "teks": "Banjir datang lagi ke titik yang sama. Relawan bilang ini akan terus terulang selama selokan belum dinormalisasi.",
      "opsi": [
        {
          "id": "normalisasi",
          "label": "Normalisasi kali dan selokan",
          "effect": {
            "kas": -30000000,
            "semuaKepuasan": 2,
            "indeks": {
              "lingkungan": 3
            }
          }
        },
        {
          "id": "dapur_umum",
          "label": "Dapur umum lagi",
          "effect": {
            "kas": -8000000,
            "kepuasan": {
              "pkk": 2
            }
          }
        },
        {
          "id": "relokasi",
          "label": "Tawarkan relokasi ke tanah kas desa",
          "effect": {
            "kas": -15000000,
            "kepuasan": {
              "perantau": 3,
              "petani": -2
            },
            "indeks": {
              "sosial": 2
            }
          }
        }
      ]
    },
    "foto_dulu": {
      "teks": "Foto kades membagi beras saat banjir lalu jadi meme. Kini banjir lagi, dan warga menunggu kades datang tanpa kamera.",
      "opsi": [
        {
          "id": "dapur_umum",
          "label": "Turun langsung, dirikan dapur umum",
          "effect": {
            "kas": -10000000,
            "popularitas": 3,
            "kepuasan": {
              "pkk": 3
            }
          }
        },
        {
          "id": "foto_dulu",
          "label": "Bawa fotografer lagi, kan sudah langganan",
          "effect": {
            "kas": -2000000,
            "popularitas": -4
          }
        }
      ]
    },
    "tunggu_bantuan": {
      "teks": "Banjir merendam lagi dan bantuan kabupaten belum juga datang. Ada warga yang mulai sakit kulit.",
      "opsi": [
        {
          "id": "dapur_umum",
          "label": "Dirikan dapur umum dan posko kesehatan",
          "effect": {
            "kas": -12000000,
            "semuaKepuasan": 2
          }
        },
        {
          "id": "tunggu_bantuan",
          "label": "Tunggu lagi",
          "effect": {
            "semuaKepuasan": -4,
            "popularitas": -4
          }
        }
      ]
    }
  },
  "karang_taruna_dana": {
    "kasih_penuh": {
      "teks": "Karang taruna minta dana lagi. Laporan pertanggungjawaban tahun lalu belum diserahkan, katanya \"nota hilang\".",
      "opsi": [
        {
          "id": "audit_dulu",
          "label": "Minta laporan dulu baru cair",
          "effect": {
            "integritas": 2,
            "kepuasan": {
              "pemuda": -2,
              "tokoh": 2
            }
          }
        },
        {
          "id": "kasih_penuh",
          "label": "Cairkan saja, mereka anak-anak sendiri",
          "effect": {
            "kas": -20000000,
            "kepuasan": {
              "pemuda": 4
            },
            "integritas": -2
          }
        },
        {
          "id": "program",
          "label": "Ganti dengan program usaha pemuda",
          "effect": {
            "kas": -12000000,
            "kepuasan": {
              "pemuda": 3
            },
            "indeks": {
              "ekonomi": 1
            }
          }
        }
      ]
    },
    "kasih_separuh": {
      "teks": "Karang taruna berhasil dapat sponsor dan acaranya sukses. Mereka sekarang minta jadi pengelola wisata desa.",
      "opsi": [
        {
          "id": "kelola_wisata",
          "label": "Serahkan pengelolaan wisata ke pemuda",
          "effect": {
            "kepuasan": {
              "pemuda": 6
            },
            "pemasukanBulanan": 1000000,
            "indeks": {
              "ekonomi": 1
            },
            "setFlag": [
              "pemuda_kelola_wisata"
            ]
          }
        },
        {
          "id": "bumdes_saja",
          "label": "Tetap di BUMDes, pemuda jadi pekerja",
          "effect": {
            "kepuasan": {
              "pemuda": 2,
              "pedagang": 1
            }
          }
        }
      ]
    },
    "tolak": {
      "teks": "Ditolak tahun lalu, karang taruna kini menggalang massa pemuda dan menyindir kades di media sosial.",
      "opsi": [
        {
          "id": "kasih_separuh",
          "label": "Ajak dialog, beri separuh dana",
          "effect": {
            "kas": -10000000,
            "kepuasan": {
              "pemuda": 5
            },
            "popularitas": 1
          }
        },
        {
          "id": "abaikan",
          "label": "Abaikan, nanti juga capek",
          "effect": {
            "kepuasan": {
              "pemuda": -5
            },
            "popularitas": -3
          }
        }
      ]
    }
  },
  "proyek_titipan": {
    "terima": {
      "teks": "Gapura titipan selesai, tapi catnya sudah mengelupas. Kontraktornya kembali menawarkan \"paket\" proyek baru.",
      "opsi": [
        {
          "id": "terima_lagi",
          "label": "Terima lagi, hubungan harus dijaga",
          "effect": {
            "kas": -30000000,
            "dompet": 8000000,
            "kecurigaan": 8,
            "integritas": -5
          }
        },
        {
          "id": "putus",
          "label": "Putus hubungan, tagih perbaikan",
          "effect": {
            "integritas": 3,
            "kepuasan": {
              "tokoh": 2
            },
            "popularitas": -1
          }
        }
      ]
    },
    "laporkan": {
      "teks": "Inspektorat menindaklanjuti laporanmu. Kontraktor titipan diperiksa, dan pejabat yang menitip mulai menjauh.",
      "opsi": [
        {
          "id": "publikasi",
          "label": "Umumkan ke warga sebagai prestasi",
          "effect": {
            "popularitas": 5,
            "integritas": 2
          }
        },
        {
          "id": "diam",
          "label": "Diam saja, jangan menambah musuh",
          "effect": {
            "integritas": 1
          }
        }
      ]
    }
  },
  "hajatan_jalan": {
    "izinkan": {
      "teks": "Setelah hajatan kemarin diizinkan, kini tiga keluarga sekaligus mau menutup jalan di minggu yang sama.",
      "opsi": [
        {
          "id": "aturan_hajatan",
          "label": "Buat perdes jadwal hajatan dan jalur alternatif",
          "effect": {
            "kas": -2000000,
            "kepuasan": {
              "pedagang": 3,
              "tokoh": 1
            },
            "integritas": 1
          }
        },
        {
          "id": "izinkan",
          "label": "Izinkan semua, rezeki pengantin",
          "effect": {
            "kepuasan": {
              "tokoh": 3,
              "pedagang": -5
            }
          }
        }
      ]
    }
  },
  "csr_pabrik": {
    "terima": {
      "teks": "Sejak pengeboran, sumur warga di bawah bukit mulai surut. Pabrik menawarkan CSR tambahan sebagai \"kompensasi\".",
      "opsi": [
        {
          "id": "terima_lagi",
          "label": "Terima kompensasi",
          "effect": {
            "kas": 30000000,
            "indeks": {
              "lingkungan": -3
            },
            "kepuasan": {
              "petani": -4
            }
          }
        },
        {
          "id": "tuntut",
          "label": "Tuntut pabrik kurangi debit air",
          "effect": {
            "integritas": 3,
            "kepuasan": {
              "petani": 5
            },
            "indeks": {
              "lingkungan": 2
            }
          }
        }
      ]
    },
    "tawar": {
      "teks": "Kuota air untuk warga berjalan baik. Pabrik ingin menambah sumur bor dengan kuota yang sama.",
      "opsi": [
        {
          "id": "tambah_kuota",
          "label": "Setuju asal kuota warga naik dua kali",
          "effect": {
            "kas": 15000000,
            "kepuasan": {
              "pkk": 2
            },
            "indeks": {
              "lingkungan": -1
            }
          }
        },
        {
          "id": "tolak",
          "label": "Cukup satu sumur",
          "effect": {
            "indeks": {
              "lingkungan": 1
            },
            "kepuasan": {
              "tokoh": 1
            }
          }
        }
      ]
    }
  },
  "pohon_tumbang": {
    "gotong": {
      "teks": "Warga yang kemarin bergotong royong menyarankan pohon-pohon tua di pinggir jalan dipangkas sebelum musim angin.",
      "opsi": [
        {
          "id": "pangkas",
          "label": "Jadwalkan pemangkasan rutin",
          "effect": {
            "kas": -4000000,
            "kepuasan": {
              "tokoh": 2,
              "pemuda": 1
            },
            "indeks": {
              "lingkungan": 1
            }
          }
        },
        {
          "id": "biar",
          "label": "Biarkan, pohon tua juga peneduh",
          "effect": {
            "kepuasan": {
              "pkk": -1
            }
          }
        }
      ]
    }
  },
  "beasiswa": {
    "pinjaman": {
      "teks": "Mahasiswa penerima pinjaman tanpa bunga sudah lulus. Sebagian belum bisa mencicil karena belum dapat kerja.",
      "opsi": [
        {
          "id": "putihkan",
          "label": "Putihkan utangnya, jadi beasiswa",
          "effect": {
            "kas": -5000000,
            "kepuasan": {
              "pemuda": 4,
              "petani": 2
            }
          }
        },
        {
          "id": "magang_desa",
          "label": "Bayar lewat magang di kantor desa",
          "effect": {
            "kepuasan": {
              "pemuda": 2
            },
            "indeks": {
              "sosial": 1
            }
          }
        }
      ]
    }
  },
  "buzzer_tawaran": {
    "beli": {
      "teks": "Akun-akun buzzer desa mulai ketahuan. Ada yang membongkar bahwa semuanya dikelola dari satu nomor HP.",
      "opsi": [
        {
          "id": "hentikan",
          "label": "Hentikan dan minta maaf",
          "effect": {
            "popularitas": -2,
            "integritas": 3
          }
        },
        {
          "id": "perbarui",
          "label": "Ganti akun baru, bayar lebih mahal",
          "effect": {
            "kas": -8000000,
            "popularitas": 2,
            "integritas": -3,
            "kecurigaan": 4
          }
        }
      ]
    }
  }
};

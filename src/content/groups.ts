import type { GroupDef } from '../types.ts';

export const GROUPS: GroupDef[] = [
  { id: 'petani', nama: 'Petani', jiwa: 900, kebutuhan: ['irigasi', 'jalan', 'air'] },
  { id: 'pedagang', nama: 'Pedagang', jiwa: 350, kebutuhan: ['pasar', 'jalan', 'lampu'] },
  { id: 'pemuda', nama: 'Pemuda', jiwa: 500, kebutuhan: ['lapangan', 'internet'] },
  { id: 'pkk', nama: 'Ibu-ibu PKK', jiwa: 450, kebutuhan: ['posyandu', 'air'] },
  { id: 'tokoh', nama: 'Tokoh Agama & Adat', jiwa: 120, kebutuhan: ['lampu', 'jalan'] },
  { id: 'perantau', nama: 'Keluarga Perantau', jiwa: 280, kebutuhan: ['jalan', 'internet'] },
];

export const GROUP_IDS = GROUPS.map((g) => g.id);

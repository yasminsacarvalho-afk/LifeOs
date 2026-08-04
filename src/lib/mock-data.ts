export type TripStatus = "checked-in" | "imminent" | "delayed" | "scheduled";

export interface Trip {
  id: string;
  code: string;
  departure: string; // HH:mm
  arrival: string;
  origin: string;
  destination: string;
  service: string;
  route: string;
  status: TripStatus;
  bus?: string;
  driver?: string;
  packages?: number;
  checkedInAt?: string;
  delayMinutes?: number;
  countdownSeconds?: number;
}

export const trips: Trip[] = [
  {
    id: "t-1",
    code: "VF-1092",
    departure: "13:30",
    arrival: "20:10",
    origin: "Curitiba",
    destination: "Florianópolis",
    service: "Leito Premium",
    route: "Rota Sul 014",
    status: "checked-in",
    bus: "C-4022 (Scania K410)",
    driver: "M. Roberto Silva",
    packages: 8,
    checkedInAt: "13:28",
  },
  {
    id: "t-2",
    code: "VF-0841",
    departure: "14:15",
    arrival: "22:50",
    origin: "Belo Horizonte",
    destination: "Brasília",
    service: "Executivo",
    route: "Rota 042-S",
    status: "delayed",
    delayMinutes: 27,
  },
  {
    id: "t-3",
    code: "VF-2204",
    departure: "14:45",
    arrival: "21:30",
    origin: "São Paulo (Tietê)",
    destination: "Rio de Janeiro",
    service: "Leito Plus",
    route: "Rota Ouro 008",
    status: "imminent",
    countdownSeconds: 12 * 60 + 45,
  },
  {
    id: "t-4",
    code: "VF-3318",
    departure: "15:15",
    arrival: "19:40",
    origin: "Brasília",
    destination: "Goiânia",
    service: "Semi-Leito",
    route: "Centro-Oeste 102",
    status: "scheduled",
    countdownSeconds: 33 * 60,
  },
  {
    id: "t-5",
    code: "VF-4501",
    departure: "16:00",
    arrival: "23:15",
    origin: "Porto Alegre",
    destination: "Florianópolis",
    service: "Convencional",
    route: "Rota Sul 022",
    status: "scheduled",
    countdownSeconds: 78 * 60,
  },
  {
    id: "t-6",
    code: "VF-5210",
    departure: "17:30",
    arrival: "06:00",
    origin: "São Paulo (Barra Funda)",
    destination: "Salvador",
    service: "Leito Cama",
    route: "Nordeste Express",
    status: "scheduled",
    countdownSeconds: 168 * 60,
  },
];

export interface PartnerRanking {
  rank: number;
  name: string;
  revenue: string;
  commission: string;
  goal: number;
}

export const ranking: PartnerRanking[] = [
  { rank: 1, name: "Agência Central SP", revenue: "R$ 142.300", commission: "R$ 12.400", goal: 94 },
  { rank: 2, name: "LifeOs Parceria Sul", revenue: "R$ 98.700", commission: "R$ 8.900", goal: 81 },
  { rank: 3, name: "Trans-Rio Master", revenue: "R$ 75.120", commission: "R$ 7.100", goal: 68 },
  { rank: 4, name: "Litoral Express BA", revenue: "R$ 61.400", commission: "R$ 5.880", goal: 54 },
  { rank: 5, name: "Pampa Viagens RS", revenue: "R$ 48.250", commission: "R$ 4.310", goal: 42 },
];

export interface RevenuePoint {
  day: string;
  revenue: number;
  commission: number;
}

export const revenueSeries: RevenuePoint[] = [
  { day: "Seg", revenue: 38200, commission: 3420 },
  { day: "Ter", revenue: 42100, commission: 3780 },
  { day: "Qua", revenue: 36800, commission: 3300 },
  { day: "Qui", revenue: 51200, commission: 4600 },
  { day: "Sex", revenue: 58400, commission: 5240 },
  { day: "Sáb", revenue: 47900, commission: 4310 },
  { day: "Hoje", revenue: 48290, commission: 4120 },
];

export interface CompanyShare {
  name: string;
  value: number;
}

export const companyShare: CompanyShare[] = [
  { name: "LifeOs SP", value: 38 },
  { name: "LifeOs Sul", value: 27 },
  { name: "Trans-Rio", value: 18 },
  { name: "Litoral BA", value: 11 },
  { name: "Outros", value: 6 },
];

import type { Tables } from "@/integrations/supabase/types";

export type DbTrip = Tables<"trips">;

export type UiTripStatus = "checked-in" | "imminent" | "delayed" | "scheduled";

export interface UiTrip {
  id: string;
  code: string;
  departure: string;
  arrival: string;
  origin: string;
  destination: string;
  service: string;
  route: string;
  status: UiTripStatus;
  bus?: string;
  driver?: string;
  packages?: number;
  checkedInAt?: string;
  delayMinutes?: number;
  countdownSeconds?: number;
}

function fmtTime(iso: string | null): string {
  if (!iso) return "--:--";
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour12: false, hour: "2-digit", minute: "2-digit" });
}

export function deriveStatus(trip: DbTrip, now: Date): UiTripStatus {
  if (trip.status === "checked_in") return "checked-in";
  if (trip.status === "cancelled") return "scheduled";
  const sched = new Date(trip.scheduled_departure).getTime();
  const diffMin = (sched - now.getTime()) / 60000;
  if (diffMin < -1) return "delayed";
  if (diffMin <= 15) return "imminent";
  return "scheduled";
}

export function dbTripToUi(trip: DbTrip, now: Date): UiTrip {
  const status = deriveStatus(trip, now);
  const sched = new Date(trip.scheduled_departure).getTime();
  const diffSec = Math.round((sched - now.getTime()) / 1000);
  return {
    id: trip.id,
    code: trip.code,
    departure: fmtTime(trip.scheduled_departure),
    arrival: "--:--",
    origin: trip.origin,
    destination: trip.destination,
    service: "Operacional",
    route: `Rota ${trip.code.slice(-3)}`,
    status,
    bus: trip.car_plate ?? undefined,
    driver: trip.driver_name ?? undefined,
    checkedInAt: trip.real_departure ? fmtTime(trip.real_departure) : undefined,
    delayMinutes: status === "delayed" ? Math.round(-diffSec / 60) : undefined,
    countdownSeconds: status === "imminent" || status === "scheduled" ? Math.max(0, diffSec) : undefined,
  };
}

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
  route_name?: string | null;
  origin_code?: string | null;
  destination_code?: string | null;
  status: UiTripStatus;
  bus?: string;
  driver?: string;
  packages?: number;
  checkedInAt?: string;
  delayMinutes?: number;
  countdownSeconds?: number;
  company_id?: string | null;
  raw_scheduled_departure?: string;
  partnerName?: string;
  cities?: string[] | null;
  raw_real_departure?: string | null;
  direction?: string | null;
  operating_days?: number[] | null;
  agent_indicated_time?: string | null;
  hide_from_dashboard?: boolean | null;
}

function fmtTime(iso: string | null): string {
  if (!iso) return "--:--";
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour12: false, hour: "2-digit", minute: "2-digit" });
}

function getTodayScheduleTime(trip: DbTrip, now: Date): number {
  const schedDate = new Date(trip.scheduled_departure);
  const todaySched = new Date(now);
  todaySched.setHours(schedDate.getHours(), schedDate.getMinutes(), schedDate.getSeconds(), 0);
  return todaySched.getTime();
}

function isToday(dateString: string | null, now: Date): boolean {
  if (!dateString) return false;
  const d = new Date(dateString);
  return d.toDateString() === now.toDateString();
}

export function deriveStatus(trip: DbTrip, now: Date): UiTripStatus {
  if (trip.status === "checked_in" && isToday(trip.real_departure, now)) return "checked-in";
  if (trip.status === "cancelled") return "scheduled";
  const sched = getTodayScheduleTime(trip, now);
  const diffMin = (sched - now.getTime()) / 60000;
  if (diffMin < -1) return "delayed";
  if (diffMin <= 15) return "imminent";
  return "scheduled";
}

export function dbTripToUi(trip: DbTrip, now: Date): UiTrip {
  const status = deriveStatus(trip, now);
  const checkedInToday = isToday(trip.real_departure, now);
  const updatedToday = isToday(trip.updated_at, now);
  const sched = getTodayScheduleTime(trip, now);
  const diffSec = Math.round((sched - now.getTime()) / 1000);
  
  let agentTime = null;
  if (trip.agent_indicated_time) {
    if (trip.agent_indicated_time.includes("|")) {
      const [datePart, timePart] = trip.agent_indicated_time.split("|");
      if (isToday(datePart, now)) {
        agentTime = timePart;
      }
    } else {
      // Fallback for old values
      if (updatedToday) {
        agentTime = trip.agent_indicated_time;
      }
    }
  }

  return {
    id: trip.id,
    code: trip.code,
    departure: fmtTime(trip.scheduled_departure),
    arrival: "--:--",
    origin: trip.origin,
    destination: trip.destination,
    service: "Operacional",
    route: trip.route_name || `Rota ${trip.code.slice(-3)}`,
    route_name: trip.route_name,
    origin_code: trip.origin_code,
    destination_code: trip.destination_code,
    status,
    bus: checkedInToday ? (trip.car_plate ?? undefined) : undefined,
    driver: checkedInToday ? (trip.driver_name ?? undefined) : undefined,
    checkedInAt: checkedInToday && trip.real_departure ? fmtTime(trip.real_departure) : undefined,
    delayMinutes: status === "delayed" ? Math.round(-diffSec / 60) : undefined,
    countdownSeconds: status === "imminent" || status === "scheduled" ? Math.max(0, diffSec) : undefined,
    company_id: trip.company_id,
    raw_scheduled_departure: new Date(sched).toISOString(),
    cities: trip.cities,
    raw_real_departure: checkedInToday ? trip.real_departure : null,
    direction: trip.direction,
    operating_days: trip.operating_days,
    agent_indicated_time: agentTime,
    hide_from_dashboard: trip.hide_from_dashboard,
  };
}

/**
 * SLA target calculator honoring `sla_definitions.business_hours_only` and
 * `app_settings['sla.business_hours']` in Indian Standard Time (IST, UTC+05:30).
 *
 * Pure TypeScript - safe to import in server routes, client previews, and unit tests.
 */

export type DayName = "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";
export type BusinessHoursMap = Partial<Record<DayName, string>>;

const DAY_NAMES: DayName[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const IST_OFFSET_MINS = 330; // Asia/Kolkata is fixed UTC+05:30 (no DST)

const DEFAULT_BUSINESS_HOURS: Record<DayName, string> = {
  Mon: "07:00-21:00",
  Tue: "07:00-21:00",
  Wed: "07:00-21:00",
  Thu: "07:00-21:00",
  Fri: "07:00-21:00",
  Sat: "08:00-20:00",
  Sun: "08:00-18:00",
};

interface DayWindow {
  openMin: number; // minutes from 00:00 IST
  closeMin: number;
}

export function parseBusinessWindow(spec?: string | null): DayWindow | null {
  if (!spec) return null;
  const trimmed = spec.trim();
  if (!trimmed || /^closed$/i.test(trimmed)) return null;
  const m = trimmed.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const openMin = Number(m[1]) * 60 + Number(m[2]);
  const closeMin = Number(m[3]) * 60 + Number(m[4]);
  if (openMin < 0 || closeMin > 1440 || closeMin <= openMin) return null;
  return { openMin, closeMin };
}

/**
 * Adds `durationMins` to `start`. When `businessHoursOnly` is true, time only ticks
 * inside open studio hours in IST (`Asia/Kolkata`). Falls back to wall-clock minutes
 * if all 7 days are configured as Closed.
 */
export function addSlaMinutes(
  start: Date,
  durationMins: number,
  businessHoursOnly: boolean,
  businessHours?: BusinessHoursMap | null,
): Date {
  const mins = Math.max(1, Math.round(durationMins));
  if (!businessHoursOnly) {
    return new Date(start.getTime() + mins * 60_000);
  }

  const schedule: Record<DayName, DayWindow | null> = {
    Sun: null,
    Mon: null,
    Tue: null,
    Wed: null,
    Thu: null,
    Fri: null,
    Sat: null,
  };
  let anyOpen = false;
  const source = businessHours && Object.keys(businessHours).length > 0 ? businessHours : DEFAULT_BUSINESS_HOURS;
  for (const d of DAY_NAMES) {
    const win = parseBusinessWindow(source[d] ?? DEFAULT_BUSINESS_HOURS[d]);
    schedule[d] = win;
    if (win) anyOpen = true;
  }

  if (!anyOpen) {
    return new Date(start.getTime() + mins * 60_000);
  }

  // Work in IST epoch minutes so day-of-week and time-of-day arithmetic are exact.
  let cursorIstMins = Math.floor(start.getTime() / 60_000) + IST_OFFSET_MINS;
  const subMinuteMs = start.getTime() % 60_000;
  let remaining = mins;
  let guard = 0;

  while (remaining > 0 && guard < 400) {
    guard++;
    const dayStartMins = Math.floor(cursorIstMins / 1440) * 1440;
    const minuteOfDay = cursorIstMins - dayStartMins;
    // 1970-01-01 was Thursday (index 4)
    const dayIndex = (((Math.floor(cursorIstMins / 1440) + 4) % 7) + 7) % 7;
    const win = schedule[DAY_NAMES[dayIndex]];

    if (!win || minuteOfDay >= win.closeMin) {
      // Advance to 00:00 IST of next day
      cursorIstMins = dayStartMins + 1440;
      continue;
    }

    if (minuteOfDay < win.openMin) {
      cursorIstMins = dayStartMins + win.openMin;
    }

    const effectiveMinOfDay = cursorIstMins - dayStartMins;
    const availableToday = win.closeMin - effectiveMinOfDay;
    if (remaining <= availableToday) {
      cursorIstMins += remaining;
      remaining = 0;
      break;
    }

    remaining -= availableToday;
    cursorIstMins = dayStartMins + 1440;
  }

  const utcMs = (cursorIstMins - IST_OFFSET_MINS) * 60_000 + subMinuteMs;
  return new Date(utcMs);
}

function buildSchedule(businessHours?: BusinessHoursMap | null): Record<DayName, DayWindow | null> | null {
  const source = businessHours && Object.keys(businessHours).length > 0 ? businessHours : DEFAULT_BUSINESS_HOURS;
  const schedule = {} as Record<DayName, DayWindow | null>;
  let anyOpen = false;
  for (const d of DAY_NAMES) {
    schedule[d] = parseBusinessWindow(source[d] ?? DEFAULT_BUSINESS_HOURS[d]);
    if (schedule[d]) anyOpen = true;
  }
  return anyOpen ? schedule : null;
}

/**
 * Adds `days` business days to `start`: the target is the same IST time of day on
 * the Nth open studio day after `start`, clamped to that day's closing time. A ticket
 * raised while the studio is closed starts counting from the next opening time.
 * "5 business days" therefore means exactly that, not 5 x (hours per day) of minutes.
 * Falls back to calendar days when every day is Closed.
 */
export function addSlaBusinessDays(start: Date, days: number, businessHours?: BusinessHoursMap | null): Date {
  const n = Math.max(1, Math.round(days));
  const schedule = buildSchedule(businessHours);
  if (!schedule) return new Date(start.getTime() + n * 86_400_000);

  const dayIdx = (istDay: number) => (((istDay + 4) % 7) + 7) % 7; // 1970-01-01 was Thursday
  const winFor = (istDay: number) => schedule[DAY_NAMES[dayIdx(istDay)]];

  let istMins = Math.floor(start.getTime() / 60_000) + IST_OFFSET_MINS;
  let day = Math.floor(istMins / 1440);
  let minuteOfDay = istMins - day * 1440;

  // Normalise the start into open hours.
  for (let guard = 0; guard < 14; guard++) {
    const w = winFor(day);
    if (w && minuteOfDay < w.closeMin) {
      if (minuteOfDay < w.openMin) minuteOfDay = w.openMin;
      break;
    }
    day++;
    minuteOfDay = 0;
  }

  // Step forward N open days.
  let counted = 0;
  for (let guard = 0; counted < n && guard < 400; guard++) {
    day++;
    if (winFor(day)) counted++;
  }
  const w = winFor(day)!;
  const finalMin = Math.min(Math.max(minuteOfDay, w.openMin), w.closeMin);
  istMins = day * 1440 + finalMin;
  return new Date((istMins - IST_OFFSET_MINS) * 60_000);
}

export function computeSlaTargets(opts: {
  createdAt?: Date;
  responseTargetMins: number;
  resolutionTargetMins: number;
  /** When set, wins over the matching *Mins value and counts open studio days. */
  responseTargetDays?: number | null;
  resolutionTargetDays?: number | null;
  businessHoursOnly: boolean;
  businessHours?: BusinessHoursMap | null;
}): { slaResponseTarget: string; slaResolutionTarget: string } {
  const base = opts.createdAt ?? new Date();
  const resp = opts.responseTargetDays
    ? addSlaBusinessDays(base, opts.responseTargetDays, opts.businessHours)
    : addSlaMinutes(base, opts.responseTargetMins, opts.businessHoursOnly, opts.businessHours);
  const res = opts.resolutionTargetDays
    ? addSlaBusinessDays(base, opts.resolutionTargetDays, opts.businessHours)
    : addSlaMinutes(base, opts.resolutionTargetMins, opts.businessHoursOnly, opts.businessHours);
  return {
    slaResponseTarget: resp.toISOString(),
    slaResolutionTarget: res.toISOString(),
  };
}

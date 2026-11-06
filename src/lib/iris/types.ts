// IRIS Platform — Types & Constants

export type Priority = "P0" | "P1" | "P2" | "P3";
export type TicketStatus =
  | "open"
  | "in_progress"
  | "awaiting_response"
  | "resolved"
  | "closed"
  | "escalated";
export type SLAStatus = "on_track" | "at_risk" | "breached" | "paused";
export type Studio = {
  id: string;
  name: string;
  city: "Mumbai" | "Bengaluru";
  code: string;
  address?: string;
};

export type Department = {
  id: string;
  name: string;
  code: string;
  description?: string;
  headId?: string;
};

export type Employee = {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  title?: string;
  departmentCode: string;
  studioCodes: string[];
  skills: string[];
  availability: "available" | "busy" | "offline" | "on_leave";
  workload: number;
  maxWorkload: number;
  escalationOrder: number;
};

export const STUDIOS: Studio[] = [
  {
    id: "studio_kwality",
    name: "Kwality House",
    city: "Mumbai",
    code: "KH",
    address: "Kwality House, August Kranti Marg, Kemps Corner, Mumbai",
  },
  {
    id: "studio_supreme",
    name: "Supreme HQ",
    city: "Mumbai",
    code: "SHQ",
    address: "Supreme Business Park, Hiranandani Gardens, Powai, Mumbai",
  },
  {
    id: "studio_kenkere",
    name: "Kenkere House",
    city: "Bengaluru",
    code: "KHB",
    address: "Kenkere House, Indiranagar, Bengaluru",
  },
  {
    id: "studio_popup",
    name: "Pop Up Studio",
    city: "Mumbai",
    code: "PU",
    address: "Pop-up Location, Bandra West, Mumbai",
  },
];

export const DEPARTMENTS: Department[] = [
  { id: "dept_frt", name: "Front Desk & Operations", code: "FRT", description: "Studio front desk, check-ins, member facing operations" },
  { id: "dept_mem", name: "Memberships & Client Services", code: "MEM", description: "Membership management, freezes, credit adjustments, refunds" },
  { id: "dept_pay", name: "Payments & Finance", code: "PAY", description: "Payments, refunds, billing reconciliation, financial reporting" },
  { id: "dept_fac", name: "Facilities & Maintenance", code: "FAC", description: "Studio equipment, AC, sound, cleanliness, infrastructure" },
  { id: "dept_it", name: "IT & Systems", code: "ITS", description: "Momence, network, hardware, software, integrations" },
  { id: "dept_sch", name: "Scheduling & Bookings", code: "SCH", description: "Session scheduling, recurring bookings, waitlists, cancellations" },
  { id: "dept_trn", name: "Training & Instruction", code: "TRN", description: "Trainer schedules, attendance, class quality, instructor issues" },
  { id: "dept_mkt", name: "Marketing & Communications", code: "MKT", description: "Promotions, campaigns, social, member communications" },
  { id: "dept_hrv", name: "HR & People", code: "HRV", description: "Staff, payroll, leaves, performance, hiring" },
  { id: "dept_mgt", name: "Management & Strategy", code: "MGT", description: "Studio management, escalations, strategy, leadership" },
];

export const EMPLOYEES: Employee[] = [
  { id: "emp_001", employeeCode: "P57-FRT-001", name: "Aarav Mehta", email: "aarav.mehta@physique57.in", phone: "+91 98200 11111", role: "Front Desk Lead", title: "Senior Front Desk Lead", departmentCode: "FRT", studioCodes: ["KH"], skills: ["check-in", "member-services", "Momence"], availability: "available", workload: 4, maxWorkload: 15, escalationOrder: 1 },
  { id: "emp_002", employeeCode: "P57-FRT-002", name: "Diya Sharma", email: "diya.sharma@physique57.in", phone: "+91 98200 22222", role: "Front Desk Associate", title: "Front Desk Associate", departmentCode: "FRT", studioCodes: ["SHQ"], skills: ["check-in", "member-services"], availability: "available", workload: 2, maxWorkload: 12, escalationOrder: 2 },
  { id: "emp_003", employeeCode: "P57-FRT-003", name: "Kabir Reddy", email: "kabir.reddy@physique57.in", phone: "+91 80 33333 444", role: "Front Desk Lead", title: "Bengaluru Front Desk Lead", departmentCode: "FRT", studioCodes: ["KHB"], skills: ["check-in", "member-services", "Momence"], availability: "busy", workload: 6, maxWorkload: 15, escalationOrder: 1 },
  { id: "emp_004", employeeCode: "P57-FRT-004", name: "Ananya Iyer", email: "ananya.iyer@physique57.in", phone: "+91 98200 44444", role: "Front Desk Associate", title: "Front Desk Associate", departmentCode: "FRT", studioCodes: ["PU"], skills: ["check-in", "events"], availability: "available", workload: 1, maxWorkload: 12, escalationOrder: 2 },
  { id: "emp_010", employeeCode: "P57-MEM-010", name: "Ishita Nair", email: "ishita.nair@physique57.in", phone: "+91 98200 55555", role: "Memberships Manager", title: "Head of Memberships", departmentCode: "MEM", studioCodes: ["KH", "SHQ", "KHB", "PU"], skills: ["memberships", "Momence", "freezes", "credits", "refunds"], availability: "available", workload: 7, maxWorkload: 20, escalationOrder: 1 },
  { id: "emp_011", employeeCode: "P57-MEM-011", name: "Rohan Desai", email: "rohan.desai@physique57.in", phone: "+91 98200 66666", role: "Memberships Associate", title: "Memberships Associate", departmentCode: "MEM", studioCodes: ["KH", "SHQ"], skills: ["memberships", "Momence"], availability: "available", workload: 3, maxWorkload: 15, escalationOrder: 2 },
  { id: "emp_020", employeeCode: "P57-PAY-020", name: "Meera Krishnan", email: "meera.krishnan@physique57.in", phone: "+91 98200 77777", role: "Finance Manager", title: "Finance Manager", departmentCode: "PAY", studioCodes: ["KH", "SHQ", "KHB", "PU"], skills: ["payments", "reconciliation", "billing", "Momence"], availability: "available", workload: 5, maxWorkload: 18, escalationOrder: 1 },
  { id: "emp_021", employeeCode: "P57-PAY-021", name: "Vivaan Gupta", email: "vivaan.gupta@physique57.in", phone: "+91 98200 88888", role: "Payments Associate", title: "Payments Associate", departmentCode: "PAY", studioCodes: ["KH", "SHQ"], skills: ["payments", "billing"], availability: "available", workload: 2, maxWorkload: 12, escalationOrder: 2 },
  { id: "emp_030", employeeCode: "P57-FAC-030", name: "Arjun Pillai", email: "arjun.pillai@physique57.in", phone: "+91 98200 99999", role: "Facilities Manager", title: "Head of Facilities", departmentCode: "FAC", studioCodes: ["KH", "SHQ", "KHB", "PU"], skills: ["HVAC", "electrical", "plumbing", "equipment"], availability: "available", workload: 6, maxWorkload: 18, escalationOrder: 1 },
  { id: "emp_031", employeeCode: "P57-FAC-031", name: "Sara Khan", email: "sara.khan@physique57.in", phone: "+91 98200 10101", role: "Maintenance Associate", title: "Maintenance Associate", departmentCode: "FAC", studioCodes: ["KH"], skills: ["cleaning", "equipment"], availability: "busy", workload: 8, maxWorkload: 14, escalationOrder: 2 },
  { id: "emp_032", employeeCode: "P57-FAC-032", name: "Devraj Singh", email: "devraj.singh@physique57.in", phone: "+91 80 45678 901", role: "Bengaluru Facilities Lead", title: "Bengaluru Facilities Lead", departmentCode: "FAC", studioCodes: ["KHB"], skills: ["HVAC", "electrical", "equipment"], availability: "available", workload: 3, maxWorkload: 15, escalationOrder: 1 },
  { id: "emp_040", employeeCode: "P57-ITS-040", name: "Neel Patel", email: "neel.patel@physique57.in", phone: "+91 98200 12121", role: "IT Manager", title: "Head of IT & Systems", departmentCode: "ITS", studioCodes: ["KH", "SHQ", "KHB", "PU"], skills: ["Momence", "network", "hardware", "software", "integrations"], availability: "available", workload: 5, maxWorkload: 20, escalationOrder: 1 },
  { id: "emp_041", employeeCode: "P57-ITS-041", name: "Priya Joshi", email: "priya.joshi@physique57.in", phone: "+91 98200 13131", role: "Systems Administrator", title: "Systems Administrator", departmentCode: "ITS", studioCodes: ["KH", "SHQ"], skills: ["Momence", "network"], availability: "available", workload: 4, maxWorkload: 14, escalationOrder: 2 },
  { id: "emp_050", employeeCode: "P57-SCH-050", name: "Aanya Verma", email: "aanya.verma@physique57.in", phone: "+91 98200 14141", role: "Scheduling Manager", title: "Scheduling Manager", departmentCode: "SCH", studioCodes: ["KH", "SHQ", "KHB", "PU"], skills: ["Momence", "scheduling", "waitlists"], availability: "available", workload: 5, maxWorkload: 16, escalationOrder: 1 },
  { id: "emp_051", employeeCode: "P57-SCH-051", name: "Vihaan Rao", email: "vihaan.rao@physique57.in", phone: "+91 98200 15151", role: "Bookings Associate", title: "Bookings Associate", departmentCode: "SCH", studioCodes: ["KH", "SHQ"], skills: ["Momence", "bookings"], availability: "available", workload: 3, maxWorkload: 14, escalationOrder: 2 },
  { id: "emp_060", employeeCode: "P57-TRN-060", name: "Tara Kapoor", email: "tara.kapoor@physique57.in", phone: "+91 98200 16161", role: "Head Trainer", title: "Head Trainer & Training Manager", departmentCode: "TRN", studioCodes: ["KH", "SHQ"], skills: ["training", "instruction", "attendance"], availability: "available", workload: 4, maxWorkload: 16, escalationOrder: 1 },
  { id: "emp_061", employeeCode: "P57-TRN-061", name: "Reyaan Malhotra", email: "reyaan.malhotra@physique57.in", phone: "+91 98200 17171", role: "Senior Trainer", title: "Senior Trainer", departmentCode: "TRN", studioCodes: ["KHB"], skills: ["training", "instruction"], availability: "available", workload: 3, maxWorkload: 14, escalationOrder: 1 },
  { id: "emp_070", employeeCode: "P57-MKT-070", name: "Kiara Bhatia", email: "kiara.bhatia@physique57.in", phone: "+91 98200 18181", role: "Marketing Manager", title: "Marketing Manager", departmentCode: "MKT", studioCodes: ["KH", "SHQ", "KHB", "PU"], skills: ["campaigns", "social", "email", "communications"], availability: "available", workload: 4, maxWorkload: 16, escalationOrder: 1 },
  { id: "emp_080", employeeCode: "P57-HRV-080", name: "Aditya Menon", email: "aditya.menon@physique57.in", phone: "+91 98200 19191", role: "HR Manager", title: "HR Manager", departmentCode: "HRV", studioCodes: ["KH", "SHQ", "KHB", "PU"], skills: ["hr", "payroll", "performance", "hiring"], availability: "available", workload: 3, maxWorkload: 14, escalationOrder: 1 },
  { id: "emp_090", employeeCode: "P57-MGT-090", name: "Sanaya Wadia", email: "sanaya.wadia@physique57.in", phone: "+91 98200 20202", role: "Studio Director", title: "India Director — Physique 57", departmentCode: "MGT", studioCodes: ["KH", "SHQ", "KHB", "PU"], skills: ["leadership", "strategy", "operations", "escalations"], availability: "available", workload: 2, maxWorkload: 10, escalationOrder: 1 },
  { id: "emp_091", employeeCode: "P57-MGT-091", name: "Farhan Ali", email: "farhan.ali@physique57.in", phone: "+91 98200 21212", role: "Operations Manager", title: "Operations Manager", departmentCode: "MGT", studioCodes: ["KH", "SHQ"], skills: ["operations", "process"], availability: "available", workload: 4, maxWorkload: 14, escalationOrder: 2 },
];

export const EMPLOYEE_MAP: Record<string, Employee> = Object.fromEntries(
  EMPLOYEES.map((e) => [e.id, e])
);
export const DEPT_MAP: Record<string, Department> = Object.fromEntries(
  DEPARTMENTS.map((d) => [d.code, d])
);
export const STUDIO_MAP: Record<string, Studio> = Object.fromEntries(
  STUDIOS.map((s) => [s.code, s])
);

export const PRIORITY_CONFIG: Record<
  Priority,
  {
    label: string;
    description: string;
    responseMins: number;
    resolutionMins: number;
    color: string;
    bg: string;
    ring: string;
    text: string;
  }
> = {
  P0: {
    label: "P0 — Critical",
    description: "Safety incidents, major operational disruptions, critical system failures",
    responseMins: 15,
    resolutionMins: 240,
    color: "rose",
    bg: "bg-rose-500/10",
    ring: "ring-rose-500/30",
    text: "text-rose-600 dark:text-rose-400",
  },
  P1: {
    label: "P1 — High",
    description: "Significant client-facing disruptions, essential equipment failures",
    responseMins: 60,
    resolutionMins: 720,
    color: "amber",
    bg: "bg-amber-500/10",
    ring: "ring-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
  },
  P2: {
    label: "P2 — Medium",
    description: "Individual client requests, non-critical technical issues",
    responseMins: 240,
    resolutionMins: 2880,
    color: "sky",
    bg: "bg-sky-500/10",
    ring: "ring-sky-500/30",
    text: "text-sky-600 dark:text-sky-400",
  },
  P3: {
    label: "P3 — Low",
    description: "General enquiries, minor improvements, non-urgent admin",
    responseMins: 720,
    resolutionMins: 10080,
    color: "emerald",
    bg: "bg-emerald-500/10",
    ring: "ring-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-400",
  },
};

export const STATUS_CONFIG: Record<
  TicketStatus,
  { label: string; color: string; bg: string; text: string; dot: string }
> = {
  open: { label: "Open", color: "sky", bg: "bg-sky-500/10", text: "text-sky-600 dark:text-sky-400", dot: "bg-sky-500" },
  in_progress: { label: "In Progress", color: "violet", bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", dot: "bg-violet-500" },
  awaiting_response: { label: "Awaiting Response", color: "amber", bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
  resolved: { label: "Resolved", color: "emerald", bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
  closed: { label: "Closed", color: "slate", bg: "bg-slate-500/10", text: "text-slate-600 dark:text-slate-400", dot: "bg-slate-500" },
  escalated: { label: "Escalated", color: "rose", bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", dot: "bg-rose-500" },
};

export const SLA_STATUS_CONFIG: Record<
  SLAStatus,
  { label: string; text: string; bg: string }
> = {
  on_track: { label: "On Track", text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  at_risk: { label: "At Risk", text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
  breached: { label: "Breached", text: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10" },
  paused: { label: "Paused", text: "text-slate-600 dark:text-slate-400", bg: "bg-slate-500/10" },
};

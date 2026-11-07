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

// Note: Employee is declared below (after STUDIOS/DEPARTMENTS) with the full
// field set including departmentName, location, reportingManager, birthday.
// Do not redeclare it here — the earlier declaration was a duplicate that
// TypeScript would silently override anyway.

export const STUDIOS: Studio[] = [
  { id: "studio_kwality", name: "Kwality House, Kemps Corner", city: "Mumbai", code: "KH", address: "Kwality House, Kemps Corner, Mumbai" },
  { id: "studio_supreme", name: "Supreme HQ, Bandra", city: "Mumbai", code: "SHQ", address: "Supreme HQ, Bandra, Mumbai" },
  { id: "studio_kenkere", name: "Kenkere House, Bengaluru", city: "Bengaluru", code: "KHB", address: "Kenkere House, Bengaluru" },
  { id: "studio_popup", name: "Pop Up Studio", city: "Mumbai", code: "PU", address: "Pop-up Location, Mumbai" },
];

export const DEPARTMENTS: Department[] = [
  // Core organisational departments (5)
  { id: "dept_ops", name: "Operations", code: "OPS", description: "Studio operations, facilities, maintenance" },
  { id: "dept_scs", name: "Sales & Client Servicing", code: "SCS", description: "Client servicing, memberships, front desk" },
  { id: "dept_trn", name: "Training", code: "TRN", description: "Trainers, instruction, class quality" },
  { id: "dept_mkt", name: "Marketing", code: "MKT", description: "Marketing, campaigns, communications" },
  { id: "dept_mgt", name: "Management", code: "MGT", description: "Leadership, strategy, escalations" },

  // Operational sub-departments used by ticket routing & sample data.
  // These are the codes the conversation engine routes to (FAC, MEM, PAY,
  // SCH, ITS, HRV, FRT) — declaring them here means getDepartment() resolves
  // correctly instead of returning undefined for routed tickets.
  { id: "dept_fac", name: "Facilities", code: "FAC", description: "Facilities maintenance, HVAC, audio, equipment, plumbing" },
  { id: "dept_mem", name: "Memberships", code: "MEM", description: "Membership freezes, credits, changes, cancellations" },
  { id: "dept_pay", name: "Payments & Finance", code: "PAY", description: "Payment disputes, refunds, invoices, GST" },
  { id: "dept_sch", name: "Scheduling", code: "SCH", description: "Bookings, recurring sessions, class scheduling" },
  { id: "dept_its", name: "IT & Systems", code: "ITS", description: "Momence, check-in systems, network, hardware" },
  { id: "dept_hrv", name: "HR & People", code: "HRV", description: "Staffing, trainer performance, employee concerns" },
  { id: "dept_frt", name: "Front Desk", code: "FRT", description: "Reception, walk-in inquiries, guest passes" },
];

export type Employee = {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  title?: string;
  departmentCode: string;
  departmentName: string;
  location: string;
  reportingManager?: string;
  birthday?: string;
  studioCodes: string[];
  skills: string[];
  availability: "available" | "busy" | "offline" | "on_leave";
  workload: number;
  maxWorkload: number;
  escalationOrder: number;
};

export const EMPLOYEES: Employee[] = [
  // Management
  { id: "emp_mallika", employeeCode: "EMP-001", name: "Mallika Parekh", email: "mallika@physique57india.com", role: "Owner", title: "Owner", departmentCode: "MGT", departmentName: "Management", location: "India", reportingManager: "", birthday: "Dec 06", studioCodes: ["KH", "SHQ", "KHB", "PU"], skills: ["leadership", "strategy", "ownership"], availability: "available", workload: 0, maxWorkload: 5, escalationOrder: 0 },
  { id: "emp_mitali", employeeCode: "EMP-002", name: "Mitali Kumar", email: "mitali@physique57india.com", role: "Chief Operations Officer", title: "COO", departmentCode: "MGT", departmentName: "Management", location: "India", reportingManager: "Mallika Parekh", birthday: "Nov 17", studioCodes: ["KH", "SHQ", "KHB", "PU"], skills: ["operations", "leadership", "escalations"], availability: "available", workload: 2, maxWorkload: 10, escalationOrder: 1 },
  { id: "emp_jimmeey", employeeCode: "EMP-003", name: "Jimmeey Gondaa", email: "jimmeey@physique57india.com", role: "Head of Sales & Client Servicing", title: "Head of SCS", departmentCode: "SCS", departmentName: "Sales & Client Servicing", location: "India", reportingManager: "Mitali Kumar", birthday: "Mar 23", studioCodes: ["KH", "SHQ", "KHB", "PU"], skills: ["sales", "client-servicing", "leadership"], availability: "available", workload: 3, maxWorkload: 12, escalationOrder: 1 },
  { id: "emp_reyna", employeeCode: "EMP-004", name: "Reyna Jagtiani", email: "reyna@physique57india.com", role: "Marketing Head", title: "Marketing Head", departmentCode: "MKT", departmentName: "Marketing", location: "India", reportingManager: "Mitali Kumar", birthday: "", studioCodes: ["KH", "SHQ", "KHB", "PU"], skills: ["marketing", "branding", "strategy"], availability: "available", workload: 2, maxWorkload: 10, escalationOrder: 1 },
  { id: "emp_anisha", employeeCode: "EMP-005", name: "Anisha Shah", email: "anisha@physique57india.com", role: "Master Trainer", title: "Master Trainer", departmentCode: "TRN", departmentName: "Training", location: "India", reportingManager: "Mallika Parekh", birthday: "Dec 11", studioCodes: ["KH", "SHQ", "KHB", "PU"], skills: ["training", "instruction", "leadership"], availability: "available", workload: 3, maxWorkload: 12, escalationOrder: 1 },

  // Operations
  { id: "emp_saachi", employeeCode: "EMP-006", name: "Saachi Shetty", email: "saachi@physique57india.com", role: "Ops Manager", title: "Operations Manager", departmentCode: "OPS", departmentName: "Operations", location: "India", reportingManager: "Mitali Kumar", birthday: "Jan 18", studioCodes: ["KH", "SHQ", "KHB", "PU"], skills: ["operations", "facilities", "process"], availability: "available", workload: 5, maxWorkload: 16, escalationOrder: 2 },
  { id: "emp_zahur", employeeCode: "EMP-007", name: "Zahur Shaikh", email: "zahur@physique57mumbai.com", role: "Asst. Studio Operations Manager", title: "Asst. Ops Manager", departmentCode: "OPS", departmentName: "Operations", location: "Mumbai", reportingManager: "Saachi Shetty", birthday: "Oct 05", studioCodes: ["KH", "SHQ"], skills: ["operations", "facilities"], availability: "available", workload: 6, maxWorkload: 15, escalationOrder: 3 },
  { id: "emp_shifa", employeeCode: "EMP-008", name: "Shifa Ali", email: "shifa@physique57bengaluru.com", role: "Regional Head of Ops - South", title: "Regional Ops Head South", departmentCode: "OPS", departmentName: "Operations", location: "Bengaluru", reportingManager: "Mitali Kumar", birthday: "Sep 22", studioCodes: ["KHB"], skills: ["operations", "facilities", "regional"], availability: "available", workload: 4, maxWorkload: 14, escalationOrder: 2 },

  // Sales & Client Servicing - Mumbai Kemps
  { id: "emp_akshay", employeeCode: "EMP-009", name: "Akshay Rane", email: "akshay@physique57mumbai.com", role: "Team Leader - SCS", title: "Team Lead SCS Kemps", departmentCode: "SCS", departmentName: "Sales & Client Servicing", location: "Mumbai - Kemps", reportingManager: "Jimmeey Gondaa", birthday: "Aug 04", studioCodes: ["KH"], skills: ["sales", "client-servicing", "leadership"], availability: "available", workload: 5, maxWorkload: 15, escalationOrder: 2 },
  { id: "emp_vahishta", employeeCode: "EMP-010", name: "Vaishtha Fitter", email: "vahishta@physique57mumbai.com", role: "SCS Executive", title: "SCS Executive", departmentCode: "SCS", departmentName: "Sales & Client Servicing", location: "Mumbai - Kemps", reportingManager: "Akshay Rane", birthday: "Dec 25", studioCodes: ["KH"], skills: ["sales", "client-servicing"], availability: "available", workload: 3, maxWorkload: 12, escalationOrder: 3 },
  { id: "emp_sheetal", employeeCode: "EMP-011", name: "Sheetal Kataria", email: "sheetal@physique57mumbai.com", role: "SCS Executive", title: "SCS Executive", departmentCode: "SCS", departmentName: "Sales & Client Servicing", location: "Mumbai - Kemps", reportingManager: "Akshay Rane", birthday: "Mar 24", studioCodes: ["KH"], skills: ["sales", "client-servicing"], availability: "available", workload: 3, maxWorkload: 12, escalationOrder: 3 },
  { id: "emp_tahira", employeeCode: "EMP-012", name: "Tahira Sayyed", email: "tahira@physique57mumbai.com", role: "SCS Executive", title: "SCS Executive", departmentCode: "SCS", departmentName: "Sales & Client Servicing", location: "Mumbai - Kemps", reportingManager: "Akshay Rane", birthday: "Sep 26", studioCodes: ["KH"], skills: ["sales", "client-servicing"], availability: "available", workload: 2, maxWorkload: 12, escalationOrder: 3 },

  // Sales & Client Servicing - Mumbai Bandra
  { id: "emp_shipra", employeeCode: "EMP-013", name: "Shipra Bhika", email: "shipra@physique57mumbai.com", role: "Team Leader - SCS", title: "Team Lead SCS Bandra", departmentCode: "SCS", departmentName: "Sales & Client Servicing", location: "Mumbai - Bandra", reportingManager: "Jimmeey Gondaa", birthday: "Nov 30", studioCodes: ["SHQ"], skills: ["sales", "client-servicing", "leadership"], availability: "available", workload: 4, maxWorkload: 15, escalationOrder: 2 },
  { id: "emp_deesha", employeeCode: "EMP-014", name: "Deesha Changwani", email: "deesha@physique57mumbai.com", role: "SCS Executive", title: "SCS Executive", departmentCode: "SCS", departmentName: "Sales & Client Servicing", location: "Mumbai - Bandra", reportingManager: "Shipra Bhika", birthday: "Sep 06", studioCodes: ["SHQ"], skills: ["sales", "client-servicing"], availability: "available", workload: 3, maxWorkload: 12, escalationOrder: 3 },
  { id: "emp_nadiya", employeeCode: "EMP-015", name: "Nadiya Shaikh", email: "nadiya@physique57mumbai.com", role: "SCS Executive", title: "SCS Executive", departmentCode: "SCS", departmentName: "Sales & Client Servicing", location: "Mumbai - Bandra", reportingManager: "Shipra Bhika", birthday: "Sep 20", studioCodes: ["SHQ"], skills: ["sales", "client-servicing"], availability: "available", workload: 2, maxWorkload: 12, escalationOrder: 3 },
  { id: "emp_imran", employeeCode: "EMP-016", name: "Imran Shaikh", email: "imran@physique57mumbai.com", role: "Sr. CST", title: "Senior CST", departmentCode: "SCS", departmentName: "Sales & Client Servicing", location: "Mumbai - Bandra", reportingManager: "Shipra Bhika", birthday: "Sep 27", studioCodes: ["SHQ"], skills: ["sales", "client-servicing", "senior"], availability: "available", workload: 3, maxWorkload: 14, escalationOrder: 2 },

  // Sales & Client Servicing - Bengaluru
  { id: "emp_prathap", employeeCode: "EMP-017", name: "Prathap Kp", email: "prathap@physique57bengaluru.com", role: "SCS Executive", title: "SCS Executive", departmentCode: "SCS", departmentName: "Sales & Client Servicing", location: "Bengaluru", reportingManager: "Shifa Ali", birthday: "Dec 24", studioCodes: ["KHB"], skills: ["sales", "client-servicing"], availability: "available", workload: 3, maxWorkload: 12, escalationOrder: 3 },
  { id: "emp_yashas", employeeCode: "EMP-018", name: "Yashas K", email: "yashas@physique57bengaluru.com", role: "SCS Executive", title: "SCS Executive", departmentCode: "SCS", departmentName: "Sales & Client Servicing", location: "Bengaluru", reportingManager: "Shifa Ali", birthday: "Mar 06", studioCodes: ["KHB"], skills: ["sales", "client-servicing"], availability: "available", workload: 2, maxWorkload: 12, escalationOrder: 3 },
  { id: "emp_sashi", employeeCode: "EMP-019", name: "Sashi Singh", email: "sashi@physique57bengaluru.com", role: "SCS Executive", title: "SCS Executive", departmentCode: "SCS", departmentName: "Sales & Client Servicing", location: "Bengaluru", reportingManager: "Shifa Ali", birthday: "Mar 06", studioCodes: ["KHB"], skills: ["sales", "client-servicing"], availability: "available", workload: 2, maxWorkload: 12, escalationOrder: 3 },
  { id: "emp_wungsingla", employeeCode: "EMP-020", name: "Wungsingla Serou", email: "api@physique57bengaluru.com", role: "SCS Executive", title: "SCS Executive", departmentCode: "SCS", departmentName: "Sales & Client Servicing", location: "Bengaluru", reportingManager: "Shifa Ali", birthday: "May 03", studioCodes: ["KHB"], skills: ["sales", "client-servicing"], availability: "available", workload: 2, maxWorkload: 12, escalationOrder: 3 },

  // Training - Mumbai
  { id: "emp_vivaran", employeeCode: "EMP-021", name: "Vivaran Dhasmana", email: "vivaran@physique57mumbai.com", role: "Head Trainer", title: "Head Trainer Mumbai", departmentCode: "TRN", departmentName: "Training", location: "Mumbai", reportingManager: "Anisha Shah", birthday: "Jan 26", studioCodes: ["KH", "SHQ"], skills: ["training", "instruction", "leadership"], availability: "available", workload: 4, maxWorkload: 16, escalationOrder: 2 },
  { id: "emp_mrigakshi", employeeCode: "EMP-022", name: "Mrigakshi Jaiswal", email: "mrigakshi@physique57mumbai.com", role: "Head Trainer", title: "Head Trainer Mumbai", departmentCode: "TRN", departmentName: "Training", location: "Mumbai", reportingManager: "Anisha Shah", birthday: "Oct 19", studioCodes: ["KH", "SHQ"], skills: ["training", "instruction", "leadership"], availability: "available", workload: 4, maxWorkload: 16, escalationOrder: 2 },
  { id: "emp_karan", employeeCode: "EMP-023", name: "Karan Bhatia", email: "karan@physique57mumbai.com", role: "Trainer", title: "Trainer", departmentCode: "TRN", departmentName: "Training", location: "Mumbai", reportingManager: "Vivaran Dhasmana", birthday: "May 04", studioCodes: ["KH", "SHQ"], skills: ["training", "instruction"], availability: "available", workload: 3, maxWorkload: 14, escalationOrder: 3 },
  { id: "emp_cauveri", employeeCode: "EMP-024", name: "Cauveri Vikrant", email: "cauveri@physique57mumbai.com", role: "Trainer", title: "Trainer", departmentCode: "TRN", departmentName: "Training", location: "Mumbai", reportingManager: "Mrigakshi Jaiswal", birthday: "Aug 31", studioCodes: ["KH", "SHQ"], skills: ["training", "instruction"], availability: "available", workload: 3, maxWorkload: 14, escalationOrder: 3 },
  { id: "emp_pranjali", employeeCode: "EMP-025", name: "Pranjali Jain", email: "pranjali@physique57mumbai.com", role: "Trainer", title: "Trainer", departmentCode: "TRN", departmentName: "Training", location: "Mumbai", reportingManager: "Vivaran Dhasmana", birthday: "Sep 06", studioCodes: ["KH", "SHQ"], skills: ["training", "instruction"], availability: "available", workload: 3, maxWorkload: 14, escalationOrder: 3 },
  { id: "emp_atulan", employeeCode: "EMP-026", name: "Atulan Purohit", email: "atulan@physique57mumbai.com", role: "Trainer", title: "Trainer", departmentCode: "TRN", departmentName: "Training", location: "Mumbai", reportingManager: "Mrigakshi Jaiswal", birthday: "Oct 02", studioCodes: ["KH", "SHQ"], skills: ["training", "instruction"], availability: "available", workload: 3, maxWorkload: 14, escalationOrder: 3 },
  { id: "emp_richard", employeeCode: "EMP-027", name: "Richard D'souza", email: "richard@physique57mumbai.com", role: "Trainer", title: "Trainer", departmentCode: "TRN", departmentName: "Training", location: "Mumbai", reportingManager: "Vivaran Dhasmana", birthday: "Oct 06", studioCodes: ["KH", "SHQ"], skills: ["training", "instruction"], availability: "available", workload: 3, maxWorkload: 14, escalationOrder: 3 },
  { id: "emp_raunak", employeeCode: "EMP-028", name: "Raunak Nadkarni", email: "raunak@physique57mumbai.com", role: "Trainer", title: "Trainer", departmentCode: "TRN", departmentName: "Training", location: "Mumbai", reportingManager: "Mrigakshi Jaiswal", birthday: "Oct 11", studioCodes: ["KH", "SHQ"], skills: ["training", "instruction"], availability: "available", workload: 3, maxWorkload: 14, escalationOrder: 3 },
  { id: "emp_bret", employeeCode: "EMP-029", name: "Bret Saldhana", email: "bret@physique57mumbai.com", role: "Trainer", title: "Trainer", departmentCode: "TRN", departmentName: "Training", location: "Mumbai", reportingManager: "Vivaran Dhasmana", birthday: "Nov 19", studioCodes: ["KH", "SHQ"], skills: ["training", "instruction"], availability: "available", workload: 3, maxWorkload: 14, escalationOrder: 3 },
  { id: "emp_simonelle", employeeCode: "EMP-030", name: "Simonelle De Vitre", email: "simonelle@physique57mumbai.com", role: "Trainer", title: "Trainer", departmentCode: "TRN", departmentName: "Training", location: "Mumbai", reportingManager: "Mrigakshi Jaiswal", birthday: "Dec 08", studioCodes: ["KH", "SHQ"], skills: ["training", "instruction"], availability: "available", workload: 3, maxWorkload: 14, escalationOrder: 3 },
  { id: "emp_anmol", employeeCode: "EMP-031", name: "Anmol Sharma", email: "anmol@physique57mumbai.com", role: "Trainer", title: "Trainer", departmentCode: "TRN", departmentName: "Training", location: "Mumbai", reportingManager: "Vivaran Dhasmana", birthday: "", studioCodes: ["KH", "SHQ"], skills: ["training", "instruction"], availability: "available", workload: 3, maxWorkload: 14, escalationOrder: 3 },
  { id: "emp_rohan", employeeCode: "EMP-032", name: "Rohan Dahima", email: "rohan@physique57mumbai.com", role: "Trainer", title: "Trainer", departmentCode: "TRN", departmentName: "Training", location: "Mumbai", reportingManager: "Mrigakshi Jaiswal", birthday: "Dec 31", studioCodes: ["KH", "SHQ"], skills: ["training", "instruction"], availability: "available", workload: 3, maxWorkload: 14, escalationOrder: 3 },
  { id: "emp_reshma", employeeCode: "EMP-033", name: "Reshma Sharma", email: "reshma@physique57mumbai.com", role: "Trainer", title: "Trainer", departmentCode: "TRN", departmentName: "Training", location: "Mumbai", reportingManager: "Mrigakshi Jaiswal", birthday: "Nov 28", studioCodes: ["KH", "SHQ"], skills: ["training", "instruction"], availability: "available", workload: 3, maxWorkload: 14, escalationOrder: 3 },

  // Training - Bengaluru
  { id: "emp_pushyank", employeeCode: "EMP-034", name: "Pushyank Nahar", email: "pushyank@physique57bengaluru.com", role: "Head Trainer", title: "Head Trainer Bengaluru", departmentCode: "TRN", departmentName: "Training", location: "Bengaluru", reportingManager: "Anisha Shah", birthday: "Nov 29", studioCodes: ["KHB"], skills: ["training", "instruction", "leadership"], availability: "available", workload: 4, maxWorkload: 16, escalationOrder: 2 },
  { id: "emp_shruthi", employeeCode: "EMP-035", name: "Shruthi Kulkarni", email: "shruthi@physique57bengaluru.com", role: "Trainer", title: "Trainer", departmentCode: "TRN", departmentName: "Training", location: "Bengaluru", reportingManager: "Pushyank Nahar", birthday: "Apr 29", studioCodes: ["KHB"], skills: ["training", "instruction"], availability: "available", workload: 3, maxWorkload: 14, escalationOrder: 3 },
  { id: "emp_chaitanya", employeeCode: "EMP-036", name: "Chaitanya Nahar", email: "chaitanya@physique57bengaluru.com", role: "Trainer", title: "Trainer", departmentCode: "TRN", departmentName: "Training", location: "Bengaluru", reportingManager: "Pushyank Nahar", birthday: "Apr 04", studioCodes: ["KHB"], skills: ["training", "instruction"], availability: "available", workload: 3, maxWorkload: 14, escalationOrder: 3 },
  { id: "emp_kajol", employeeCode: "EMP-037", name: "Kajol Kanchan", email: "kajol@physique57bengaluru.com", role: "Trainer", title: "Trainer", departmentCode: "TRN", departmentName: "Training", location: "Bengaluru", reportingManager: "Pushyank Nahar", birthday: "May 12", studioCodes: ["KHB"], skills: ["training", "instruction"], availability: "available", workload: 3, maxWorkload: 14, escalationOrder: 3 },
  { id: "emp_siddhartha", employeeCode: "EMP-038", name: "Siddhartha Kasuma", email: "siddhartha@physique57bengaluru.com", role: "Trainer", title: "Trainer", departmentCode: "TRN", departmentName: "Training", location: "Bengaluru", reportingManager: "Pushyank Nahar", birthday: "Jul 30", studioCodes: ["KHB"], skills: ["training", "instruction"], availability: "available", workload: 3, maxWorkload: 14, escalationOrder: 3 },

  // Marketing
  { id: "emp_shaina", employeeCode: "EMP-039", name: "Shaina Saraiya", email: "shaina@physique57mumbai.com", role: "Marketing Lead", title: "Marketing Lead Mumbai", departmentCode: "MKT", departmentName: "Marketing", location: "Mumbai", reportingManager: "Reyna Jagtiani", birthday: "Jun 11", studioCodes: ["KH", "SHQ"], skills: ["marketing", "social", "campaigns"], availability: "available", workload: 3, maxWorkload: 14, escalationOrder: 2 },
  { id: "emp_saachi_jr", employeeCode: "EMP-040", name: "Saachi Shetty Jr", email: "saachi.s@physique57bengaluru.com", role: "Marketing Lead", title: "Marketing Lead Bengaluru", departmentCode: "MKT", departmentName: "Marketing", location: "Bengaluru", reportingManager: "Shifa Ali", birthday: "Dec 29", studioCodes: ["KHB"], skills: ["marketing", "social", "campaigns"], availability: "available", workload: 3, maxWorkload: 14, escalationOrder: 2 },
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

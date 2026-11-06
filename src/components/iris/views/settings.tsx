"use client";

import * as React from "react";
import { EMPLOYEES, DEPARTMENTS, STUDIOS, PRIORITY_CONFIG } from "@/lib/iris/types";
import { cn } from "@/lib/utils";
import {
  Settings as SettingsIcon,
  Users,
  Building2,
  MapPin,
  Clock,
  Shield,
  Brain,
  Bell,
  Plug,
  Mail,
  Database,
  GitBranch,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  Save,
  Zap,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getInitials, getAvatarColor } from "@/lib/iris/utils";

const SETTINGS_SECTIONS = [
  { id: "departments", label: "Departments", icon: Building2 },
  { id: "employees", label: "Employees", icon: Users },
  { id: "studios", label: "Studios", icon: MapPin },
  { id: "sla", label: "SLA Configuration", icon: Clock },
  { id: "routing", label: "Routing Rules", icon: GitBranch },
  { id: "ai", label: "AI Models", icon: Brain },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "permissions", label: "Permissions & Roles", icon: Shield },
  { id: "audit", label: "Audit Logs", icon: Database },
];

export function SettingsView() {
  const [activeSection, setActiveSection] = React.useState("departments");

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground mb-1">
          <SettingsIcon className="w-3 h-3 text-violet-500" />
          System Configuration
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage all aspects of the IRIS platform — departments, employees, SLA, AI models, integrations & more.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
        {/* Sidebar */}
        <div className="iris-card overflow-hidden h-fit sticky top-0">
          <div className="p-2 space-y-0.5">
            {SETTINGS_SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-[12px] font-medium transition-colors",
                  activeSection === s.id
                    ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                )}
              >
                <s.icon className="w-3.5 h-3.5" />
                {s.label}
                <ChevronRight className={cn("w-3 h-3 ml-auto", activeSection === s.id ? "opacity-100" : "opacity-0")} />
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div>
          {activeSection === "departments" && <DepartmentsSettings />}
          {activeSection === "employees" && <EmployeesSettings />}
          {activeSection === "studios" && <StudiosSettings />}
          {activeSection === "sla" && <SLASettings />}
          {activeSection === "routing" && <RoutingSettings />}
          {activeSection === "ai" && <AIModelSettings />}
          {activeSection === "notifications" && <NotificationsSettings />}
          {activeSection === "integrations" && <IntegrationsSettings />}
          {activeSection === "permissions" && <PermissionsSettings />}
          {activeSection === "audit" && <AuditLogsSettings />}
        </div>
      </div>
    </div>
  );
}

function SettingsCard({ title, description, children, action }: { title: string; description?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="iris-card overflow-hidden mb-4">
      <div className="px-4 py-3 border-b border-border flex items-center gap-3">
        <div className="flex-1">
          <div className="text-[13px] font-semibold">{title}</div>
          {description && <div className="text-[11px] text-muted-foreground mt-0.5">{description}</div>}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function DepartmentsSettings() {
  return (
    <>
      <SettingsCard
        title="Departments"
        description="Manage organizational departments and their responsibilities"
        action={<Button size="sm" className="h-7 text-[11px]"><Plus className="w-3 h-3 mr-1" />Add Department</Button>}
      >
        <div className="space-y-2">
          {DEPARTMENTS.map((d) => {
            const employeeCount = EMPLOYEES.filter((e) => e.departmentCode === d.code).length;
            return (
              <div key={d.code} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-violet-500/30 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500/10 to-indigo-500/10 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold">{d.name}</div>
                  <div className="text-[11px] text-muted-foreground">{d.description}</div>
                </div>
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-mono">{d.code}</Badge>
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{employeeCount} staff</Badge>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7"><Edit2 className="w-3 h-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:text-rose-600"><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      </SettingsCard>
    </>
  );
}

function EmployeesSettings() {
  return (
    <SettingsCard
      title="Employees"
      description="Manage employee records, roles, and department assignments"
      action={<Button size="sm" className="h-7 text-[11px]"><Plus className="w-3 h-3 mr-1" />Add Employee</Button>}
    >
      <div className="overflow-x-auto iris-scrollbar">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Employee</th>
              <th className="text-left py-2 px-2 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Code</th>
              <th className="text-left py-2 px-2 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Role</th>
              <th className="text-left py-2 px-2 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Studios</th>
              <th className="text-right py-2 px-2 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Workload</th>
              <th className="text-left py-2 px-2 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {EMPLOYEES.map((e) => {
              const dept = DEPARTMENTS.find((d) => d.code === e.departmentCode);
              return (
                <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-7 h-7">
                        <AvatarFallback className={cn("text-white text-[10px] font-semibold", getAvatarColor(e.name))}>
                          {getInitials(e.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-[12px] font-medium">{e.name}</div>
                        <div className="text-[10px] text-muted-foreground">{e.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-2 font-mono text-[10px] text-muted-foreground">{e.employeeCode}</td>
                  <td className="py-2 px-2">
                    <div className="text-[12px]">{e.role}</div>
                    <div className="text-[10px] text-muted-foreground">{dept?.name}</div>
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex flex-wrap gap-0.5">
                      {e.studioCodes.slice(0, 2).map((s) => (
                        <span key={s} className="px-1 py-0.5 text-[9px] rounded bg-muted text-muted-foreground">{s}</span>
                      ))}
                      {e.studioCodes.length > 2 && (
                        <span className="px-1 py-0.5 text-[9px] rounded bg-muted text-muted-foreground">+{e.studioCodes.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-2 text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <div className="w-12 h-1 rounded-full bg-muted overflow-hidden">
                        <div className={cn("h-full rounded-full", e.workload / e.maxWorkload > 0.8 ? "bg-rose-500" : e.workload / e.maxWorkload > 0.5 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${(e.workload / e.maxWorkload) * 100}%` }} />
                      </div>
                      <span className="text-[10px] font-semibold tabular-nums">{e.workload}/{e.maxWorkload}</span>
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                      e.availability === "available" ? "bg-emerald-500/10 text-emerald-600" :
                      e.availability === "busy" ? "bg-amber-500/10 text-amber-600" :
                      e.availability === "offline" ? "bg-muted text-muted-foreground" :
                      "bg-rose-500/10 text-rose-600"
                    )}>
                      {e.availability.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SettingsCard>
  );
}

function StudiosSettings() {
  return (
    <SettingsCard title="Studios" description="Manage Physique 57 India studio locations" action={<Button size="sm" className="h-7 text-[11px]"><Plus className="w-3 h-3 mr-1" />Add Studio</Button>}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {STUDIOS.map((s) => (
          <div key={s.id} className="p-3 rounded-lg border border-border">
            <div className="flex items-start gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500/10 to-indigo-500/10 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-semibold">{s.name}</div>
                <div className="text-[11px] text-muted-foreground">{s.address}</div>
              </div>
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-mono">{s.code}</Badge>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{s.city}</Badge>
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>
            </div>
          </div>
        ))}
      </div>
    </SettingsCard>
  );
}

function SLASettings() {
  return (
    <>
      <SettingsCard title="SLA Configuration" description="Configure response and resolution targets for each priority level">
        <div className="space-y-3">
          {(["P0", "P1", "P2", "P3"] as const).map((p) => {
            const config = PRIORITY_CONFIG[p];
            return (
              <div key={p} className={cn("p-3 rounded-lg border", config.bg, config.ring, "ring-1")}>
                <div className="flex items-center gap-3 mb-3">
                  <span className={cn("text-[14px] font-bold", config.text)}>{p}</span>
                  <div className="flex-1">
                    <div className="text-[12px] font-semibold">{config.label}</div>
                    <div className="text-[11px] text-muted-foreground">{config.description}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <SLAField label="First Response (mins)" defaultValue={config.responseMins} />
                  <SLAField label="Resolution (mins)" defaultValue={config.resolutionMins} />
                  <SLAField label="Escalation Threshold (mins)" defaultValue={Math.floor(config.responseMins * 1.5)} />
                </div>
              </div>
            );
          })}
        </div>
      </SettingsCard>

      <SettingsCard title="Business Hours" description="Configure business hours and holidays for SLA calculations">
        <div className="grid grid-cols-7 gap-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="p-2 rounded-md border border-border">
              <div className="text-[11px] font-medium mb-1">{day}</div>
              <Input defaultValue={day === "Sun" ? "Closed" : "09:00 - 21:00"} className="h-7 text-[10px]" />
            </div>
          ))}
        </div>
      </SettingsCard>
    </>
  );
}

function SLAField({ label, defaultValue }: { label: string; defaultValue: number }) {
  return (
    <div>
      <div className="text-[10px] font-medium text-muted-foreground mb-1">{label}</div>
      <Input type="number" defaultValue={defaultValue} className="h-7 text-[12px]" />
    </div>
  );
}

function RoutingSettings() {
  return (
    <SettingsCard title="Routing Rules" description="Configure automatic ticket routing without modifying code" action={<Button size="sm" className="h-7 text-[11px]"><Plus className="w-3 h-3 mr-1" />Add Rule</Button>}>
      <div className="space-y-2">
        {[
          { name: "HVAC issues → Facilities Lead", condition: "category=Facilities AND subcategory=HVAC", dept: "FAC", priority: "High", active: true },
          { name: "Momence payment → Finance", condition: "category=Payment AND source=Momence", dept: "PAY", priority: "Medium", active: true },
          { name: "VIP client → Director escalation", condition: "client.tier=VIP AND priority>=P1", dept: "MGT", priority: "Critical", active: true },
          { name: "Bengaluru → Bengaluru team", condition: "studio.city=Bengaluru", dept: "Any", priority: "Auto", active: true },
          { name: "Trainer complaints → HR", condition: "category=HR AND subcategory=Performance", dept: "HRV", priority: "Medium", active: false },
        ].map((r, i) => (
          <div key={i} className="flex items-center gap-3 p-2.5 rounded-md border border-border">
            <Switch checked={r.active} />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium">{r.name}</div>
              <div className="text-[10px] text-muted-foreground font-mono truncate">{r.condition}</div>
            </div>
            <Badge variant="outline" className="text-[10px] h-5 px-1.5">{r.dept}</Badge>
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{r.priority}</Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7"><Edit2 className="w-3 h-3" /></Button>
          </div>
        ))}
      </div>
    </SettingsCard>
  );
}

function AIModelSettings() {
  return (
    <>
      <SettingsCard title="AI Model Configuration" description="Configure OpenAI and Anthropic Claude models with intelligent routing">
        <div className="space-y-3">
          {[
            { provider: "OpenAI", model: "GPT-4o", purpose: "Primary Conversational", temp: "0.7", maxTokens: "4096", primary: true, active: true },
            { provider: "OpenAI", model: "GPT-4o-mini", purpose: "Classification & Extraction", temp: "0.3", maxTokens: "2048", primary: false, active: true },
            { provider: "Anthropic", model: "Claude Sonnet 4", purpose: "Investigation & Reasoning", temp: "0.5", maxTokens: "4096", primary: false, active: true },
            { provider: "Anthropic", model: "Claude Haiku", purpose: "Summarization", temp: "0.4", maxTokens: "2048", primary: false, active: true },
            { provider: "OpenAI", model: "GPT-4o", purpose: "Fallback (auto)", temp: "0.7", maxTokens: "4096", primary: false, active: true },
          ].map((m, i) => (
            <div key={i} className={cn("p-3 rounded-lg border", m.primary ? "border-violet-500/30 bg-violet-500/5" : "border-border")}>
              <div className="flex items-center gap-3 mb-2">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-white",
                  m.provider === "OpenAI" ? "bg-emerald-500" : "bg-orange-500"
                )}>
                  <Brain className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-[12px] font-semibold flex items-center gap-2">
                    {m.provider} · {m.model}
                    {m.primary && <Badge variant="outline" className="text-[9px] h-4 px-1 bg-violet-500/10 text-violet-600 border-violet-500/20">PRIMARY</Badge>}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{m.purpose}</div>
                </div>
                <Switch checked={m.active} />
              </div>
              <div className="grid grid-cols-3 gap-2 ml-11">
                <div>
                  <div className="text-[10px] text-muted-foreground">Temperature</div>
                  <Input defaultValue={m.temp} className="h-7 text-[11px]" />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">Max Tokens</div>
                  <Input defaultValue={m.maxTokens} className="h-7 text-[11px]" />
                </div>
                <div className="flex items-end">
                  <Button variant="outline" size="sm" className="h-7 text-[11px]">Edit</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard title="Model Routing Strategy" description="How IRIS selects models for different tasks">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-md bg-muted/30 border border-border">
            <div className="text-[11px] font-semibold mb-2 flex items-center gap-1.5"><Zap className="w-3 h-3 text-amber-500" />Simple Tasks</div>
            <div className="text-[11px] text-muted-foreground">Use economical models (GPT-4o-mini, Haiku) for:</div>
            <ul className="text-[11px] mt-1 space-y-0.5">
              <li>• Issue classification</li>
              <li>• Field extraction</li>
              <li>• Routine responses</li>
              <li>• Tag suggestions</li>
            </ul>
          </div>
          <div className="p-3 rounded-md bg-muted/30 border border-border">
            <div className="text-[11px] font-semibold mb-2 flex items-center gap-1.5"><Brain className="w-3 h-3 text-violet-500" />Complex Tasks</div>
            <div className="text-[11px] text-muted-foreground">Use capable models (GPT-4o, Sonnet) for:</div>
            <ul className="text-[11px] mt-1 space-y-0.5">
              <li>• Multi-step investigations</li>
              <li>• Ambiguous case reasoning</li>
              <li>• Ticket generation</li>
              <li>• Resolution recommendations</li>
            </ul>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard title="Spending Controls" description="Set token usage limits and alerts">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="text-[10px] font-medium text-muted-foreground mb-1">Daily Token Limit</div>
            <Input defaultValue="50000" className="h-8 text-[12px]" />
          </div>
          <div>
            <div className="text-[10px] font-medium text-muted-foreground mb-1">Monthly Budget (USD)</div>
            <Input defaultValue="500" className="h-8 text-[12px]" />
          </div>
          <div>
            <div className="text-[10px] font-medium text-muted-foreground mb-1">Alert Threshold (%)</div>
            <Input defaultValue="80" className="h-8 text-[12px]" />
          </div>
        </div>
      </SettingsCard>
    </>
  );
}

function NotificationsSettings() {
  return (
    <SettingsCard title="Notification Preferences" description="Configure in-app, email, WhatsApp notifications">
      <div className="space-y-2">
        {[
          { event: "Ticket assigned", inApp: true, email: true, whatsapp: false },
          { event: "Ticket escalated", inApp: true, email: true, whatsapp: true },
          { event: "SLA approaching", inApp: true, email: true, whatsapp: false },
          { event: "SLA breached", inApp: true, email: true, whatsapp: true },
          { event: "Ticket resolved", inApp: true, email: false, whatsapp: false },
          { event: "Ticket reopened", inApp: true, email: true, whatsapp: false },
          { event: "New comment", inApp: true, email: false, whatsapp: false },
        ].map((n, i) => (
          <div key={i} className="flex items-center gap-3 p-2.5 rounded-md border border-border">
            <div className="flex-1 text-[12px] font-medium">{n.event}</div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-[11px]">
                <Switch checked={n.inApp} /> In-App
              </label>
              <label className="flex items-center gap-1.5 text-[11px]">
                <Switch checked={n.email} /> Email
              </label>
              <label className="flex items-center gap-1.5 text-[11px]">
                <Switch checked={n.whatsapp} /> WhatsApp
              </label>
            </div>
          </div>
        ))}
      </div>
    </SettingsCard>
  );
}

function IntegrationsSettings() {
  return (
    <SettingsCard title="Integrations" description="Manage external service integrations">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          { name: "Momence API", desc: "Member, booking, payment data", status: "connected", icon: Plug },
          { name: "OpenAI", desc: "GPT-4o and GPT-4o-mini models", status: "connected", icon: Brain },
          { name: "Anthropic", desc: "Claude Sonnet and Haiku models", status: "connected", icon: Brain },
          { name: "Email (SMTP)", desc: "Notification delivery via SMTP", status: "connected", icon: Mail },
          { name: "WhatsApp Business", desc: "WhatsApp notifications", status: "pending", icon: Bell },
          { name: "Slack", desc: "Internal team notifications", status: "disconnected", icon: Bell },
        ].map((int, i) => (
          <div key={i} className="p-3 rounded-lg border border-border">
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center",
                int.status === "connected" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                int.status === "pending" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                "bg-muted text-muted-foreground"
              )}>
                <int.icon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-semibold">{int.name}</div>
                <div className="text-[11px] text-muted-foreground">{int.desc}</div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className={cn(
                    "text-[10px] h-5 px-1.5 capitalize",
                    int.status === "connected" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                    int.status === "pending" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {int.status}
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2">Configure</Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SettingsCard>
  );
}

function PermissionsSettings() {
  return (
    <SettingsCard title="Permissions & Roles" description="Role-based access control configuration">
      <div className="space-y-2">
        {[
          { role: "Studio Director", permissions: ["all"], users: 1, color: "violet" },
          { role: "Operations Manager", permissions: ["tickets.all", "reports.all", "settings.limited"], users: 1, color: "indigo" },
          { role: "Department Manager", permissions: ["tickets.department", "reports.department"], users: 6, color: "sky" },
          { role: "Front Desk Lead", permissions: ["tickets.create", "tickets.view", "memberships.read"], users: 2, color: "emerald" },
          { role: "Front Desk Associate", permissions: ["tickets.create", "tickets.view.own"], users: 2, color: "amber" },
          { role: "IT Administrator", permissions: ["all", "settings.system"], users: 1, color: "rose" },
        ].map((r, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
            <div className={cn("w-2 h-10 rounded-full", `bg-${r.color}-500`)} />
            <div className="flex-1">
              <div className="text-[13px] font-semibold">{r.role}</div>
              <div className="text-[11px] text-muted-foreground">{r.users} user{r.users > 1 ? "s" : ""}</div>
            </div>
            <div className="flex flex-wrap gap-1 max-w-md justify-end">
              {r.permissions.slice(0, 3).map((p) => (
                <span key={p} className="px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground font-mono">{p}</span>
              ))}
              {r.permissions.length > 3 && (
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground">+{r.permissions.length - 3}</span>
              )}
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7"><Edit2 className="w-3 h-3" /></Button>
          </div>
        ))}
      </div>
    </SettingsCard>
  );
}

function AuditLogsSettings() {
  const logs = [
    { action: "TICKET_CREATED", actor: "Aarav Mehta", resource: "IRIS-2026-0142", timestamp: "5m ago", ip: "103.21.45.12" },
    { action: "MOMENCE_MEMBER_LOOKUP", actor: "IRIS AI", resource: "MM-89342", timestamp: "8m ago", ip: "system" },
    { action: "TICKET_ASSIGNED", actor: "Routing Agent", resource: "IRIS-2026-0141", timestamp: "15m ago", ip: "system" },
    { action: "SETTINGS_UPDATED", actor: "Sanaya Wadia", resource: "SLA Config", timestamp: "1h ago", ip: "103.21.45.12" },
    { action: "REFUND_AUTHORIZED", actor: "Meera Krishnan", resource: "MM-89334", timestamp: "2h ago", ip: "103.21.45.15" },
    { action: "MEMBERSHIP_FROZEN", actor: "Ishita Nair", resource: "MM-85112", timestamp: "3h ago", ip: "103.21.45.13" },
  ];
  return (
    <SettingsCard title="Audit Logs" description="Complete record of consequential actions" action={<Button variant="outline" size="sm" className="h-7 text-[11px]">Export Logs</Button>}>
      <div className="overflow-x-auto iris-scrollbar">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Action</th>
              <th className="text-left py-2 px-2 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Actor</th>
              <th className="text-left py-2 px-2 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Resource</th>
              <th className="text-left py-2 px-2 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">IP</th>
              <th className="text-right py-2 px-2 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.map((log, i) => (
              <tr key={i} className="hover:bg-muted/30 transition-colors">
                <td className="py-2 px-2">
                  <span className="font-mono text-[11px] font-medium">{log.action}</span>
                </td>
                <td className="py-2 px-2 text-[12px]">{log.actor}</td>
                <td className="py-2 px-2 font-mono text-[11px] text-muted-foreground">{log.resource}</td>
                <td className="py-2 px-2 font-mono text-[10px] text-muted-foreground">{log.ip}</td>
                <td className="py-2 px-2 text-right text-[11px] text-muted-foreground">{log.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SettingsCard>
  );
}

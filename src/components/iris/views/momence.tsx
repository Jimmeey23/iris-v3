"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Plug,
  Search,
  Users,
  Calendar,
  CreditCard,
  Tag,
  Shield,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Eye,
  EyeOff,
  Zap,
  ArrowRight,
  Database,
  Activity,
  RefreshCw,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { getInitials, getAvatarColor, formatRelativeTime } from "@/lib/iris/utils";

// Mock member data
const MEMBERS = [
  { id: "MM-89342", name: "Priya Agarwal", email: "priya.agarwal@gmail.com", phone: "+91 98765 43210", studio: "Kwality House", membership: "Annual Premium", status: "active", credits: 12, joinedDate: "2024-03-15", lastVisit: "2026-11-04", city: "Mumbai", tags: ["VIP", "Annual Member"], customFields: { birthday: "Mar 15", preferredClass: "Barre", referralSource: "Friend" } },
  { id: "MM-88214", name: "Rhea Malhotra", email: "rhea.m@gmail.com", phone: "+91 99876 54321", studio: "Kwality House", membership: "12-Class Package", status: "active", credits: 4, joinedDate: "2024-06-22", lastVisit: "2026-11-05", city: "Mumbai", tags: ["Package"], customFields: { birthday: "Jun 22", preferredClass: "Cardio", referralSource: "Instagram" } },
  { id: "MM-91234", name: "Karan Singh", email: "karan.singh@gmail.com", phone: "+91 80 12345 678", studio: "Kenkere House", membership: "5-Class Package", status: "active", credits: 5, joinedDate: "2025-01-10", lastVisit: "2026-11-06", city: "Bengaluru", tags: ["Package", "Bengaluru"], customFields: { birthday: "Jan 10", preferredClass: "Barre", referralSource: "Walk-in" } },
  { id: "MM-85112", name: "Aditi Kapoor", email: "aditi.kapoor@gmail.com", phone: "+91 90123 45678", studio: "Kwality House", membership: "Unlimited Monthly", status: "frozen", credits: 0, joinedDate: "2024-02-08", lastVisit: "2026-10-25", city: "Mumbai", tags: ["Unlimited", "Frozen"], customFields: { birthday: "Feb 08", preferredClass: "Sculpt", referralSource: "Friend" } },
  { id: "MM-89333", name: "Meera Reddy", email: "meera.reddy@gmail.com", phone: "+91 80 99887 766", studio: "Kenkere House", membership: "Annual Premium", status: "active", credits: 18, joinedDate: "2024-08-30", lastVisit: "2026-11-06", city: "Bengaluru", tags: ["VIP", "Annual"], customFields: { birthday: "Aug 30", preferredClass: "Barre", referralSource: "Google" } },
];

// Mock sessions
const SESSIONS = [
  { id: "S-4451", name: "Barre Class — Beginner", studio: "Kwality House", instructor: "Tara Kapoor", date: "2026-11-06", time: "07:00", duration: 60, capacity: 20, booked: 18, waitlist: 0, status: "scheduled" },
  { id: "S-4452", name: "Cardio Barre — Intermediate", studio: "Kwality House", instructor: "Tara Kapoor", date: "2026-11-06", time: "09:00", duration: 60, capacity: 20, booked: 20, waitlist: 3, status: "full" },
  { id: "S-4453", name: "Sculpt & Tone", studio: "Supreme HQ", instructor: "Maya Sharma", date: "2026-11-06", time: "10:30", duration: 45, capacity: 15, booked: 12, waitlist: 0, status: "scheduled" },
  { id: "S-4454", name: "Advanced Barre", studio: "Kenkere House", instructor: "Reyaan Malhotra", date: "2026-11-06", time: "18:00", duration: 60, capacity: 18, booked: 14, waitlist: 0, status: "scheduled" },
];

export function MomenceView() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = React.useState("members");
  const [search, setSearch] = React.useState("");
  const [selectedMember, setSelectedMember] = React.useState<typeof MEMBERS[0] | null>(null);
  const [selectedSession, setSelectedSession] = React.useState<typeof SESSIONS[0] | null>(null);
  const [apiHealth, setApiHealth] = React.useState({ mumbai: true, bengaluru: true });

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground mb-1">
            <Plug className="w-3 h-3 text-violet-500" />
            Momence API Integration
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Momence Integration</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Deep integration with member data, sessions, bookings, payments, and custom fields.
          </p>
        </div>
        <Button variant="outline" className="h-8 text-[12px]">
          <RefreshCw className="w-3 h-3 mr-1.5" />
          Sync Now
        </Button>
      </div>

      {/* Integration Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <IntegrationCard
          title="Mumbai Host"
          hostId="kh_mum_001"
          status={apiHealth.mumbai}
          region="Mumbai"
          lastSync="2m ago"
        />
        <IntegrationCard
          title="Bengaluru Host"
          hostId="kh_ben_002"
          status={apiHealth.bengaluru}
          region="Bengaluru"
          lastSync="3m ago"
        />
        <div className="iris-card p-3">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">API Usage Today</div>
          <div className="space-y-1.5">
            <UsageRow label="Member Lookups" value={47} max={500} />
            <UsageRow label="Session Queries" value={23} max={300} />
            <UsageRow label="Webhooks Received" value={8} max={100} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/40 h-9">
          <TabsTrigger value="members" className="text-[12px] data-[state=active]:bg-background">
            <Users className="w-3 h-3 mr-1.5" />
            Members
          </TabsTrigger>
          <TabsTrigger value="sessions" className="text-[12px] data-[state=active]:bg-background">
            <Calendar className="w-3 h-3 mr-1.5" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="custom_fields" className="text-[12px] data-[state=active]:bg-background">
            <Tag className="w-3 h-3 mr-1.5" />
            Custom Fields
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="text-[12px] data-[state=active]:bg-background">
            <Zap className="w-3 h-3 mr-1.5" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="permissions" className="text-[12px] data-[state=active]:bg-background">
            <Shield className="w-3 h-3 mr-1.5" />
            Permissions
          </TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="mt-3">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search by name, email, phone, Momence ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 text-[12px]"
                />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="h-8 w-[140px] text-[12px]">
                  <SelectValue placeholder="Studio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Studios</SelectItem>
                  <SelectItem value="KH">Kwality House</SelectItem>
                  <SelectItem value="SHQ">Supreme HQ</SelectItem>
                  <SelectItem value="KHB">Kenkere House</SelectItem>
                  <SelectItem value="PU">Pop Up</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="all">
                <SelectTrigger className="h-8 w-[140px] text-[12px]">
                  <SelectValue placeholder="Membership" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Memberships</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="frozen">Frozen</SelectItem>
                  <SelectItem value="vip">VIP Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="iris-card overflow-hidden">
              <div className="overflow-x-auto iris-scrollbar">
                <table className="w-full text-[12px]">
                  <thead className="bg-muted/40 border-b border-border">
                    <tr>
                      <th className="text-left px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Member</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Momence ID</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Studio</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Membership</th>
                      <th className="text-right px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Credits</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Status</th>
                      <th className="text-right px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Last Visit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {MEMBERS.filter((m) => {
                      if (!search) return true;
                      const q = search.toLowerCase();
                      return m.name.toLowerCase().includes(q) ||
                        m.email.toLowerCase().includes(q) ||
                        m.phone.includes(q) ||
                        m.id.toLowerCase().includes(q);
                    }).map((m) => (
                      <tr
                        key={m.id}
                        onClick={() => setSelectedMember(m)}
                        className="hover:bg-violet-500/5 cursor-pointer transition-colors group"
                      >
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-7 h-7">
                              <AvatarFallback className={cn("text-white text-[10px] font-semibold", getAvatarColor(m.name))}>
                                {getInitials(m.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-[13px] font-medium group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{m.name}</div>
                              <div className="text-[10px] text-muted-foreground">{m.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 font-mono text-[11px] text-muted-foreground">{m.id}</td>
                        <td className="px-3 py-3">{m.studio}</td>
                        <td className="px-3 py-3">{m.membership}</td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums">{m.credits}</td>
                        <td className="px-3 py-3">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                            m.status === "active" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          )}>
                            <span className={cn("w-1 h-1 rounded-full", m.status === "active" ? "bg-emerald-500" : "bg-amber-500")} />
                            {m.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-[11px] text-muted-foreground">{formatRelativeTime(m.lastVisit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="mt-3">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input placeholder="Search sessions by name, instructor..." className="h-8 pl-8 text-[12px]" />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="h-8 w-[140px] text-[12px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sessions</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {SESSIONS.map((s) => {
                const capacityPct = (s.booked / s.capacity) * 100;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSession(s)}
                    className="text-left iris-card p-3 hover:scale-[1.01] transition-transform group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-mono text-muted-foreground">{s.id}</span>
                      <span className={cn(
                        "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                        s.status === "full" ? "bg-rose-500/10 text-rose-600" :
                        s.status === "scheduled" ? "bg-emerald-500/10 text-emerald-600" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {s.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[13px] font-semibold leading-tight mb-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                      {s.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground mb-2">
                      {s.studio} · {s.instructor}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] mb-2">
                      <span className="font-medium">{s.time}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">{s.duration}min</span>
                      <span className="text-muted-foreground ml-auto">{s.date}</span>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-muted-foreground">Capacity</span>
                        <span className="font-semibold tabular-nums">{s.booked}/{s.capacity}{s.waitlist > 0 && ` (+${s.waitlist} waitlist)`}</span>
                      </div>
                      <div className="h-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            capacityPct >= 100 ? "bg-rose-500" : capacityPct >= 80 ? "bg-amber-500" : "bg-emerald-500"
                          )}
                          style={{ width: `${Math.min(100, capacityPct)}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Custom Fields Tab */}
        <TabsContent value="custom_fields" className="mt-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="iris-card p-4">
              <div className="text-[13px] font-semibold mb-3">Standard Custom Fields</div>
              <div className="space-y-2">
                {[
                  { name: "Birthday", type: "date", synced: true },
                  { name: "Preferred Class", type: "select", synced: true, options: ["Barre", "Cardio", "Sculpt", "Stretch"] },
                  { name: "Referral Source", type: "select", synced: true, options: ["Friend", "Instagram", "Google", "Walk-in"] },
                  { name: "Health Notes", type: "textarea", synced: true },
                  { name: "Emergency Contact", type: "text", synced: true },
                  { name: "Dietary Restrictions", type: "multiselect", synced: false },
                ].map((f) => (
                  <div key={f.name} className="flex items-center gap-2 p-2 rounded-md border border-border">
                    <div className={cn("w-7 h-7 rounded-md flex items-center justify-center", f.synced ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600")}>
                      {f.synced ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-[12px] font-medium">{f.name}</div>
                      <div className="text-[10px] text-muted-foreground">{f.type}</div>
                    </div>
                    {f.options && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1">{f.options.length} options</Badge>
                    )}
                    <span className="text-[10px] font-semibold">{f.synced ? "Synced" : "Pending"}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="iris-card p-4">
              <div className="text-[13px] font-semibold mb-3">Conditional Field Rules</div>
              <div className="space-y-2">
                {[
                  { rule: "If Membership = Annual Premium → Show VIP perks field", active: true },
                  { rule: "If Status = Frozen → Show unfreeze date picker", active: true },
                  { rule: "If Studio = Bengaluru → Show regional preferences", active: true },
                  { rule: "If Credits < 3 → Show upsell package options", active: false },
                  { rule: "If Last Visit > 30 days → Show re-engagement options", active: true },
                ].map((r, i) => (
                  <div key={i} className="p-2.5 rounded-md border border-border bg-muted/20">
                    <div className="flex items-center gap-2">
                      <Switch checked={r.active} />
                      <div className="flex-1 text-[12px] font-mono leading-relaxed">{r.rule}</div>
                    </div>
                  </div>
                ))}
                <button className="w-full p-2.5 rounded-md border border-dashed border-border text-[12px] text-muted-foreground hover:border-violet-500/40 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                  + Add Conditional Rule
                </button>
              </div>
            </div>

            <div className="iris-card p-4 lg:col-span-2">
              <div className="text-[13px] font-semibold mb-3">Prefilled Option Sets</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <PrefilledSet title="Studios" options={["Kwality House", "Supreme HQ", "Kenkere House", "Pop Up"]} />
                <PrefilledSet title="Membership Types" options={["Annual Premium", "Unlimited Monthly", "12-Class Package", "5-Class Package", "Drop-in"]} />
                <PrefilledSet title="Instructors" options={["Tara Kapoor", "Reyaan Malhotra", "Maya Sharma", "Other"]} />
                <PrefilledSet title="Issue Categories" options={["Membership", "Payment", "Booking", "Facilities", "IT", "Training"]} />
                <PrefilledSet title="Severity Levels" options={["Critical", "High", "Medium", "Low", "Not sure"]} />
                <PrefilledSet title="Refund Reasons" options={["Duplicate charge", "Service not delivered", "Cancellation", "Billing error", "Client request"]} />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="mt-3">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="iris-card p-4 lg:col-span-2">
              <div className="text-[13px] font-semibold mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-violet-500" />
                Recent Webhook Events
              </div>
              <div className="space-y-2">
                {[
                  { event: "member.created", timestamp: "5m ago", status: "processed", member: "New member: Anaya Iyer" },
                  { event: "booking.cancelled", timestamp: "12m ago", status: "processed", member: "Aditi Kapoor cancelled 7 AM class" },
                  { event: "payment.failed", timestamp: "23m ago", status: "processed", member: "Payment failed for Rohan Patel" },
                  { event: "membership.frozen", timestamp: "1h ago", status: "processed", member: "Meera Reddy membership frozen" },
                  { event: "session.updated", timestamp: "2h ago", status: "processed", member: "9 AM class instructor changed to Tara" },
                  { event: "member.updated", timestamp: "3h ago", status: "processed", member: "Priya Agarwal phone updated" },
                ].map((w, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-md border border-border">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium font-mono">{w.event}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{w.member}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      {w.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{w.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="iris-card p-4">
              <div className="text-[13px] font-semibold mb-3">Webhook Configuration</div>
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] font-medium text-muted-foreground mb-1">Endpoint URL</div>
                  <div className="p-2 rounded-md bg-muted/30 font-mono text-[10px] break-all">
                    https://iris.physique57.in/api/momence/webhook
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-medium text-muted-foreground mb-1">Subscribed Events</div>
                  <div className="space-y-1">
                    {["member.created", "member.updated", "membership.frozen", "membership.unfrozen", "booking.created", "booking.cancelled", "payment.failed", "session.updated"].map((e) => (
                      <div key={e} className="flex items-center gap-2 text-[11px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span className="font-mono">{e}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-2 border-t border-border">
                  <div className="text-[10px] font-medium text-muted-foreground mb-1">Signature Verification</div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <Shield className="w-3 h-3 text-emerald-500" />
                    <span>HMAC-SHA256 enabled</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="mt-3">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <PermissionCard
              title="Read-Only Actions"
              description="Can be performed automatically by IRIS AI"
              color="emerald"
              actions={[
                "Search members",
                "Retrieve member profiles",
                "Retrieve membership information",
                "Retrieve member notes",
                "Retrieve member visits",
                "Retrieve sessions",
                "Retrieve session bookings",
                "Retrieve payment transactions",
                "Retrieve sales",
              ]}
              auto={true}
            />
            <PermissionCard
              title="Reversible Changes"
              description="Require configurable approval rules"
              color="amber"
              actions={[
                "Add clients to waitlists",
                "Remove check-ins",
                "Add member notes",
                "Update member contact info",
              ]}
              auto={false}
            />
            <PermissionCard
              title="Consequential Actions"
              description="Require explicit human authorization"
              color="rose"
              actions={[
                "Freeze / unfreeze memberships",
                "Update class credits",
                "Cancel bookings",
                "Cancel recurring bookings",
                "Process refunds",
                "Sign documents",
              ]}
              auto={false}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Member Detail Dialog */}
      {selectedMember && (
        <MemberDetailDialog member={selectedMember} onClose={() => setSelectedMember(null)} />
      )}

      {/* Session Detail Dialog */}
      {selectedSession && (
        <SessionDetailDialog session={selectedSession} onClose={() => setSelectedSession(null)} />
      )}
    </div>
  );
}

function IntegrationCard({ title, hostId, status, region, lastSync }: { title: string; hostId: string; status: boolean; region: string; lastSync: string }) {
  return (
    <div className="iris-card p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[12px] font-semibold">{title}</div>
        <span className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
          status ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
        )}>
          <span className={cn("w-1 h-1 rounded-full", status ? "bg-emerald-500" : "bg-rose-500")} />
          {status ? "Connected" : "Disconnected"}
        </span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Host ID</span>
          <span className="font-mono">{hostId}</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Region</span>
          <span className="font-medium">{region}</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Last Sync</span>
          <span className="text-emerald-600 dark:text-emerald-400">{lastSync}</span>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
        <div className="text-[10px] text-muted-foreground">OAuth 2.0</div>
        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2">Configure</Button>
      </div>
    </div>
  );
}

function UsageRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = (value / max) * 100;
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] mb-0.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{value}/{max}</span>
      </div>
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function PrefilledSet({ title, options }: { title: string; options: string[] }) {
  return (
    <div className="p-2.5 rounded-md border border-border bg-muted/20">
      <div className="text-[11px] font-semibold mb-1.5">{title}</div>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <span key={o} className="px-1.5 py-0.5 text-[10px] rounded bg-background border border-border">{o}</span>
        ))}
      </div>
    </div>
  );
}

function PermissionCard({ title, description, color, actions, auto }: { title: string; description: string; color: "emerald" | "amber" | "rose"; actions: string[]; auto: boolean }) {
  const colors = {
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
    rose: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
  };
  return (
    <div className="iris-card overflow-hidden">
      <div className={cn("px-4 py-3 border-b border-border", colors[color])}>
        <div className="text-[13px] font-semibold">{title}</div>
        <div className="text-[11px] mt-0.5 opacity-80">{description}</div>
        <Badge variant="outline" className={cn("mt-2 text-[10px] h-5 px-1.5", auto ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20")}>
          {auto ? "Auto-approved" : "Manual approval"}
        </Badge>
      </div>
      <div className="p-3 space-y-1.5">
        {actions.map((a) => (
          <div key={a} className="flex items-center gap-2 text-[11px] py-1">
            <div className={cn("w-1.5 h-1.5 rounded-full", color === "emerald" ? "bg-emerald-500" : color === "amber" ? "bg-amber-500" : "bg-rose-500")} />
            {a}
          </div>
        ))}
      </div>
    </div>
  );
}

function MemberDetailDialog({ member, onClose }: { member: typeof MEMBERS[0]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto iris-scrollbar iris-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-border flex items-center gap-3">
          <Avatar className="w-12 h-12">
            <AvatarFallback className={cn("text-white text-sm font-semibold", getAvatarColor(member.name))}>
              {getInitials(member.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="text-[15px] font-semibold">{member.name}</div>
            <div className="text-[12px] text-muted-foreground">{member.email} · {member.phone}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono text-muted-foreground">{member.id}</div>
            <Badge variant="outline" className={cn("text-[10px] mt-1", member.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600")}>
              {member.status}
            </Badge>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <DetailBox label="Studio" value={member.studio} />
            <DetailBox label="City" value={member.city} />
            <DetailBox label="Membership" value={member.membership} />
            <DetailBox label="Credits" value={String(member.credits)} />
            <DetailBox label="Joined" value={formatRelativeTime(member.joinedDate)} />
            <DetailBox label="Last Visit" value={formatRelativeTime(member.lastVisit)} />
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tags</div>
            <div className="flex flex-wrap gap-1.5">
              {member.tags.map((t) => (
                <span key={t} className="px-2 py-0.5 text-[11px] rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium">
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Custom Fields</div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(member.customFields).map(([k, v]) => (
                <div key={k} className="p-2 rounded-md bg-muted/30 border border-border">
                  <div className="text-[10px] font-medium text-muted-foreground capitalize">{k}</div>
                  <div className="text-[12px] font-semibold">{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-border">
            <Button size="sm" className="h-8 text-[12px]">
              <Users className="w-3 h-3 mr-1.5" />
              Create Ticket for Member
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-[12px]">View Visits</Button>
            <Button variant="outline" size="sm" className="h-8 text-[12px]">View Bookings</Button>
            <Button variant="ghost" size="sm" className="h-8 text-[12px] ml-auto" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionDetailDialog({ session, onClose }: { session: typeof SESSIONS[0]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl max-w-lg w-full iris-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono text-muted-foreground">{session.id}</span>
            <Badge variant="outline" className={cn("text-[10px]", session.status === "full" ? "bg-rose-500/10 text-rose-600" : "bg-emerald-500/10 text-emerald-600")}>
              {session.status}
            </Badge>
          </div>
          <div className="text-[15px] font-semibold">{session.name}</div>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <DetailBox label="Studio" value={session.studio} />
            <DetailBox label="Instructor" value={session.instructor} />
            <DetailBox label="Date" value={session.date} />
            <DetailBox label="Time" value={`${session.time} (${session.duration}min)`} />
            <DetailBox label="Capacity" value={`${session.booked}/${session.capacity}`} />
            <DetailBox label="Waitlist" value={String(session.waitlist)} />
          </div>
          <div className="flex items-center gap-2 pt-3 border-t border-border">
            <Button size="sm" className="h-8 text-[12px] flex-1">View Attendees</Button>
            <Button variant="outline" size="sm" className="h-8 text-[12px]">Modify Session</Button>
            <Button variant="ghost" size="sm" className="h-8 text-[12px]" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded-md bg-muted/30 border border-border">
      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-[12px] font-semibold">{value}</div>
    </div>
  );
}

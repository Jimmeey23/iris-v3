"use client";

import * as React from "react";
import { AppShell } from "@/components/iris/app-shell";
import { IntroAnimation } from "@/components/iris/intro-animation";
import { OverviewView } from "@/components/iris/views/overview";
import { AIAssistantView } from "@/components/iris/views/ai-assistant";
import { AllTicketsView } from "@/components/iris/views/all-tickets";
import { AnalyticsView } from "@/components/iris/views/analytics";
import { TemplatesView } from "@/components/iris/views/templates";
import { ReportsView } from "@/components/iris/views/reports";
import { MomenceView } from "@/components/iris/views/momence";
import { EmailTemplatesView } from "@/components/iris/views/email-templates";
import { SettingsView } from "@/components/iris/views/settings";
import { KnowledgeBaseView } from "@/components/iris/views/knowledge-base";
import { TrainersView } from "@/components/iris/views/trainers";
import { EquipmentView } from "@/components/iris/views/equipment";
import { RadarView } from "@/components/iris/views/radar";
import { useAppStore } from "@/lib/iris/store";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthGate } from "@/components/iris/auth-gate";
import { Lock } from "lucide-react";

function LockedView({ title, who = "admins" }: { title: string; who?: string }) {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="iris-card p-8 max-w-sm text-center">
        <div className="w-11 h-11 rounded-full bg-muted mx-auto flex items-center justify-center mb-3">
          <Lock className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="text-[15px] font-semibold">{title} is locked</div>
        <p className="text-[12px] text-muted-foreground mt-1">Only {who} can open this module. Ask an admin if you need access.</p>
      </div>
    </div>
  );
}

export default function Home() {
  const currentView = useAppStore((s) => s.currentView);
  const isAdmin = useAppStore((s) => s.currentUser.tier === "admin");
  const isExecutive = useAppStore((s) => s.currentUser.tier === "executive");

  return (
    <TooltipProvider delayDuration={200}>
      <IntroAnimation />
      <AuthGate>
      <AppShell>
        {currentView === "overview" && <OverviewView />}
        {currentView === "ai_assistant" && <AIAssistantView />}
        {currentView === "all_tickets" && <AllTicketsView filterMode="all" />}
        {currentView === "my_tickets" && <AllTicketsView filterMode="my" />}
        {currentView === "department_queue" && <AllTicketsView filterMode="department" />}
        {currentView === "escalations" && <AllTicketsView filterMode="escalations" />}
        {currentView === "trainers" && (isAdmin ? <TrainersView /> : <LockedView title="Trainers" />)}
        {currentView === "equipment" && <EquipmentView />}
        {currentView === "radar" && <RadarView />}
        {currentView === "analytics" && <AnalyticsView />}
        {currentView === "templates" && <TemplatesView />}
        {currentView === "reports" && <ReportsView />}
        {currentView === "knowledge_base" && <KnowledgeBaseView />}
        {currentView === "momence" && <MomenceView />}
        {currentView === "email_templates" && (isExecutive ? <LockedView title="Emails" who="managers and admins" /> : <EmailTemplatesView />)}
        {currentView === "settings" && <SettingsView />}
      </AppShell>
      </AuthGate>
    </TooltipProvider>
  );
}

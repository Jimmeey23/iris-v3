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

export default function Home() {
  const currentView = useAppStore((s) => s.currentView);

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
        {currentView === "trainers" && <TrainersView />}
        {currentView === "equipment" && <EquipmentView />}
        {currentView === "radar" && <RadarView />}
        {currentView === "analytics" && <AnalyticsView />}
        {currentView === "templates" && <TemplatesView />}
        {currentView === "reports" && <ReportsView />}
        {currentView === "knowledge_base" && <KnowledgeBaseView />}
        {currentView === "momence" && <MomenceView />}
        {currentView === "email_templates" && <EmailTemplatesView />}
        {currentView === "settings" && <SettingsView />}
      </AppShell>
      </AuthGate>
    </TooltipProvider>
  );
}

"use client";

import * as React from "react";
import { AppShell } from "@/components/iris/app-shell";
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
import { useAppStore } from "@/lib/iris/store";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function Home() {
  const { currentView } = useAppStore();

  return (
    <TooltipProvider delayDuration={200}>
      <AppShell>
        {currentView === "overview" && <OverviewView />}
        {currentView === "ai_assistant" && <AIAssistantView />}
        {currentView === "all_tickets" && <AllTicketsView filterMode="all" />}
        {currentView === "my_tickets" && <AllTicketsView filterMode="my" />}
        {currentView === "department_queue" && <AllTicketsView filterMode="department" />}
        {currentView === "escalations" && <AllTicketsView filterMode="escalations" />}
        {currentView === "analytics" && <AnalyticsView />}
        {currentView === "templates" && <TemplatesView />}
        {currentView === "reports" && <ReportsView />}
        {currentView === "knowledge_base" && <KnowledgeBaseView />}
        {currentView === "momence" && <MomenceView />}
        {currentView === "email_templates" && <EmailTemplatesView />}
        {currentView === "settings" && <SettingsView />}
      </AppShell>
    </TooltipProvider>
  );
}

import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "IRIS - Intelligent Routing & Intuitive Systems",
  description:
    "AI-powered internal operations, support & intelligence platform for Physique 57 India studios across Mumbai and Bengaluru.",
  keywords: ["IRIS", "Physique 57", "AI", "operations", "ticketing", "Momence"],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "IRIS - Intelligent Routing & Intuitive Systems",
    description: "AI-powered operations platform for Physique 57 India",
    images: ["/favicon.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Synchronous accent-color randomizer.
          Runs BEFORE React hydrates and BEFORE first paint, so the accent
          is applied instantly on every page load - no flash of blue.

          The script:
            1. Picks a random accent from a 14-color palette.
            2. Excludes the previously-chosen accent (stored in localStorage)
               so back-to-back page loads ALWAYS feel fresh - no chance of
               getting the same color twice in a row.
            3. Sets `data-accent="<name>"` on <html> synchronously.
            4. The CSS in globals.css (`:root[data-accent="..."]`) defines
               the actual --primary / --iris-hero-from / --iris-hero-to
               values, so this single attribute swap restyles the whole app
               (logo bg, hero gradient, buttons, charts, accents).

          IMPORTANT: We intentionally do NOT persist the chosen accent in
          sessionStorage - that would make a tab reload keep the same color,
          which is the opposite of what the user wants ("change color on
          every page load"). Only the PREVIOUS accent is remembered (in
          localStorage) so we can exclude it from the next pick.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              try {
                var accents = ["blue","indigo","purple","pink","red","orange","green","mint","teal","cyan","violet","emerald","rose","amber"];
                var prev = "";
                try { prev = localStorage.getItem("__irisAccentPrev") || ""; } catch (e) {}
                // Pool = all accents EXCEPT the previous one. With 14 colors,
                // this gives 13 fresh options every load - guaranteed change.
                var pool = accents.filter(function(a){ return a !== prev; });
                var chosen = pool[Math.floor(Math.random() * pool.length)];
                try { localStorage.setItem("__irisAccentPrev", chosen); } catch (e) {}
                document.documentElement.setAttribute("data-accent", chosen);
              } catch (e) {
                document.documentElement.setAttribute("data-accent", "blue");
              }
            })();`,
          }}
        />
      </head>
      <body className="font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors closeButton position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}

import { Suspense, lazy } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { HashRouter as Router, Route, Routes } from "react-router-dom";
import PageNotFound from "@/pages/PageNotFound";
import { AuthProvider } from "@/lib/context/AuthContext";
import ScrollToTop from "./components/ScrollToTop";
import Layout from "@/components/Layout";
import RestorePrompt from "@/components/RestorePrompt";
import TutorialProvider from "@/components/Tutorial/TutorialProvider";

const Home = lazy(() => import("@/pages/Home"));
const Codex = lazy(() => import("@/pages/Codex"));
const Tables = lazy(() => import("@/pages/Tables"));
const Calendrier = lazy(() => import("@/pages/Calendrier"));
const Notes = lazy(() => import("@/pages/Notes"));
const Settings = lazy(() => import("@/pages/Settings"));

const Game = lazy(() => import("@/pages/Jeu"));

// Charge les pages en arrière-plan : le changement de page n'attend plus le téléchargement de leur code.
const preloadPages = () =>
  Promise.all([
    import("@/pages/Home"),
    import("@/pages/Codex"),
    import("@/pages/Tables"),
    import("@/pages/Calendrier"),
    import("@/pages/Notes"),
    import("@/pages/Settings"),
    import("@/pages/Jeu"),
  ]).catch(() => {});
if (typeof window !== "undefined") window.setTimeout(preloadPages, 1500);

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <TutorialProvider>
              <ScrollToTop />
              <Suspense fallback={null}>
                <Routes>
                  <Route element={<Layout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/codex" element={<Codex />} />
                    <Route path="/tables" element={<Tables />} />
                    <Route path="/calendrier" element={<Calendrier />} />
                    <Route path="/notes" element={<Notes />} />
                    <Route path="/jeu" element={<Game />} />
                    <Route path="/settings" element={<Settings />} />
                  </Route>
                  <Route path="*" element={<PageNotFound />} />
                </Routes>
              </Suspense>
            </TutorialProvider>
          </Router>
          <RestorePrompt />
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
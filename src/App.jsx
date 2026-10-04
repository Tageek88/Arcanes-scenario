import { Suspense, lazy } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { HashRouter as Router, Route, Routes } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider } from "@/lib/AuthContext";
import ScrollToTop from "./components/ScrollToTop";
import Layout from "@/components/Layout";

const Home = lazy(() => import("@/pages/Home"));
const Codex = lazy(() => import("@/pages/Codex"));
const Tables = lazy(() => import("@/pages/Tables"));
const Calendrier = lazy(() => import("@/pages/Calendrier"));
const Notes = lazy(() => import("@/pages/Notes"));
const Settings = lazy(() => import("@/pages/Settings"));

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <Suspense fallback={null}>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/codex" element={<Codex />} />
                  <Route path="/tables" element={<Tables />} />
                  <Route path="/calendrier" element={<Calendrier />} />
                  <Route path="/notes" element={<Notes />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
                <Route path="*" element={<PageNotFound />} />
              </Routes>
            </Suspense>
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
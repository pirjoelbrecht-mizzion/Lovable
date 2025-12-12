// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
//import "./styles.css";
import App from "./App";
import './styles/layout.css';

// Legacy pages (still accessible)
import Log from "./pages/Log";
import ActivityDetail from "./pages/ActivityDetail";
import Insights from "./pages/Insights";
import Planner from "./pages/Planner";
import Settings from "./pages/Settings";
import SettingsV2 from "./pages/SettingsV2";
import Races from "./pages/Races";
import RaceGoals from "./pages/RaceGoals";
import RaceMode from "./pages/RaceMode";
import SeasonPlan from "./pages/SeasonPlan";
import RouteExplorer from "./pages/RouteExplorer";
import LearningDemo from "./pages/LearningDemo";
import EnvironmentalLearning from "./pages/EnvironmentalLearning";
import HeatImpactDemo from "./pages/HeatImpactDemo";
import ACWRDemo from "./pages/ACWRDemo";

// NEW triad pages
import Quest from "./pages/Quest";
import Mirror from "./pages/Mirror";
import Unity from "./pages/Unity";
import Coach from "./pages/Coach";
import Calendar from "./pages/Calendar";
import Welcome from "./pages/Welcome";

// Auth pages
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";

// Onboarding
import Onboarding from "./pages/Onboarding";

import { TProvider } from "@/i18n";

// Install console filter to hide StackBlitz infrastructure noise
if (import.meta.env.DEV) {
  import('./utils/consoleFilter').then(({ installConsoleFilter, showErrorSummary }) => {
    if (!localStorage.getItem('showAllErrors')) {
      installConsoleFilter();
      setTimeout(() => showErrorSummary(), 1000);
    }
  }).catch(() => {
    // Console filter optional - continue if import fails
  });
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      // Landing page → Welcome (checks auth)
      { index: true, element: <Welcome /> },

      // Primary navigation
      { path: "quest", element: <Quest /> },
      { path: "mirror", element: <Mirror /> },
      { path: "unity", element: <Unity /> },
      { path: "coach", element: <Coach /> },
      { path: "settings", element: <SettingsV2 /> },
      { path: "calendar", element: <Calendar /> },

      // Auth routes
      { path: "auth", element: <Auth /> },
      { path: "auth/callback", element: <AuthCallback /> },

      // Onboarding
      { path: "onboarding", element: <Onboarding /> },

      // Route discovery
      { path: "routes", element: <RouteExplorer /> },

      // Environmental Learning Dashboard
      { path: "environmental", element: <EnvironmentalLearning /> },

      // Statistical Learning Demo
      { path: "learning", element: <LearningDemo /> },

      // Heat Impact Cosmic Demo
      { path: "heat-impact-demo", element: <HeatImpactDemo /> },

      // ACWR Card Demo
      { path: "acwr-demo", element: <ACWRDemo /> },

      // Legacy routes (still available)
      { path: "log", element: <Log /> },
      { path: "activity/:id", element: <ActivityDetail /> },
      { path: "insights", element: <Insights /> },
      { path: "planner", element: <Planner /> },
      { path: "settings-old", element: <Settings /> },
      { path: "races", element: <Races /> },
      { path: "race-goals", element: <RaceGoals /> },
      { path: "race-mode", element: <RaceMode /> },
      { path: "season-plan", element: <SeasonPlan /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TProvider>
      <RouterProvider router={router} />
    </TProvider>
  </StrictMode>
);

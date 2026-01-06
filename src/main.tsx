// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./styles.css";
import App from "./App";

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
import StrengthTraining from "./pages/StrengthTraining";

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

console.log('🚀 main.tsx executing...');
console.log('Environment:', import.meta.env.MODE);
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Has Supabase Key:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);

// TEMPORARILY DISABLED console filter to see all errors
// if (import.meta.env.DEV) {
//   import('./utils/consoleFilter').then(({ installConsoleFilter, showErrorSummary }) => {
//     if (!localStorage.getItem('showAllErrors')) {
//       installConsoleFilter();
//       setTimeout(() => showErrorSummary(), 1000);
//     }
//   }).catch(() => {
//     // Console filter optional - continue if import fails
//   });
// }

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

      // Strength Training System
      { path: "strength-training", element: <StrengthTraining /> },

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

console.log('🎯 About to render React app...');
const rootElement = document.getElementById("root");
console.log('📍 Root element:', rootElement);

if (!rootElement) {
  console.error('❌ Root element not found!');
} else {
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <TProvider>
          <RouterProvider router={router} />
        </TProvider>
      </StrictMode>
    );
    console.log('✅ React app rendered successfully');
  } catch (error) {
    console.error('❌ Error rendering React app:', error);
  }
}

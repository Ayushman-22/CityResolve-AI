import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import CitizenDashboard from "./pages/CitizenDashboard";
import NewIssue from "./pages/NewIssue";
import Notifications from "./pages/Notifications";
import OfficerDashboard from "./pages/OfficerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import IssueMap from "./pages/IssueMap";
import { RoleSignIn, SignInChooser } from "./pages/RoleSignIn";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/sign-in"} component={SignInChooser} />
      <Route path={"/sign-in/citizen"}><RoleSignIn requestedRole="citizen" /></Route>
      <Route path={"/sign-in/officer"}><RoleSignIn requestedRole="officer" /></Route>
      <Route path={"/sign-in/admin"}><RoleSignIn requestedRole="admin" /></Route>
      <Route path={"/citizen"} component={CitizenDashboard} />
      <Route path={"/citizen/report"} component={NewIssue} />
      <Route path={"/notifications"} component={Notifications} />
      <Route path={"/officer"} component={OfficerDashboard} />
      <Route path={"/admin"} component={AdminDashboard} />
      <Route path={"/admin/map"} component={IssueMap} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

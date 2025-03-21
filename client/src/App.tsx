import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeToggle } from "@/components/theme-toggle";
import { NavMenu } from "@/components/nav-menu";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Projects from "@/pages/projects";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home}/>
      <Route path="/projects" component={Projects}/>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>
        <NavMenu />
        <Router />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;
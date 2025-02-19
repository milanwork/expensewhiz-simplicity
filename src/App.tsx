
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/auth";
import Dashboard from "./pages/dashboard";
import Profile from "./pages/profile";
import Contacts from "./pages/contacts";
import { Toaster } from "@/components/ui/toaster";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />}>
          <Route path="/dashboard/contacts" element={<Contacts />} />
          <Route path="/dashboard/profile" element={<Profile />} />
        </Route>
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;

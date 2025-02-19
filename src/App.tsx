
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/auth";
import Dashboard from "./pages/dashboard";
import Profile from "./pages/profile";
import Contacts from "./pages/contacts";
import ContactForm from "./pages/contacts/ContactForm";
import Invoices from "./pages/invoices";
import CreateInvoice from "./pages/invoices/CreateInvoice";
import { Toaster } from "@/components/ui/toaster";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />}>
          <Route path="/dashboard/contacts" element={<Contacts />} />
          <Route path="/dashboard/contacts/new" element={<ContactForm />} />
          <Route path="/dashboard/contacts/:id" element={<ContactForm />} />
          <Route path="/dashboard/invoices" element={<Invoices />} />
          <Route path="/dashboard/invoices/create" element={<CreateInvoice />} />
          <Route path="/dashboard/profile" element={<Profile />} />
        </Route>
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;


import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Auth from "./pages/auth";
import Dashboard from "./pages/dashboard";
import NotFound from "./pages/NotFound";
import Contacts from "./pages/contacts";
import NewInvoice from "./pages/invoices/new";
import NewInvoice2 from "./pages/invoices/new/index2";
import Invoices from "./pages/invoices";
import Profile from "./pages/profile";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Dashboard />,
  },
  {
    path: "/auth",
    element: <Auth />,
  },
  {
    path: "/dashboard",
    children: [
      {
        path: "",
        element: <Dashboard />,
      },
      {
        path: "invoices",
        children: [
          {
            path: "",
            element: <Invoices />,
          },
          {
            path: "new",
            element: <NewInvoice />,
          },
          {
            path: "new2",
            element: <NewInvoice2 />,
          },
        ],
      },
      {
        path: "contacts",
        element: <Contacts />,
      },
      {
        path: "profile",
        element: <Profile />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;

import { createBrowserRouter } from "react-router";
import { AppLayout } from "@/components/layout/app-layout";
import { ProtectedRoute } from "@/components/common/protected-route";
import HomeRoute from "./routes/home";
import LoginRoute from "./routes/login";
import BatchRoute from "./routes/batch";
import CertificatesRoute from "./routes/certificates";
import VerifyRoute from "./routes/verify";
import NotFoundRoute from "./routes/not-found";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginRoute /> },
  // Public: employers and the QR code on each certificate land here
  { path: "/verify", element: <VerifyRoute /> },
  { path: "/verify/:number", element: <VerifyRoute /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <HomeRoute /> },
          { path: "batches/:id", element: <BatchRoute /> },
          { path: "certificates", element: <CertificatesRoute /> },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundRoute /> },
]);

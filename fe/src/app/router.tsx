import { createBrowserRouter } from "react-router";
import { AppLayout } from "@/components/layout/app-layout";
import { ProtectedRoute } from "@/components/common/protected-route";
import HomeRoute from "./routes/home";
import LoginRoute from "./routes/login";
import RegisterRoute from "./routes/register";
import UsersRoute from "./routes/users";
import NotFoundRoute from "./routes/not-found";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginRoute /> },
  { path: "/register", element: <RegisterRoute /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <HomeRoute /> },
          { path: "users", element: <UsersRoute /> },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundRoute /> },
]);

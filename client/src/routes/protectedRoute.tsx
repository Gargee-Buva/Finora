import { Outlet, Navigate } from "react-router-dom";
import { useAppSelector } from "@/app/hook";
import { AUTH_ROUTES } from "@/routes/common/routePath";

const ProtectedRoute = () => {
  const { user, accessToken } = useAppSelector((state) => state.auth);

  // ❌ Not authenticated
  if (!user || !accessToken) {
    return <Navigate to={AUTH_ROUTES.SIGN_IN} replace />;
  }

  // ✅ Authenticated
  return <Outlet />;
};

export default ProtectedRoute;

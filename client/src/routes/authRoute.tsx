import { Navigate, Outlet } from "react-router-dom";
import { PROTECTED_ROUTES } from "@/routes/common/routePath";
import { useAppSelector } from "@/app/hook";

const AuthRoute = () => {
  const { user, accessToken } = useAppSelector((state) => state.auth);

  // ✅ If logged in → block auth pages
  if (user && accessToken) {
    return <Navigate to={PROTECTED_ROUTES.OVERVIEW} replace />;
  }

  // ✅ Otherwise allow /login /signup
  return <Outlet />;
};

export default AuthRoute;

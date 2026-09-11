import { useAuthStore } from "@/features/auth/store";
import { useAuth } from "@clerk/react";
import { Navigate, Outlet } from "react-router-dom";
import { Commonloader } from "../common/Loader";

export function PublicOnlyLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const { isBootstrapped, status } = useAuthStore();

  if (!isLoaded) return null;

  if (isSignedIn && (!isBootstrapped || status === "loading")) {
    return <Commonloader />;
  }

  if (isSignedIn) {
    return <Navigate to={"profile"} replace />;
  }
  return <Outlet />;
}

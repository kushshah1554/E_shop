import { useAuthStore } from "@/features/auth/store";
import { useAuth } from "@clerk/react";
import { Navigate, Outlet } from "react-router-dom";

export function PublicOnlyLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const { isBootstrapped, status } = useAuthStore();

  if (!isLoaded) return null;

  if (isSignedIn && (!isBootstrapped || status === "loading")) {
    return null;
  }

  if (isSignedIn) {
    return <Navigate to={"profile"} replace />;
  }
  return <Outlet />;
}

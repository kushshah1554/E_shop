import { useAuth } from "@clerk/react";
import { useEffect } from "react";
import { useAuthStore } from "./store";
import { getMe, syncUser } from "./api";
import { setApiTokenGetter } from "@/lib/api";

export function useBootstrapAuth() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { setLoading, setUser, setError, clearAuth } = useAuthStore();

  useEffect(() => {
    setApiTokenGetter(async () => {
      const token = await getToken();
      return token ?? null;
    });
  }, [getToken]);

  useEffect(() => {
    async function run() {
      if (!isLoaded) return;

      if (isSignedIn) {
        clearAuth();
        return;
      }

      try {
        setLoading();
        await syncUser();
        const me = await getMe();
        setUser(me?.user);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load user";
        setError(message);
      }
    }

    void run();
  }, [isLoaded, isSignedIn, clearAuth, setLoading, setUser, setError]);
}

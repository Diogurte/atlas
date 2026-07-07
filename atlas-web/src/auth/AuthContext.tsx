import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "../lib/supabase";
import { getOrCreateUserProfile, type AtlasUserProfile } from "../services/users.service";
import type { PermissionKey } from "./permissions";

type AuthContextValue = {
  session: Session | null;
  profile: AtlasUserProfile | null;
  isLoading: boolean;
  authError: string;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  can: (permission: PermissionKey) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message);
  }
  return "Erro inesperado de autenticação.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AtlasUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  const loadProfile = useCallback(async (nextSession: Session | null) => {
    setAuthError("");

    if (!nextSession?.user?.email) {
      setProfile(null);
      return;
    }

    try {
      const data = await getOrCreateUserProfile({
        authUserId: nextSession.user.id,
        email: nextSession.user.email,
        name:
          typeof nextSession.user.user_metadata?.full_name === "string"
            ? nextSession.user.user_metadata.full_name
            : undefined,
      });

      setProfile(data);
    } catch (error) {
      setProfile(null);
      setAuthError(getErrorMessage(error));
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      setSession(data.session);
      await loadProfile(data.session);
      setIsLoading(false);
    }

    boot();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      loadProfile(nextSession);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  async function signIn(email: string, password: string) {
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(name: string, email: string, password: string) {
    setAuthError("");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }

  async function refreshProfile() {
    await loadProfile(session);
  }

  function can(permission: PermissionKey) {
    if (!profile || !profile.active) return false;
    if (profile.role === "Owner") return true;
    return Boolean(profile.permissions[permission]);
  }

  const value = useMemo(
    () => ({
      session,
      profile,
      isLoading,
      authError,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      can,
    }),
    [session, profile, isLoading, authError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth tem de ser usado dentro do AuthProvider");
  return context;
}

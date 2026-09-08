import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";

type Profile = Tables<"profiles">;

type AuthStatus =
  | "loading"
  | "signed_out"
  | "domain_not_allowed"
  | "signed_in";

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  blockedEmail: string | null;
  refreshProfile: () => Promise<void>;
  signInWithMicrosoft: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  clearDomainBlock: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function isDomainAllowed(email: string | undefined | null) {
  if (!email || !email.includes("@")) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;

  const { data, error } = await supabase
    .from("allowed_domains")
    .select("domain")
    .eq("domain", domain)
    .maybeSingle();

  if (error) {
    console.error("Failed to check allowed domain", error);
    return false;
  }
  return Boolean(data);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [blockedEmail, setBlockedEmail] = useState<string | null>(null);

  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Failed to load profile", error);
      return null;
    }
    return data;
  }

  async function handleSession(nextSession: Session | null) {
    if (!nextSession) {
      setSession(null);
      setProfile(null);
      setStatus("signed_out");
      return;
    }

    const allowed = await isDomainAllowed(nextSession.user.email);
    if (!allowed) {
      setBlockedEmail(nextSession.user.email ?? null);
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
      setStatus("domain_not_allowed");
      return;
    }

    setBlockedEmail(null);
    const nextProfile = await loadProfile(nextSession.user.id);
    setSession(nextSession);
    setProfile(nextProfile);
    setStatus("signed_in");
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      handleSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        handleSession(nextSession);
      },
    );

    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshProfile() {
    if (!session) return;
    const nextProfile = await loadProfile(session.user.id);
    setProfile(nextProfile);
  }

  async function signInWithMicrosoft() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        scopes: "email openid profile",
        redirectTo: window.location.origin,
      },
    });
    return { error: error ? new Error(error.message) : null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setStatus("signed_out");
  }

  function clearDomainBlock() {
    setBlockedEmail(null);
    setStatus("signed_out");
  }

  return (
    <AuthContext.Provider
      value={{
        status,
        session,
        user: session?.user ?? null,
        profile,
        blockedEmail,
        refreshProfile,
        signInWithMicrosoft,
        signOut,
        clearDomainBlock,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

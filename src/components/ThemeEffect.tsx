import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

export function ThemeEffect() {
  const { profile } = useAuth();
  const preference = profile?.theme_preference ?? "system";

  useEffect(() => {
    const root = document.documentElement;
    if (preference === "light" || preference === "dark") {
      root.dataset.theme = preference;
    } else {
      delete root.dataset.theme;
    }
  }, [preference]);

  return null;
}

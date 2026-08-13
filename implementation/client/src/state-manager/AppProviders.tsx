import { type ReactNode } from "react";
import { AuthProvider } from "./contexts/authContext";

// Single place where every application-wide provider is composed. Add future
// providers by nesting them here.
export function AppProviders({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

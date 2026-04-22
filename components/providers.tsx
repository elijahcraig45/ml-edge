"use client";

import { FirebaseProvider } from "@/context/firebase-context";

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return <FirebaseProvider>{children}</FirebaseProvider>;
}

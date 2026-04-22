"use client";

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "@firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "@firebase/firestore";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { auth, firestore, hasFirebaseClientConfig } from "@/lib/firebase/client";

type FirebaseContextValue = {
  user: User | null;
  isLoading: boolean;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

const FirebaseContext = createContext<FirebaseContextValue | undefined>(undefined);

const googleProvider = new GoogleAuthProvider();

async function syncUserProfile(user: User) {
  if (!firestore) {
    return;
  }

  const userRef = doc(firestore, "users", user.uid);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    await setDoc(
      userRef,
      {
        uid: user.uid,
        email: user.email ?? "",
        lastLogin: serverTimestamp(),
      },
      { merge: true },
    );

    return;
  }

  await setDoc(userRef, {
    uid: user.uid,
    email: user.email ?? "",
    streakCount: 0,
    lastLogin: serverTimestamp(),
    completedModules: [],
  });
}

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(auth));

  useEffect(() => {
    if (!auth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setIsLoading(false);

      if (nextUser) {
        void syncUserProfile(nextUser);
      }
    });

    return unsubscribe;
  }, []);

  const value = useMemo<FirebaseContextValue>(
    () => ({
      user,
      isLoading,
      isConfigured: hasFirebaseClientConfig,
      async signInWithGoogle() {
        if (!auth) {
          throw new Error("Firebase Auth is not configured.");
        }

        await signInWithPopup(auth, googleProvider);
      },
      async signOutUser() {
        if (!auth) {
          return;
        }

        await signOut(auth);
      },
    }),
    [isLoading, user],
  );

  return (
    <FirebaseContext.Provider value={value}>{children}</FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);

  if (!context) {
    throw new Error("useFirebase must be used within a FirebaseProvider.");
  }

  return context;
}

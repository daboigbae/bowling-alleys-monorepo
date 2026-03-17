import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type FirebaseApp } from 'firebase/app';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { firebaseApp, firebaseAuth } from '../lib/firebase';
import { AuthContext } from '../contexts/AuthContext';

interface FirebaseContextValue {
  app: FirebaseApp;
}

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

interface FirebaseProviderProps {
  children: ReactNode;
}

export function FirebaseProvider({ children }: FirebaseProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  // isLoading starts true — remains true until onAuthStateChanged fires at least once,
  // preventing a flash of unauthenticated UI on launch when the session may still be restoring.
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  async function signOut(): Promise<void> {
    await firebaseSignOut(firebaseAuth);
  }

  return (
    <FirebaseContext.Provider value={{ app: firebaseApp }}>
      <AuthContext.Provider value={{ user, isLoading, signOut }}>
        {children}
      </AuthContext.Provider>
    </FirebaseContext.Provider>
  );
}

export function useFirebase(): FirebaseContextValue {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}

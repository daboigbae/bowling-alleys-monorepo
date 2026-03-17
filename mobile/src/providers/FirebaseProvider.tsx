import { createContext, useContext, type ReactNode } from 'react';
import { type FirebaseApp } from 'firebase/app';
import { firebaseApp } from '../lib/firebase';

interface FirebaseContextValue {
  app: FirebaseApp;
}

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

interface FirebaseProviderProps {
  children: ReactNode;
}

export function FirebaseProvider({ children }: FirebaseProviderProps) {
  return (
    <FirebaseContext.Provider value={{ app: firebaseApp }}>
      {children}
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

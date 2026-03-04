'use client';

import { createContext, useContext, useEffect, useState } from "react";
import {
  type User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  deleteUser,
  signInWithCustomToken,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createUser, deleteUserData } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api-client";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  sendVerificationCode: (email: string) => Promise<void>;
  verifyCodeAndSignIn: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      if (firebaseUser) {
        await createUser(
          firebaseUser.uid,
          firebaseUser.displayName || "Anonymous",
          firebaseUser.photoURL || undefined,
        );
      }
    });

    return unsubscribe;
  }, [toast]);

  const signInWithEmail = async (email: string, password: string) => {
    if (!auth) throw new Error("Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* to .env.local.");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Success",
        description: "Successfully signed in!",
      });
    } catch (error: any) {
      toast({
        title: "Sign In Error",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    displayName: string,
  ) => {
    if (!auth) throw new Error("Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* to .env.local.");
    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      
      // Wait for profile update to complete before continuing
      await updateProfile(result.user, { displayName });
      
      // Force refresh the user to get the updated displayName
      await result.user.reload();
      
      toast({
        title: "Success",
        description: "Account created successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Sign Up Error",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      toast({
        title: "Success",
        description: "Successfully signed out!",
      });
    } catch (error: any) {
      toast({
        title: "Sign Out Error",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteAccount = async () => {
    if (!auth) throw new Error("Firebase is not configured.");
    try {
      if (!user) throw new Error("No user logged in");

      // Delete user data from Firestore first
      await deleteUserData(user.uid);

      // Then delete the Firebase Auth account
      await deleteUser(user);

      toast({
        title: "Account Deleted",
        description:
          "Your account and all associated data have been permanently deleted.",
      });
    } catch (error: any) {
      toast({
        title: "Delete Account Error",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const sendVerificationCode = async (email: string) => {
    try {
      await apiRequest("POST", "/api/auth/send-code", { email });
      
      toast({
        title: "Code Sent",
        description: "Check your email for the verification code.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification code",
        variant: "destructive",
      });
      throw error;
    }
  };

  const verifyCodeAndSignIn = async (email: string, code: string) => {
    if (!auth) throw new Error("Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* to .env.local.");
    try {
      const response = await apiRequest("POST", "/api/auth/verify-code", { email, code });

      const data = await response.json();
      
      if (!data.customToken) {
        throw new Error("No authentication token received");
      }

      await signInWithCustomToken(auth, data.customToken);
      
      toast({
        title: "Success",
        description: data.isNewUser ? "Account created successfully!" : "Successfully signed in!",
      });
    } catch (error: any) {
      toast({
        title: "Verification Error",
        description: error.message || "Invalid or expired code",
        variant: "destructive",
      });
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signInWithEmail,
    signUpWithEmail,
    sendVerificationCode,
    verifyCodeAndSignIn,
    logout,
    deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};


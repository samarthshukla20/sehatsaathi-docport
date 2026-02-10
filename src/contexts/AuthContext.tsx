import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

interface User {
  id: string;
  name: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  // 🌟 UPDATED: Signup now accepts contact and location
  signup: (
    fullName: string, 
    username: string, 
    password: string, 
    contact: string,
    lat: number | null,
    long: number | null
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => ({ success: false }),
  signup: async () => ({ success: false }),
  logout: () => {},
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("sehatsaathi_user");
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const { data, error } = await supabase
        .from("doctor_access")
        .select("*")
        .eq("username", username)
        .eq("password", password)
        .single();

      if (error || !data) {
        return { success: false, error: "Invalid username or password" };
      }

      const userData = { id: data.id, name: data.full_name, username: data.username };
      setUser(userData);
      localStorage.setItem("sehatsaathi_user", JSON.stringify(userData));
      return { success: true };

    } catch (err) {
      return { success: false, error: "Login failed due to network error." };
    }
  };

  // 🌟 UPDATED SIGNUP LOGIC
  const signup = async (
    fullName: string, 
    username: string, 
    password: string,
    contact: string,
    lat: number | null,
    long: number | null
  ) => {
    try {
      const { data: existing } = await supabase
        .from("doctor_access")
        .select("id")
        .eq("username", username)
        .single();

      if (existing) {
        return { success: false, error: "Username already exists." };
      }

      const { error } = await supabase
        .from("doctor_access")
        .insert([{ 
            full_name: fullName, 
            username, 
            password,
            contact: contact ? parseInt(contact) : null, // Convert string to number/bigint
            loc_lat: lat,
            loc_long: long
        }]);

      if (error) throw error;

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Signup failed" };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("sehatsaathi_user");
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
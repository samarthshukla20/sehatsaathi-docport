import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext"; 

// Pages
import DoctorDashboard from "./pages/DoctorDashboard";
import Login from "./pages/Login";

// --- 🛡️ SIMPLE GUARD ---
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center text-slate-500">Loading...</div>;
  }

  // If no user object, kick them out
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/doctor" element={
          <ProtectedRoute>
            <DoctorDashboard />
          </ProtectedRoute>
        } />

        <Route path="/" element={<Navigate to="/doctor" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
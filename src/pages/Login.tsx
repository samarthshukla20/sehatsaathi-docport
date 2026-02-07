import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext"; 
import { Stethoscope } from "lucide-react"; 

const Login = () => {
  const navigate = useNavigate();
  const { login, signup } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); 
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    if (isSignUp) {
      // --- SIGN UP ---
      const res = await signup(fullName, username, password);
      if (res.success) {
        alert("Account created! You can now log in.");
        setIsSignUp(false); // Switch to login view
      } else {
        setErrorMsg(res.error || "Signup failed");
      }
    } else {
      // --- LOGIN ---
      const res = await login(username, password);
      if (res.success) {
        navigate("/doctor");
      } else {
        setErrorMsg(res.error || "Login failed");
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg mb-4">
            <Stethoscope className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">SehatSaathi DocPort</h1>
          <p className="text-slate-500 text-sm">Medical Professional Portal</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          
          {isSignUp && (
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700">Full Name</label>
              <input 
                type="text" 
                className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Enter your full name" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={isSignUp}
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-700">Username</label>
            <input 
              type="text" 
              className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Enter Username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-700">Password</label>
            <input 
              type="password" 
              className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl transition-colors disabled:opacity-50 mt-4"
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : (isSignUp ? "Create Account" : "Sign In")}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          {isSignUp ? "Already have an account?" : "New to DocPort?"}{" "}
          <button 
            onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(""); }} 
            className="text-emerald-600 font-bold hover:underline"
          >
            {isSignUp ? "Log In" : "Register Here"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
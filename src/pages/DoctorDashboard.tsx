import React, { useState, useEffect, useRef } from "react";
import { Stethoscope } from "@phosphor-icons/react";
import { 
  Activity, Bell, Calendar, History, 
  Siren, Menu, MapPin, Check, WifiOff, LogOut, X 
} from "lucide-react";
import { supabase } from "../lib/supabase"; 
import HistoryTab from "../pages/HistoryTab"; 
import { useAuth } from "../contexts/AuthContext"; 

// --- UTILITY ---
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

// --- UI COMPONENTS ---
const Button = ({ className, variant = "default", size = "default", ...props }: any) => {
  const base = "inline-flex items-center justify-center rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50";
  const variants: any = {
    default: "bg-sky-600 text-white hover:bg-sky-700 shadow-lg shadow-sky-200",
    ghost: "hover:bg-slate-100 text-slate-600",
    outline: "border-2 border-slate-200 bg-white hover:border-sky-200 text-slate-700",
    destructive: "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-200",
  };
  const sizes: any = { default: "h-11 px-5", sm: "h-9 px-3 text-sm", icon: "h-10 w-10" };
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
};

const Switch = ({ checked, onCheckedChange }: any) => (
  <button
    onClick={() => onCheckedChange(!checked)}
    className={cn(
      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none",
      checked ? "bg-emerald-500" : "bg-slate-200"
    )}
  >
    <span className={cn("pointer-events-none block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform", checked ? "translate-x-5" : "translate-x-0")} />
  </button>
);

// --- MAIN DASHBOARD ---
const DoctorDashboard = () => {
  const { user, logout } = useAuth(); 
  
  const [isOnline, setIsOnline] = useState(true); 
  const [activeTab, setActiveTab] = useState("live");
  const [showPopup, setShowPopup] = useState(false);
  const [progress, setProgress] = useState(100);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // 📱 Mobile Menu State
  
  const [currentEmergency, setCurrentEmergency] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [respondedIds, setRespondedIds] = useState<Set<string>>(new Set());

  // Ref for Realtime Listener checks
  const isOnlineRef = useRef(isOnline);
  useEffect(() => { isOnlineRef.current = isOnline; }, [isOnline]);

  // --- FILTERING LOGIC ---
  const isResolved = (status: string, id: string) => {
    return respondedIds.has(id) || status === 'Accepted' || status === 'Declined';
  };

  const liveRequests = requests.filter(r => !isResolved(r.status, r.id));
  const historyRequests = requests.filter(r => isResolved(r.status, r.id));

  // --- INITIAL LOAD ---
  useEffect(() => {
    const loadData = async () => {
      console.log("🔄 Loading Data...");
      
      const { data: allRequests } = await supabase
        .from('Emergencies') 
        .select('*')
        .order('created_at', { ascending: false });

      const { data: responses } = await supabase
        .from('Hospital_Responses')
        .select('emergency_id');

      const ids = new Set((responses || []).map((r: any) => r.emergency_id));
      setRespondedIds(ids);

      if (allRequests) {
        setRequests(allRequests);
        const pending = allRequests.find((r: any) => 
            !ids.has(r.id) && r.status !== 'Accepted' && r.status !== 'Declined'
        );

        if (pending && isOnlineRef.current) {
            setCurrentEmergency(pending);
            setShowPopup(true);
        }
      }
    };
    loadData();

    const channel = supabase
      .channel('public:Emergencies')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Emergencies' }, (payload) => {
        const newReq = payload.new;
        setRequests((prev) => [newReq, ...prev]);

        const isNotResolved = newReq.status !== 'Accepted' && newReq.status !== 'Declined';
        if (isOnlineRef.current && isNotResolved) {
            setCurrentEmergency(newReq);
            setShowPopup(true);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'Emergencies' }, (payload) => {
         setRequests(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // --- HANDLE RESPONSE ---
  const handleResponse = async (accepted: boolean) => {
    if (!currentEmergency || !user) return; 

    setShowPopup(false); 
    setRespondedIds(prev => new Set(prev).add(currentEmergency.id)); 
    setRequests(prev => prev.map(r => r.id === currentEmergency.id ? { ...r, status: accepted ? 'Accepted' : 'Declined' } : r));

    await supabase.from('Hospital_Responses').insert([{
        emergency_id: currentEmergency.id,   
        hospital_name: "City General Hospital", 
        bed_availability: accepted,          
        medical_advice: accepted ? "Ambulance dispatched." : "Redirecting.",
        eta: accepted ? "10 mins" : "N/A",
        responded_at: new Date().toISOString(),
        responded_by_id: user.id 
    }]);

    await supabase
        .from('Emergencies')
        .update({ status: accepted ? 'Accepted' : 'Declined' })
        .eq('id', currentEmergency.id);
        
    setCurrentEmergency(null);
  };

  useEffect(() => {
    if (showPopup) {
      setProgress(100);
      setTimeout(() => setProgress(0), 100);
    }
  }, [showPopup]);

  const formatTime = (dateString: string) => {
    if(!dateString) return "Just now";
    const diff = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 60000);
    return diff < 1 ? "Just now" : `${diff}m ago`;
  };

  const getInitials = (name: string) => {
    if (!name) return "Dr";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden md:flex w-72 flex-col border-r bg-white px-6 py-8 z-20">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-sky-600 text-white shadow-lg shadow-emerald-200">
            <Stethoscope size={24} weight="fill" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900">SehatSaathi</span>
        </div>
        
        <nav className="space-y-2 flex-1">
          <NavButton 
            active={activeTab === "live"} 
            onClick={() => setActiveTab("live")} 
            icon={Activity} 
            label={`Live (${liveRequests.length})`} 
          />
          <NavButton 
            active={activeTab === "schedule"} 
            onClick={() => setActiveTab("schedule")} 
            icon={Calendar} 
            label="Appointments" 
          />
          <NavButton 
            active={activeTab === "history"} 
            onClick={() => setActiveTab("history")} 
            icon={History} 
            label={`History (${historyRequests.length})`} 
          />
        </nav>

        {/* LOGOUT DESKTOP */}
        <button 
          onClick={logout}
          className="group flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 mt-auto hover:bg-red-50 hover:border-red-100 transition-all text-left"
          title="Click to Logout"
        >
           <div className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
             {getInitials(user?.name || "")}
           </div>
           <div className="flex-1 min-w-0">
             <p className="text-sm font-bold truncate group-hover:text-red-700 transition-colors">
               {user?.name || "Doctor"}
             </p>
             <p className="text-xs text-slate-500 truncate group-hover:text-red-400">
               Doctor
             </p>
           </div>
           <LogOut className="h-5 w-5 text-slate-400 group-hover:text-red-500 transition-colors" />
        </button>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col relative h-full">
        <header className="h-20 px-6 md:px-10 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100">
          <div className="flex md:hidden items-center gap-3">
            {/* 🍔 HAMBURGER BUTTON */}
            <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(true)}><Menu className="h-6 w-6" /></Button>
            <span className="font-bold text-lg">SehatSaathi</span>
          </div>
          <h2 className="hidden md:block text-xl font-bold text-slate-800 capitalize">
            {activeTab} Dashboard
          </h2>
          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-slate-200">
                <span className={cn("text-xs font-bold uppercase", isOnline ? "text-emerald-600" : "text-slate-400")}>{isOnline ? "Online" : "Offline"}</span>
                <Switch checked={isOnline} onCheckedChange={setIsOnline} />
             </div>
             <Button variant="ghost" size="icon" className="relative">
               <Bell className="h-6 w-6" />
               <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white animate-pulse" />
             </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 pb-32">
          
          {/* BANNER (Only on Live Tab) */}
          {activeTab === 'live' && (
            <div className={cn("relative overflow-hidden rounded-3xl p-8 md:p-12 text-white shadow-xl mb-10 transition-colors", isOnline ? "bg-gradient-to-r from-emerald-600 to-teal-900" : "bg-slate-800")}>
               <div className="absolute top-0 right-0 p-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
               <div className="relative z-10">
                 <div className="flex items-center gap-2 mb-4 text-emerald-100 font-medium">
                   {isOnline ? <Activity className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
                   <span>{isOnline ? "Real-time Overview" : "You are Offline"}</span>
                 </div>
                 <h1 className="text-3xl md:text-5xl font-bold mb-4">Welcome back, {user?.name?.split(" ")[0] || "Doctor"}</h1>
                 <p className="text-lg text-emerald-50">
                    {isOnline 
                      ? <>You have <span className="font-bold text-white bg-white/20 px-2 rounded">{liveRequests.length} active alerts</span>.</>
                      : "Notifications are paused. Go online to receive alerts."
                    }
                 </p>
               </div>
            </div>
          )}

          {/* === LIVE TAB === */}
          {activeTab === 'live' && (
            <>
               {!isOnline ? (
                /* OFFLINE STATE */
                <div className="flex flex-col items-center justify-center p-16 bg-slate-50 rounded-3xl border border-dashed border-slate-300 text-slate-400">
                    <div className="h-20 w-20 bg-slate-200 rounded-full flex items-center justify-center mb-6 text-slate-500">
                        <WifiOff className="h-10 w-10" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 mb-2">You're Offline</h3>
                    <p className="max-w-xs text-center">Go online to receive incoming requests.</p>
                    <Button className="mt-6 bg-slate-800" onClick={() => setIsOnline(true)}>Go Online</Button>
                </div>
               ) : (
                /* ONLINE LIVE LIST */
                <>
                    <h3 className="text-xl font-bold text-slate-900 mb-6">Incoming Emergencies</h3>
                    {liveRequests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-dashed border-slate-300 text-slate-400">
                          <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4"><Check className="h-8 w-8 text-emerald-500" /></div>
                          <p>All caught up! No pending emergencies.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {liveRequests.map((req: any) => (
                            <div key={req.id} className={cn("group flex items-center justify-between p-5 bg-white rounded-2xl border transition-all hover:shadow-md border-l-4 border-l-red-500")}>
                                <div className="flex items-center gap-5">
                                    <div className={cn("h-14 w-14 rounded-full flex items-center justify-center shrink-0 bg-red-50 text-red-600")}>
                                        <Siren className="h-7 w-7 animate-pulse" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h4 className="text-lg font-bold text-slate-900">{req.patient_name || "Unknown Patient"}</h4>
                                            <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">SOS</span>
                                        </div>
                                        <p className="text-slate-500 font-medium">{req.user_message || req.emergency_type} • <span className="text-slate-900">{formatTime(req.created_at)}</span></p>
                                        {req.location_lat_long && (
                                            <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                                            <MapPin className="h-3 w-3" /> {req.location_lat_long}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <Button className="rounded-xl px-6 bg-red-500 hover:bg-red-600" onClick={() => { setCurrentEmergency(req); setShowPopup(true); }}>
                                    Respond
                                </Button>
                            </div>
                            ))}
                        </div>
                    )}
                </>
               )}
            </>
          )}

          {/* === HISTORY TAB === */}
          {activeTab === 'history' && (
             <HistoryTab requests={historyRequests} />
          )}

        </div>
      </main>

      {/* --- 📱 MOBILE MENU DRAWER (SLIDE-IN) --- */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-start">
          {/* Backdrop (Click to close) */}
          <div 
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in"
            onClick={() => setIsMenuOpen(false)}
          />
          
          {/* Drawer Content */}
          <div className="relative w-3/4 max-w-xs bg-white h-full shadow-2xl p-6 flex flex-col animate-in slide-in-from-left">
            <div className="flex items-center justify-between mb-8">
              <span className="text-xl font-bold text-slate-900">Menu</span>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="space-y-2 flex-1">
              <NavButton 
                active={activeTab === "live"} 
                onClick={() => { setActiveTab("live"); setIsMenuOpen(false); }} 
                icon={Activity} 
                label={`Live Alerts`} 
              />
              <NavButton 
                active={activeTab === "schedule"} 
                onClick={() => { setActiveTab("schedule"); setIsMenuOpen(false); }} 
                icon={Calendar} 
                label="Appointments" 
              />
              <NavButton 
                active={activeTab === "history"} 
                onClick={() => { setActiveTab("history"); setIsMenuOpen(false); }} 
                icon={History} 
                label="History" 
              />
            </nav>

            {/* 🚨 MOBILE LOGOUT BUTTON */}
            <div className="mt-auto border-t border-slate-100 pt-6">
              <div className="flex items-center gap-3 mb-4 px-2">
                 <div className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold">
                   {getInitials(user?.name || "")}
                 </div>
                 <div>
                   <p className="text-sm font-bold text-slate-900">{user?.name || "Doctor"}</p>
                   <p className="text-xs text-slate-500">Doctor</p>
                 </div>
              </div>
              <Button 
                variant="destructive" 
                className="w-full gap-2" 
                onClick={logout}
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAV (Optional - kept if you want quick switching) */}
      <div className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-white border-t border-slate-200 flex justify-around items-center z-40 px-2 pb-safe">
         <MobileNavItem icon={Activity} label="Live" active={activeTab === 'live'} onClick={() => setActiveTab('live')} />
         <MobileNavItem icon={Calendar} label="Schedule" active={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} />
         <MobileNavItem icon={History} label="History" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
      </div>

      {/* POPUP */}
      {showPopup && currentEmergency && isOnline && (
         <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl animate-in slide-in-from-bottom-10 relative overflow-hidden">
               <div className="absolute inset-0 border-4 border-red-500/30 rounded-3xl animate-pulse pointer-events-none" />
               <div className="text-center relative z-10">
                  <div className="h-24 w-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6"><Siren className="h-12 w-12 animate-bounce" /></div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-2">Emergency Alert!</h2>
                  <p className="text-lg text-slate-500 mb-1 font-bold">{currentEmergency.patient_name}</p>
                  <p className="text-sm text-slate-400 mb-6">{currentEmergency.user_message || currentEmergency.emergency_type}</p>
                  
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-8"><div className="h-full bg-red-500 transition-all duration-[8000ms] ease-linear" style={{ width: `${progress}%` }} /></div>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <Button variant="outline" className="h-14 text-lg border-2" onClick={() => handleResponse(false)}>Decline</Button>
                     <Button className="h-14 text-lg bg-emerald-600 hover:bg-emerald-700" onClick={() => handleResponse(true)}>Accept</Button>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

// --- SUB COMPONENTS ---
const NavButton = ({ active, onClick, icon: Icon, label }: any) => (
  <button onClick={onClick} className={cn("w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all font-medium", active ? "bg-sky-50 text-sky-700 font-bold" : "text-slate-500 hover:bg-slate-50")}>
    <Icon className={cn("h-6 w-6", active && "stroke-2")} /> {label}
  </button>
);
const MobileNavItem = ({ active, onClick, icon: Icon, label }: any) => (
  <button onClick={onClick} className={cn("flex flex-col items-center gap-1 p-2 rounded-xl", active ? "text-sky-600" : "text-slate-400")}><Icon className="h-6 w-6" /><span className="text-[10px] font-bold">{label}</span></button>
);

export default DoctorDashboard;
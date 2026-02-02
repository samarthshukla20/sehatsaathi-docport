import React, { useState, useEffect } from "react";
import { Stethoscope } from "@phosphor-icons/react";
import { 
  Activity, Bell, Calendar, History, BarChart2, Heart, 
  Siren, User, PlayCircle, Check, X, Menu, MapPin
} from "lucide-react";
import { supabase } from "../lib/supabase"; 

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

const Card = ({ className, ...props }: any) => (
  <div className={cn("rounded-2xl bg-white border border-slate-100 shadow-sm", className)} {...props} />
);

const Badge = ({ className, variant = "default", ...props }: any) => {
  const variants: any = {
    default: "bg-sky-50 text-sky-700 border border-sky-100",
    destructive: "bg-red-50 text-red-700 border border-red-100",
  };
  return <div className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold", variants[variant], className)} {...props} />;
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
  const [isOnline, setIsOnline] = useState(false);
  const [activeTab, setActiveTab] = useState("live");
  const [showPopup, setShowPopup] = useState(false);
  const [progress, setProgress] = useState(100);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // State for Current Emergency Popup Data
  const [currentEmergency, setCurrentEmergency] = useState<any>(null);

  // State for Request List
  const [requests, setRequests] = useState<any[]>([]);

  // 1. FETCH & LISTEN TO 'Emergencies' TABLE
  useEffect(() => {
    fetchRequests();

    // Real-time listener: When Main Site inserts into "Emergencies"
    const channel = supabase
      .channel('public:Emergencies')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Emergencies' }, (payload) => {
        const newReq = payload.new;
        
        // Add to list immediately
        setRequests((prev) => [newReq, ...prev]);

        // Trigger Popup
        setCurrentEmergency(newReq);
        setShowPopup(true);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchRequests = async () => {
    // Note: We use quotes '"Emergencies"' because your table has capital letter E
    const { data, error } = await supabase
      .from('Emergencies') 
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setRequests(data);
    if (error) console.error("Error fetching requests:", error);
  };

  // 2. SEND RESPONSE TO 'Hospital_Responses' TABLE
  const handleResponse = async (accepted: boolean) => {
    if (!currentEmergency) return;

    const timestamp = new Date().toISOString();

    // A. Insert into Response Table
    const { error: responseError } = await supabase
      .from('Hospital_Responses')
      .insert([
        {
          emergency_id: currentEmergency.id,   // Linking ID
          hospital_name: "City General Hospital", // Hardcoded for this doctor
          bed_availability: accepted,          // True/False
          medical_advice: accepted ? "Ambulance dispatched. Prepare patient." : "Redirecting to another facility.",
          eta: accepted ? "10 mins" : "N/A",
          responded_at: timestamp
        }
      ]);

    // B. Update Status in Emergencies Table (Optional but good for UI)
    if (!responseError) {
      await supabase
        .from('Emergencies')
        .update({ status: accepted ? 'Accepted' : 'Declined' })
        .eq('id', currentEmergency.id);

      // UI Updates
      setShowPopup(false);
      // Update the local list status without refreshing
      setRequests(prev => prev.map(r => r.id === currentEmergency.id ? { ...r, status: accepted ? 'Accepted' : 'Declined' } : r));
    } else {
      alert("Error sending response: " + responseError.message);
    }
  };

  // Helper for Demo Button
  const triggerDemoRequest = () => {
    const fakeData = { 
      id: "demo-" + Date.now(), 
      patient_name: "Demo Patient", 
      emergency_type: "Cardiac Arrest", 
      user_message: "Severe chest pain, difficulty breathing", 
      location_lat_long: "23.2599, 77.4126",
      created_at: new Date().toISOString() 
    };
    setCurrentEmergency(fakeData);
    setShowPopup(true);
  };

  // Timer Animation
  useEffect(() => {
    if (showPopup) {
      setProgress(100);
      setTimeout(() => setProgress(0), 100);
    }
  }, [showPopup]);

  // Helper for Time Ago
  const formatTime = (dateString: string) => {
    if(!dateString) return "Just now";
    const diff = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 60000);
    return diff < 1 ? "Just now" : `${diff}m ago`;
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="hidden md:flex w-72 flex-col border-r bg-white px-6 py-8 z-20">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-sky-600 text-white shadow-lg shadow-emerald-200">
            <Stethoscope size={24} weight="fill" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900">SehatSaathi</span>
        </div>
        <nav className="space-y-2 flex-1">
          <NavButton active={activeTab === "live"} onClick={() => setActiveTab("live")} icon={Activity} label="Live Emergencies" />
          <NavButton active={activeTab === "schedule"} onClick={() => setActiveTab("schedule")} icon={Calendar} label="Appointments" />
          <NavButton active={activeTab === "history"} onClick={() => setActiveTab("history")} icon={History} label="History" />
        </nav>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 mt-auto">
           <div className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold">DS</div>
           <div><p className="text-sm font-bold">Doctor</p><p className="text-xs text-slate-500">General Physician</p></div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col relative h-full">
        <header className="h-20 px-6 md:px-10 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100">
          <div className="flex md:hidden items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(true)}><Menu className="h-6 w-6" /></Button>
            <span className="font-bold text-lg">SehatSaathi</span>
          </div>
          <h2 className="hidden md:block text-xl font-bold text-slate-800">Dashboard</h2>
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
          {/* BANNER */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-900 p-8 md:p-12 text-white shadow-xl mb-10">
             <div className="absolute top-0 right-0 p-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
             <div className="relative z-10">
               <div className="flex items-center gap-2 mb-4 text-emerald-100 font-medium"><Activity className="h-5 w-5" /><span>Real-time Overview</span></div>
               <h1 className="text-3xl md:text-5xl font-bold mb-4">Welcome back, Doctor</h1>
               <p className="text-lg text-emerald-50">You have <span className="font-bold text-white bg-white/20 px-2 rounded">{requests.length} active alerts</span>.</p>
             </div>
          </div>

          {/* REQUESTS LIST (Mapped to 'Emergencies' Table) */}
          <h3 className="text-xl font-bold text-slate-900 mb-6">Incoming Emergencies</h3>
          <div className="space-y-4">
            {requests.map((req: any) => (
              <div key={req.id} className={cn("group flex items-center justify-between p-5 bg-white rounded-2xl border transition-all hover:shadow-md border-l-4 border-l-red-500")}>
                 <div className="flex items-center gap-5">
                    <div className={cn("h-14 w-14 rounded-full flex items-center justify-center shrink-0 bg-red-50 text-red-600")}>
                       <Siren className="h-7 w-7 animate-pulse" />
                    </div>
                    <div>
                       <div className="flex items-center gap-3 mb-1">
                          <h4 className="text-lg font-bold text-slate-900">{req.patient_name || "Unknown Patient"}</h4>
                          <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">SOS</span>
                          {req.status === 'Accepted' && <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">ACCEPTED</span>}
                       </div>
                       <p className="text-slate-500 font-medium">{req.user_message || req.emergency_type} • <span className="text-slate-900">{formatTime(req.created_at)}</span></p>
                       {req.location_lat_long && (
                          <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                            <MapPin className="h-3 w-3" /> {req.location_lat_long}
                          </div>
                       )}
                    </div>
                 </div>
                 
                 {req.status !== 'Accepted' ? (
                   <Button className="rounded-xl px-6 bg-red-500 hover:bg-red-600">
                      Respond
                   </Button>
                 ) : (
                   <Button variant="outline" disabled className="rounded-xl px-6 text-emerald-600 border-emerald-200 bg-emerald-50">
                      <Check className="h-4 w-4 mr-2" /> Responded
                   </Button>
                 )}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* MOBILE NAV & DEMO BUTTON */}
      <div className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-white border-t border-slate-200 flex justify-around items-center z-40 px-2 pb-safe">
         <MobileNavItem icon={Activity} label="Live" active={activeTab === 'live'} onClick={() => setActiveTab('live')} />
         <MobileNavItem icon={Calendar} label="Schedule" active={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} />
         <MobileNavItem icon={History} label="History" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
      </div>

      <button onClick={triggerDemoRequest} className="fixed bottom-20 right-5 md:bottom-10 md:right-10 z-50 bg-slate-900 text-white px-6 py-4 rounded-full font-bold shadow-2xl flex items-center gap-3 hover:scale-105 transition-transform">
        <PlayCircle className="h-5 w-5" /> <span className="hidden md:inline">Simulate Request</span>
      </button>

      {/* POPUP (Live Emergency Data) */}
      {showPopup && currentEmergency && (
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
const StatCard = ({ label, value, icon: Icon, color, bg }: any) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-32">
     <div className="flex justify-between items-start"><span className="text-slate-400 text-xs font-bold uppercase">{label}</span><div className={cn("p-2 rounded-lg", bg, color)}><Icon className="h-4 w-4" /></div></div>
     <span className="text-3xl font-bold text-slate-900">{value}</span>
  </div>
);

export default DoctorDashboard;
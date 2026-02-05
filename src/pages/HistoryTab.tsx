import React from "react";
import { Check, WifiOff } from "lucide-react";

// Helper for conditional classes
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

const HistoryTab = ({ requests }: { requests: any[] }) => {
  
  // Helper to format time (e.g., "5m ago")
  const formatTime = (dateString: string) => {
    if (!dateString) return "Just now";
    const diff = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 60000);
    return diff < 1 ? "Just now" : `${diff}m ago`;
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-xl font-bold text-slate-900 mb-6">Response History</h3>
      
      {requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-3xl border border-dashed border-slate-300 text-slate-400">
           <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
             <HistoryIcon className="h-8 w-8 text-slate-300" />
           </div>
           <p>No response history found.</p>
        </div>
      ) : (
        requests.map((req: any) => (
          <div 
            key={req.id} 
            className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-5">
              {/* Status Icon */}
              <div className={cn(
                "h-12 w-12 rounded-full flex items-center justify-center shrink-0 transition-colors", 
                req.status === 'Accepted' ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
              )}>
                {req.status === 'Accepted' ? <Check className="h-6 w-6" /> : <WifiOff className="h-6 w-6" />}
              </div>

              {/* Details */}
              <div>
                <h4 className="text-lg font-bold text-slate-900">{req.patient_name || "Unknown Patient"}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide", 
                    req.status === 'Accepted' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                  )}>
                    {req.status}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <p className="text-xs text-slate-500 font-medium">{formatTime(req.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Time (Absolute) */}
            <div className="hidden md:block text-right">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date</div>
                <div className="text-sm font-semibold text-slate-700">
                    {new Date(req.created_at).toLocaleDateString()}
                </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

// Simple Icon for Empty State
const HistoryIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
);

export default HistoryTab;
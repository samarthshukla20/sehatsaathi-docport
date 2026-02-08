import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { MessageCircle, MapPin, Clock, Send, CheckCircle, User, AlertCircle } from "lucide-react";

// --- UTILITY ---
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

const HealthForumTab = () => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 1. FETCH DATA
  const fetchQuestions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("health_forum")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setQuestions(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQuestions();

    // Realtime Listener for new questions
    const channel = supabase
      .channel("public:health_forum")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "health_forum" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setQuestions((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setQuestions((prev) =>
              prev.map((q) => (q.id === payload.new.id ? payload.new : q))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 2. SUBMIT ANSWER
  const handleSubmitAnswer = async (questionId: string) => {
    if (!answerText.trim() || !user) return;
    setSubmitting(true);

    const { error } = await supabase
      .from("health_forum")
      .update({
        answer_text: answerText,
        answered_by_doctor_id: user.id, // 🌟 Using Unique Doctor ID
        answered_at: new Date().toISOString(),
        is_answered: true,
      })
      .eq("id", questionId);

    if (!error) {
      // Local update to UI
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? { ...q, is_answered: true, answer_text: answerText, answered_at: new Date().toISOString() }
            : q
        )
      );
      setAnsweringId(null);
      setAnswerText("");
    } else {
      alert("Failed to submit answer. Please try again.");
    }
    setSubmitting(false);
  };

  // 3. FORMAT TIME
  const formatTime = (dateString: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };

  const pendingQuestions = questions.filter((q) => !q.is_answered);
  const answeredQuestions = questions.filter((q) => q.is_answered);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER */}
      <div>
        <h3 className="text-2xl font-bold text-slate-900">Patient Health Forum</h3>
        <p className="text-slate-500">Answer public health queries from your community.</p>
      </div>

      {/* --- PENDING SECTION --- */}
      <div className="space-y-4">
        <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Pending Questions <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">{pendingQuestions.length}</span>
        </h4>

        {loading ? (
           <div className="text-center p-10 text-slate-400">Loading queries...</div>
        ) : pendingQuestions.length === 0 ? (
           <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400">
             No pending questions. Good job, Doctor!
           </div>
        ) : (
          pendingQuestions.map((q) => (
            <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                {/* Question Header */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                            {q.patient_name?.[0] || "P"}
                        </div>
                        <div>
                            <h5 className="font-bold text-slate-900">{q.patient_name}</h5>
                            <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {q.location || "Unknown"}</span>
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatTime(q.created_at)}</span>
                            </div>
                        </div>
                    </div>
                    <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                        {q.category}
                    </span>
                </div>

                {/* Question Text */}
                <p className="text-lg text-slate-800 font-medium mb-4">
                    "{q.question_text}"
                </p>

                {/* Answer Box */}
                {answeringId === q.id ? (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in fade-in">
                        <textarea 
                            className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[100px]"
                            placeholder={`Type your medical advice for ${q.patient_name}...`}
                            value={answerText}
                            onChange={(e) => setAnswerText(e.target.value)}
                        />
                        <div className="flex justify-end gap-3 mt-3">
                            <button 
                                onClick={() => { setAnsweringId(null); setAnswerText(""); }}
                                className="text-slate-500 font-medium text-sm hover:text-slate-700"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => handleSubmitAnswer(q.id)}
                                disabled={submitting}
                                className="bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-sky-700 flex items-center gap-2 disabled:opacity-50"
                            >
                                {submitting ? "Sending..." : <><Send className="h-4 w-4" /> Submit Answer</>}
                            </button>
                        </div>
                    </div>
                ) : (
                    <button 
                        onClick={() => setAnsweringId(q.id)}
                        className="w-full py-3 border-2 border-slate-100 rounded-xl text-sky-600 font-bold hover:bg-sky-50 hover:border-sky-200 transition-all flex items-center justify-center gap-2"
                    >
                        <MessageCircle className="h-5 w-5" /> Write an Answer
                    </button>
                )}
            </div>
          ))
        )}
      </div>

      {/* --- HISTORY SECTION --- */}
      {answeredQuestions.length > 0 && (
        <div className="space-y-4 pt-8 border-t border-slate-200">
           <h4 className="text-lg font-bold text-slate-400 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" /> Answered History
           </h4>
           <div className="opacity-75">
             {answeredQuestions.map((q) => (
                <div key={q.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-4">
                    <div className="flex justify-between mb-2">
                        <span className="font-bold text-slate-700">{q.patient_name}</span>
                        <span className="text-xs text-slate-400">{formatTime(q.answered_at)}</span>
                    </div>
                    <p className="text-slate-600 mb-3">"{q.question_text}"</p>
                    <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg flex gap-3">
                        <div className="h-6 w-6 rounded-full bg-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                            <User className="h-3 w-3" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-emerald-800">You answered:</p>
                            <p className="text-sm text-emerald-900">{q.answer_text}</p>
                        </div>
                    </div>
                </div>
             ))}
           </div>
        </div>
      )}

    </div>
  );
};

export default HealthForumTab;
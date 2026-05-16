"use client"

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, ArrowRight, Stethoscope, AlertCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

function SymptomsContent() {
  const searchParams = useSearchParams();
  const [symptoms, setSymptoms] = useState(searchParams.get("symptom") || "");
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<any>(null);

  const analyze = async () => {
    if (!symptoms.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/symptom-suggestion", {
        method: "POST",
        body: JSON.stringify({ symptoms }),
        headers: { "Content-Type": "application/json" },
      });
      const result = await res.json();
      if (result.success) {
        setSuggestion(result.data);
      } else {
        toast.error("AI Analysis failed. Please try again.");
      }
    } catch (error) {
      toast.error("Connection error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchParams.get("symptom")) {
      analyze();
    }
  }, []);

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <GlassCard className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">What are your symptoms?</label>
          <Textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="Describe in detail..."
            className="min-h-[200px] glass"
          />
        </div>
        <Button
          onClick={analyze}
          className="w-full bg-gradient-emerald text-primary-foreground shadow-glow"
          disabled={loading || !symptoms.trim()}
        >
          {loading ? "Analyzing..." : "Analyze Symptoms"}
          {!loading && <Sparkles className="ml-2 h-4 w-4" />}
        </Button>
      </GlassCard>

      <div className="space-y-6">
        {suggestion ? (
          <GlassCard variant="strong" className="animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-tighter">
                {Math.round(suggestion.confidence * 100)}% Match
              </div>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 grid place-items-center text-primary shadow-inner">
                <Stethoscope className="h-7 w-7" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground">Recommended Dept.</div>
                <div className="text-2xl font-black tracking-tight">{suggestion.department}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40">
                <p className="text-sm font-medium leading-relaxed">
                  {suggestion.reason}
                </p>
              </div>

              {suggestion.warning && (
                <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm font-bold text-destructive leading-tight">
                    {suggestion.warning}
                  </p>
                </div>
              )}

              <Link href={`/patient/booking?dept=${encodeURIComponent(suggestion.department)}`} className="block pt-2">
                <Button className="w-full bg-primary text-primary-foreground h-12 font-bold rounded-xl shadow-glow active:scale-[0.98] transition-transform">
                  Book with {suggestion.department} Specialist
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </GlassCard>
        ) : (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 text-center glass rounded-[2.5rem] border-dashed border-2 border-border/60 opacity-40">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-primary/40" />
            </div>
            <h3 className="text-lg font-bold uppercase tracking-tight">Ready for analysis</h3>
            <p className="text-sm max-w-[200px] mt-1 font-medium">Describe your symptoms to see a recommendation.</p>
          </div>
        )}


        <div className="glass p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div className="text-[11px] text-muted-foreground leading-relaxed">
            <strong>Disclaimer:</strong> This AI tool is for guidance only and is not a medical diagnosis.
            In case of emergency, please visit the ER immediately.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SymptomsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">AI Symptom Guide</h1>
        <p className="text-muted-foreground mt-2">
          Describe how you feel, and our AI will suggest the most relevant department.
        </p>
      </div>

      <Suspense fallback={
        <div className="grid md:grid-cols-2 gap-8 opacity-50 animate-pulse">
          <GlassCard className="h-[300px] bg-muted">
            <div />
          </GlassCard>
          <GlassCard className="h-[300px] bg-muted">
            <div />
          </GlassCard>
        </div>
      }>
        <SymptomsContent />
      </Suspense>
    </div>
  );
}

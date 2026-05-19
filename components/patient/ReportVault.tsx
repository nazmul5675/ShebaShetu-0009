"use client"

import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import {
  FolderHeart, Search, FileText,
  Download, ExternalLink, Calendar,
  User, Hash, XCircle, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReportVaultProps {
  initialReports: any[];
}

export function ReportVault({ initialReports }: ReportVaultProps) {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const filtered = initialReports.filter((r) => {
    const searchLower = search.toLowerCase();
    const uploadDate = new Date(r.uploadedAt);
    const dateStr1 = format(uploadDate, 'd MMM, yyyy').toLowerCase();
    const dateStr2 = format(uploadDate, 'MMM d, yyyy').toLowerCase();
    const dateStr3 = format(uploadDate, 'yyyy-MM-dd').toLowerCase();

    return (
      (r.title?.toLowerCase().includes(searchLower) ?? false) ||
      (r.type?.toLowerCase().includes(searchLower) ?? false) ||
      (r.fileName?.toLowerCase().includes(searchLower) ?? false) ||
      dateStr1.includes(searchLower) ||
      dateStr2.includes(searchLower) ||
      dateStr3.includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-primary/5 p-4 rounded-3xl border border-primary/10">
        <div className="relative group flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            placeholder="Search by report name, type, file, date..."
            className="w-full glass rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button disabled variant="outline" className="glass rounded-xl h-10 text-[11px] font-bold uppercase tracking-widest opacity-50 cursor-not-allowed">
            <Calendar className="h-3.5 w-3.5 mr-2" /> All Dates (Coming soon)
          </Button>
          <Button disabled variant="outline" className="glass rounded-xl h-10 text-[11px] font-bold uppercase tracking-widest opacity-50 cursor-not-allowed">
            Type: All (Coming soon)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.length > 0 ? (
          filtered.map((report) => (
            <GlassCard key={report.id} className="group hover:ring-1 hover:ring-primary/40 transition-all duration-300 p-0 overflow-hidden">
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 grid place-items-center text-primary group-hover:scale-110 transition-transform">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="px-2 py-0.5 rounded-full bg-secondary text-[9px] font-black uppercase tracking-wider">
                    {report.type}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-lg group-hover:text-primary transition-colors line-clamp-1">{report.title}</h4>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {format(new Date(report.uploadedAt), 'MMM d, yyyy')}
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase font-bold tracking-tighter">
                    <Hash className="h-3 w-3" /> {(report.sizeBytes / 1024).toFixed(1)} KB
                  </div>
                </div>
              </div>

              <div className="p-3 bg-secondary/20 border-t border-border/40 grid grid-cols-2 gap-2">
                <Button variant="ghost" className="h-9 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-primary/10 hover:text-primary" asChild>
                  <a href={report.fileUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> View
                  </a>
                </Button>
                <Button variant="ghost" className="h-9 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-primary/10 hover:text-primary" asChild>
                  <a href={report.fileUrl} download={report.fileName || `${report.title}.pdf`} target="_blank" rel="noopener noreferrer">
                    <Download className="h-3.5 w-3.5 mr-1.5" /> Get PDF
                  </a>
                </Button>
              </div>
            </GlassCard>
          ))
        ) : (
          <div className="col-span-full py-24 flex flex-col items-center justify-center text-center glass rounded-[2.5rem] border-dashed border-2 border-border/60 opacity-60">
            <XCircle className="h-16 w-16 mb-4 text-muted-foreground/20" />
            <h3 className="text-xl font-bold uppercase tracking-tight">No reports found</h3>
            <p className="text-sm max-w-xs mt-1">
              {search ? "No matching medical records found." : "Your clinical reports will appear here once they are uploaded."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

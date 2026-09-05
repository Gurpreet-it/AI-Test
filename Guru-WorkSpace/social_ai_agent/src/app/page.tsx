"use client";

import { useEffect, useState } from "react";
import { AgentControls } from "@/components/AgentControls";
import { AgentLog, LogEntry } from "@/components/AgentLog";
import { ContentTable } from "@/components/ContentTable";

interface ContentRow {
  date: string;
  topic: string;
  linkedinPost: string;
  igScript: string;
  status: string;
}

export default function Dashboard() {
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    done: 0,
    writing: 0,
    pending: 0,
    errors: 0,
  });

  const fetchContent = async () => {
    try {
      const res = await fetch("/api/content");
      const data = await res.json();
      setRows(data || []);
      
      const total = data?.length || 0;
      const done = data?.filter((r: any) => r.status === "Done").length || 0;
      const writing = data?.filter((r: any) => r.status === "Writing").length || 0;
      const pending = data?.filter((r: any) => r.status === "Pending").length || 0;
      const errors = data?.filter((r: any) => r.status === "Error").length || 0;
      
      setStats({ total, done, writing, pending, errors });
    } catch (err) {
      console.error("Failed to fetch content:", err);
    }
  };

  useEffect(() => {
    fetchContent();
    const interval = setInterval(fetchContent, 2000);
    return () => clearInterval(interval);
  }, []);

  const addLog = (message: string, level: "info" | "success" | "error" = "info") => {
    setLogs((prev) => [{ message, timestamp: new Date(), level }, ...prev].slice(0, 15));
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 40, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <div style={{ maxWidth: "80rem", margin: "0 auto", padding: "1.5rem 2rem" }}>
          <h1 style={{ fontSize: "2.25rem", fontWeight: "bold", color: "#2563eb" }}>ContentForge</h1>
          <p style={{ color: "#4b5563", marginTop: "0.25rem" }}>AI-powered content generation pipeline</p>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: "80rem", margin: "0 auto", padding: "2rem" }}>
        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          {[
            { label: "TOTAL", value: stats.total, desc: "items in pipeline", color: "#2563eb" },
            { label: "DONE", value: stats.done, desc: "completed", color: "#16a34a" },
            { label: "WRITING", value: stats.writing, desc: "in progress", color: "#a855f7" },
            { label: "PENDING", value: stats.pending, desc: "awaiting action", color: "#d97706" },
            { label: "ERRORS", value: stats.errors, desc: "issues detected", color: "#dc2626" },
          ].map((stat) => (
            <div key={stat.label} style={{ background: "#fff", borderRadius: "0.5rem", border: "1px solid #e5e7eb", padding: "1.5rem", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: "bold", letterSpacing: "0.1em", color: stat.color }}>{stat.label}</div>
              <div style={{ fontSize: "2.25rem", fontWeight: "bold", color: "#111827", marginTop: "0.5rem" }}>{stat.value}</div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.5rem" }}>{stat.desc}</div>
            </div>
          ))}
        </div>

        {/* Controls Section */}
        <div style={{ background: "#fff", borderRadius: "0.5rem", border: "1px solid #e5e7eb", padding: "1.5rem", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#111827", marginBottom: "1.5rem" }}>Pipeline Controls</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
            <AgentControls addLog={addLog} />
          </div>
        </div>

        {/* Activity Log */}
        <div style={{ background: "#fff", borderRadius: "0.5rem", border: "1px solid #e5e7eb", padding: "1.5rem", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#111827", marginBottom: "1rem" }}>Activity Log</h2>
          <AgentLog logs={logs} />
        </div>

        {/* Content Calendar */}
        <div style={{ background: "#fff", borderRadius: "0.5rem", border: "1px solid #e5e7eb", padding: "1.5rem", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
          <ContentTable rows={rows} />
        </div>
      </div>
    </div>
  );
}

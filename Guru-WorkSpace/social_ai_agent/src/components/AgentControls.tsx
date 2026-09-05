"use client";

import { useState } from "react";

interface Props {
  addLog: (msg: string, level?: "info" | "success" | "error") => void;
}

export function AgentControls({ addLog }: Props) {
  const [loading, setLoading] = useState(false);

  const runPipeline = async (endpoint: string, name: string) => {
    if (loading) return;
    setLoading(true);
    addLog(`▶ ${name} started`, "info");
    
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const result = await res.json();
      addLog(`✓ ${name} complete`, "success");
    } catch (err) {
      addLog(`✗ ${name} failed`, "error");
    } finally {
      setLoading(false);
    }
  };

  const buttons = [
    { label: "Full Pipeline", endpoint: "/api/run", name: "Tech Full" },
    { label: "Topic Only", endpoint: "/api/run-topic", name: "Topic" },
    { label: "Write Content", endpoint: "/api/run-content", name: "Content" },
    { label: "Generate Prompts", endpoint: "/api/run-images", name: "Images" },
  ];

  const unicaButtons = [
    { label: "Unica Full", endpoint: "/api/run-unica", name: "Unica Full" },
    { label: "Unica Topic", endpoint: "/api/run-unica-topic", name: "Unica Topic" },
    { label: "Unica Content", endpoint: "/api/run-unica-content", name: "Unica Content" },
    { label: "Unica Images", endpoint: "/api/run-unica-images", name: "Unica Images" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h3 style={{ fontSize: "0.875rem", fontWeight: "bold", color: "#111827", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ width: "0.5rem", height: "0.5rem", background: "#2563eb", borderRadius: "50%" }}></span>
          Tech Track
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {buttons.map((btn) => (
            <button
              key={btn.endpoint}
              onClick={() => runPipeline(btn.endpoint, btn.name)}
              disabled={loading}
              style={{
                padding: "0.5rem 1rem",
                background: "#eff6ff",
                border: "2px solid #93c5fd",
                color: "#1e40af",
                borderRadius: "9999px",
                fontWeight: "600",
                fontSize: "0.875rem",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#dbeafe")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#eff6ff")}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: "0.875rem", fontWeight: "bold", color: "#111827", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ width: "0.5rem", height: "0.5rem", background: "#6b7280", borderRadius: "50%" }}></span>
          HCL Unica Track
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {unicaButtons.map((btn) => (
            <button
              key={btn.endpoint}
              onClick={() => runPipeline(btn.endpoint, btn.name)}
              disabled={loading}
              style={{
                padding: "0.5rem 1rem",
                background: "#f3f4f6",
                border: "2px solid #d1d5db",
                color: "#374151",
                borderRadius: "9999px",
                fontWeight: "600",
                fontSize: "0.875rem",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#e5e7eb")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#f3f4f6")}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

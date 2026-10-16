"use client";

import { useEffect, useState } from "react";
import { ContentRow } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

type Tab = "linkedin" | "instagram" | "prompt";

interface Props {
  row: ContentRow;
  busy: boolean;
  onClose: () => void;
  onRegenerate: (step: "content" | "images") => void;
  onDelete: () => void;
}

export function PreviewDrawer({ row, busy, onClose, onRegenerate, onDelete }: Props) {
  const [tab, setTab] = useState<Tab>("linkedin");
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);

  // Load the Gemini image-prompt text file (served from /public/images).
  useEffect(() => {
    setPrompt("");
    if (!row.promptFile) return;
    fetch(row.promptFile, { cache: "no-store" })
      .then((r) => (r.ok ? r.text() : ""))
      .then((t) => setPrompt(t.trim()))
      .catch(() => setPrompt(""));
  }, [row.promptFile]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const text = tab === "linkedin" ? row.linkedinPost : tab === "instagram" ? row.igScript : prompt;
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  const emptyMsg: Record<Tab, string> = {
    linkedin: "No LinkedIn post yet — use “Regenerate content”.",
    instagram: "No carousel yet — use “Regenerate content”.",
    prompt: "No image prompt yet — use “Regenerate image prompt”.",
  };

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label="Content preview">
        <div className="drawer-head">
          <div className="meta">
            <StatusBadge status={row.status} />
            <span>{row.date}</span>
            <span style={{ marginLeft: "auto", cursor: "pointer", fontSize: 20 }} onClick={onClose} title="Close (Esc)">
              ✕
            </span>
          </div>
          <h3>{row.topic}</h3>
        </div>

        <div className="drawer-tabs">
          <button className={`dtab ${tab === "linkedin" ? "active" : ""}`} onClick={() => setTab("linkedin")}>
            LinkedIn post
          </button>
          <button className={`dtab ${tab === "instagram" ? "active" : ""}`} onClick={() => setTab("instagram")}>
            Instagram carousel
          </button>
          <button className={`dtab ${tab === "prompt" ? "active" : ""}`} onClick={() => setTab("prompt")}>
            Image prompt
          </button>
        </div>

        <div className="drawer-body">
          {text ? (
            <>
              <div className={`content-box ${tab === "prompt" ? "mono" : ""}`}>{text}</div>
              <div className="words">{words} words</div>
            </>
          ) : (
            <div className="empty">
              <div className="big">📝</div>
              {emptyMsg[tab]}
            </div>
          )}
        </div>

        <div className="drawer-foot">
          <div className="toolbar">
            <button className="btn" disabled={!text} onClick={copy}>
              {copied ? "✓ Copied" : "📋 Copy"}
            </button>
            <button className="btn" disabled={busy} onClick={() => onRegenerate("content")}>
              🔄 Regenerate content
            </button>
            <button className="btn" disabled={busy} onClick={() => onRegenerate("images")}>
              🖼️ Regenerate image prompt
            </button>
          </div>
          <button className="btn danger" disabled={busy} onClick={onDelete}>
            🗑️ Delete
          </button>
        </div>
      </aside>
    </>
  );
}

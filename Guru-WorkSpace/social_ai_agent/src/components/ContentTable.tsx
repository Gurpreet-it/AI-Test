"use client";

import { useMemo, useState } from "react";
import { ContentRow } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

interface Props {
  rows: ContentRow[];
  onPreview: (row: ContentRow) => void;
  onDelete: (row: ContentRow) => void;
}

export function ContentTable({ rows, onPreview, onDelete }: Props) {
  const [newestFirst, setNewestFirst] = useState(true);
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    // rows arrive in creation order, so reversing gives "newest first" even within one day
    const ordered = newestFirst ? [...rows].reverse() : [...rows];
    return ordered
      .sort((a, b) => (newestFirst ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)))
      .filter((r) => !q || r.topic.toLowerCase().includes(q));
  }, [rows, newestFirst, query]);

  return (
    <div className="card">
      <div className="card-head">
        <h3>Content library ({rows.length})</h3>
        <div className="toolbar">
          <input
            className="search"
            placeholder="Search topics…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn small" onClick={() => setNewestFirst((v) => !v)}>
            📅 {newestFirst ? "Newest first" : "Oldest first"}
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="empty">
          <div className="big">📭</div>
          <b>{rows.length === 0 ? "Nothing here yet" : "No matching topics"}</b>
          {rows.length === 0 ? "Click “Generate new post” to create your first topic, post and carousel." : "Try a different search."}
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th className="sortable" onClick={() => setNewestFirst((v) => !v)}>
                Date {newestFirst ? "↓" : "↑"}
              </th>
              <th>Topic</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id}>
                <td className="date-cell">{r.date}</td>
                <td className="topic-cell">{r.topic}</td>
                <td>
                  <StatusBadge status={r.status} />
                </td>
                <td>
                  <div className="row-actions">
                    <button className="btn small" onClick={() => onPreview(r)}>
                      👁️ Preview
                    </button>
                    <button className="btn small danger" onClick={() => onDelete(r)} title="Delete this item">
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

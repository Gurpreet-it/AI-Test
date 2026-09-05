"use client";

import { useState } from "react";
import { StatusBadge } from "./StatusBadge";

interface ContentRow {
  date: string;
  topic: string;
  linkedinPost: string;
  igScript: string;
  status: string;
}

export function ContentTable({ rows }: { rows: ContentRow[] }) {
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedRow, setSelectedRow] = useState<ContentRow | null>(null);
  const [showModal, setShowModal] = useState(false);

  const sortedRows = [...rows].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
  });

  const handleClearAll = async () => {
    if (!confirm("Delete all content? This cannot be undone.")) return;
    try {
      await fetch("/api/clear", { method: "POST" });
      window.location.reload();
    } catch (err) {
      console.error("Clear failed:", err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Content Calendar</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 text-gray-700"
          >
            📅 Sort {sortOrder === "asc" ? "↑" : "↓"}
          </button>
          <button
            onClick={handleClearAll}
            className="px-3 py-1 text-sm bg-red-50 hover:bg-red-100 rounded border border-red-300 text-red-700"
          >
            🗑️ Clear All
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Date</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Topic</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Status</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900">Preview</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, idx) => (
              <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600 font-mono text-xs">{row.date}</td>
                <td className="px-4 py-3 text-gray-900 truncate max-w-md">{row.topic}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status as any} />
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => {
                      setSelectedRow(row);
                      setShowModal(true);
                    }}
                    className="w-4 h-4 rounded-full bg-blue-500 hover:bg-blue-600"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && selectedRow && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-lg border border-gray-200 max-w-2xl w-full max-h-96 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h4 className="font-semibold text-gray-900 truncate">{selectedRow.topic}</h4>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              {selectedRow.linkedinPost && (
                <div>
                  <h5 className="font-semibold text-green-900 mb-2">📱 LinkedIn Post</h5>
                  <div className="bg-gray-50 p-3 rounded border border-gray-200 text-gray-700 text-sm whitespace-pre-wrap">
                    {selectedRow.linkedinPost}
                  </div>
                </div>
              )}
              {selectedRow.igScript && (
                <div>
                  <h5 className="font-semibold text-purple-900 mb-2">📸 Instagram Carousel</h5>
                  <div className="bg-gray-50 p-3 rounded border border-gray-200 text-gray-700 text-sm whitespace-pre-wrap">
                    {selectedRow.igScript}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

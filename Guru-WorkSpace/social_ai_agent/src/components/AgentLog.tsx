"use client";

export interface LogEntry {
  message: string;
  timestamp: Date;
  level: "info" | "success" | "error" | "warning";
}

export function AgentLog({ logs }: { logs: LogEntry[] }) {
  const colorMap = {
    info: "text-gray-600",
    success: "text-green-600",
    error: "text-red-600",
    warning: "text-amber-600",
  };
  const lastEntries = (logs || []).slice(-15);

  return (
    <div className="bg-gray-50 rounded border border-gray-200 p-4 h-64 overflow-y-auto font-mono text-sm">
      {lastEntries.length === 0 ? (
        <div className="text-gray-400">Awaiting pipeline activity...</div>
      ) : (
        lastEntries.map((entry, idx) => (
          <div key={idx} className="mb-2">
            <span className="text-gray-400">{entry.timestamp.toLocaleTimeString()}</span>
            <span className={`ml-2 ${colorMap[entry.level]}`}>{entry.message}</span>
          </div>
        ))
      )}
    </div>
  );
}

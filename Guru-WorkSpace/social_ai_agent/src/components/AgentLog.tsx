"use client";

export interface LogEntry {
  message: string;
  timestamp: Date;
  level: "info" | "success" | "error";
}

export function AgentLog({ logs }: { logs: LogEntry[] }) {
  return (
    <div className="log">
      {logs.length === 0 ? (
        <div className="log-empty">Waiting for pipeline activity…</div>
      ) : (
        logs.map((l, i) => (
          <div key={i}>
            <span className="t">{l.timestamp.toLocaleTimeString()}</span>
            <span className={l.level}>{l.message}</span>
          </div>
        ))
      )}
    </div>
  );
}

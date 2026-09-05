export function StatusBadge({ status }: { status: string }) {
  const colors = {
    Done: "bg-green-100 text-green-800",
    Writing: "bg-blue-100 text-blue-800",
    Pending: "bg-gray-100 text-gray-800",
    Error: "bg-red-100 text-red-800",
    Imaging: "bg-purple-100 text-purple-800",
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"}`}>
      {status}
    </span>
  );
}

"use client";

interface TableMessageProps {
  table: {
    head: string[];
    body: (string | number)[][];
  };
  message?: string;
}

export function TableMessage({ table, message }: TableMessageProps) {
  if (!table?.head || !table?.body || !Array.isArray(table.head) || !Array.isArray(table.body)) {
    return <div className="text-sm text-muted-foreground">Invalid table data</div>;
  }

  return (
    <div className="space-y-3">
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border rounded-lg border">
          <thead className="bg-muted/50">
            <tr>
              {table.head.map((header, index) => (
                <th
                  key={index}
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-background">
            {table.body.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-muted/30">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3 text-sm">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
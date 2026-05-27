"use client";

import { Card } from "../components/Card";
import { useBridge } from "../lib/store";

export default function AuditLogPage() {
  const audit = useBridge((s) => s.audit);
  const ordered = [...audit].sort(
    (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime(),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="text-sm text-muted">
          Append-only record of every state-changing action.
        </p>
      </header>

      <Card>
        {ordered.length === 0 ? (
          <p className="text-sm text-muted">No events yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted">
              <tr className="border-b border-border">
                <th className="px-2 py-2 text-left font-medium">When</th>
                <th className="px-2 py-2 text-left font-medium">Actor</th>
                <th className="px-2 py-2 text-left font-medium">Action</th>
                <th className="px-2 py-2 text-left font-medium">Entity</th>
                <th className="px-2 py-2 text-left font-medium">Detail</th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0">
                  <td className="px-2 py-3 text-xs text-muted">{new Date(e.ts).toLocaleString()}</td>
                  <td className="px-2 py-3">{e.actor}</td>
                  <td className="px-2 py-3 font-mono text-xs">{e.action}</td>
                  <td className="px-2 py-3 font-mono text-xs text-muted">{e.entityType}:{e.entityId.slice(0, 10)}</td>
                  <td className="px-2 py-3 text-xs">{e.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

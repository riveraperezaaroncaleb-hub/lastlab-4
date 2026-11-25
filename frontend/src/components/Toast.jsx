import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';

export default function Toast({ toasts }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(t => {
        let Icon = Info;
        if (t.type === 'success') Icon = CheckCircle2;
        if (t.type === 'error') Icon = XCircle;
        if (t.type === 'warning') Icon = AlertTriangle;

        return (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <Icon size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ flex: 1 }}>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}

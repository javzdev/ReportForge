import React from 'react';

export default function Spinner({ label = 'Cargando...' }: { label?: string }): React.ReactElement {
  return (
    <div className="loading-row" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

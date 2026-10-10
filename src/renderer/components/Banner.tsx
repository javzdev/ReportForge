import React from 'react';

interface BannerProps {
  kind?: 'error' | 'warning' | 'info' | 'success';
  children: React.ReactNode;
}

// Banner de mensaje visible e inline (nunca un error silencioso). Se usa para errores de
// carga/guardado, advertencias de restauracion de backups, y confirmaciones de exito.
export default function Banner({ kind = 'info', children }: BannerProps): React.ReactElement {
  const icon = kind === 'error' ? '⚠️' : kind === 'warning' ? '⚠️' : kind === 'success' ? '✅' : 'ℹ️';
  return (
    <div className={`banner banner--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <span aria-hidden="true">{icon}</span>
      <div>{children}</div>
    </div>
  );
}

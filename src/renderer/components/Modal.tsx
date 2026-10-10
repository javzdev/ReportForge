import React, { useEffect, useRef } from 'react';
import './Modal.css';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'sm' | 'md' | 'lg';
}

// Modal accesible generico: foco inicial en el dialogo, Escape cierra, rol dialog/aria-modal,
// y clic en el overlay cierra (pero no clic dentro del contenido, para evitar cierres accidentales).
//
// Nota sobre formularios dentro del modal: el `footer` se renderiza en un contenedor
// hermano de `children` (modal-body), no anidado dentro de el. Si un modal pone un <form>
// en `children` y un boton de submit en `footer`, ese boton debe usar
// `type="submit" form="<id-del-form>"` (atributo HTML estandar) para que el navegador lo
// asocie con el formulario correcto -- incluyendo que presionar Enter en un input del
// formulario tambien dispare ese submit. Sin el atributo `form`, el boton del footer solo
// funcionaria via onClick y Enter en el formulario no haria nada.
export default function Modal({ title, onClose, children, footer, width = 'md' }: ModalProps): React.ReactElement {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`modal-dialog modal-dialog--${width}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        ref={dialogRef}
      >
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">
            {title}
          </h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useRouter } from '../lib/router';
import { getErrorMessage } from '../lib/errors';
import Button from '../components/Button';
import Banner from '../components/Banner';
import Spinner from '../components/Spinner';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../hooks/useToast';

interface AppInfo {
  version: string;
  userDataPath: string;
  evidencePath: string;
}

// Pagina de Privacidad y Almacenamiento: informacion honesta sobre donde viven los datos y
// que proteccion (o falta de ella) tienen. No se minimiza el hecho de que no hay cifrado:
// es information de seguridad relevante para el usuario de esta herramienta.
export default function PrivacyPage(): React.ReactElement {
  const { navigate } = useRouter();
  const { showToast } = useToast();

  const [info, setInfo] = useState<AppInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    window.reportForge.app
      .getInfo()
      .then(setInfo)
      .catch((err) => setError(getErrorMessage(err, 'No se pudo obtener la informacion de la aplicacion.')));
  }, []);

  async function handleDeleteAllData(): Promise<void> {
    setDeleting(true);
    setDeleteError(null);
    try {
      await window.reportForge.app.deleteAllData();
      setShowDeleteConfirm(false);
      showToast('success', 'Todos los datos fueron eliminados.');
      navigate({ name: 'dashboard' });
    } catch (err) {
      setDeleteError(getErrorMessage(err, 'No se pudieron eliminar los datos.'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="page">
      <button type="button" className="btn btn--ghost btn--sm" style={{ marginBottom: 12, paddingLeft: 0 }} onClick={() => navigate({ name: 'settings' })}>
        ← Configuracion
      </button>

      <div className="page-header">
        <div>
          <h1 className="page-title">Privacidad y almacenamiento</h1>
          <p className="page-subtitle">Como y donde se guardan tus datos en este equipo.</p>
        </div>
      </div>

      {error && <Banner kind="error">{error}</Banner>}

      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginTop: 0 }}>Donde viven tus datos</h2>
        {info === null ? (
          <Spinner label="Cargando..." />
        ) : (
          <table className="table">
            <tbody>
              <tr>
                <th>Version de la aplicacion</th>
                <td>{info.version}</td>
              </tr>
              <tr>
                <th>Carpeta de datos (base de datos y configuracion)</th>
                <td style={{ wordBreak: 'break-all' }}>{info.userDataPath}</td>
              </tr>
              <tr>
                <th>Carpeta de evidencias</th>
                <td style={{ wordBreak: 'break-all' }}>{info.evidencePath}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginTop: 0 }}>Como funciona esta aplicacion</h2>
        <ul style={{ lineHeight: 1.7, paddingLeft: 20 }}>
          <li>Todo se guarda unicamente en este equipo, en la carpeta indicada arriba.</li>
          <li>No hay conexion a internet, cuentas de usuario, sincronizacion ni telemetria de ningun tipo.</li>
          <li>No se envia ninguna informacion a servidores externos ni a servicios de inteligencia artificial.</li>
          <li>El cierre o desinstalacion de la aplicacion no borra tus datos automaticamente; usa el boton de abajo si quieres eliminarlos.</li>
        </ul>

        <Banner kind="warning">
          <strong>Los datos y los respaldos NO estan cifrados en esta version.</strong> Cualquier persona con acceso a este
          equipo, o a un archivo de respaldo que generes, puede leer su contenido directamente. Protege el acceso a tu
          dispositivo (bloqueo de sesion, cifrado de disco del sistema operativo) y a los archivos de respaldo que generes,
          ya que pueden contener informacion confidencial de tus clientes.
        </Banner>
      </div>

      <div className="card" style={{ borderColor: 'var(--color-danger)' }}>
        <h2 style={{ marginTop: 0, color: 'var(--color-danger)' }}>Eliminar todos los datos</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Borra permanentemente todos los proyectos, reportes, hallazgos, plantillas personalizadas y archivos de evidencia
          guardados en este equipo. Las plantillas incorporadas se recrean automaticamente. Esta accion no se puede
          deshacer y no genera un respaldo previo: crea uno manualmente antes si lo necesitas.
        </p>
        {deleteError && <Banner kind="error">{deleteError}</Banner>}
        <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
          Eliminar todos los datos
        </Button>
      </div>

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Eliminar todos los datos"
          message={
            <>
              <p>
                Estas a punto de eliminar <strong>todos</strong> los proyectos, reportes, hallazgos, plantillas
                personalizadas y evidencias guardadas en este equipo. No hay forma de deshacer esta accion.
              </p>
            </>
          }
          confirmLabel="Eliminar todo permanentemente"
          requireTypedText="ELIMINAR"
          busy={deleting}
          onConfirm={handleDeleteAllData}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setDeleteError(null);
          }}
        />
      )}
    </div>
  );
}

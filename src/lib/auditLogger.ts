// src/lib/auditLogger.ts
import { auth, db } from './firebase';
import { collection, addDoc, getDocs, doc, getDoc } from 'firebase/firestore';
import { AuditLog } from '@/types';

export const registrarAccionAuditoria = async (
  modulo: string,
  accion: string,
  detalle: string
) => {
  try {
    const ahora = new Date();
    const fechaHoraISO = ahora.toISOString();
    const fechaLegible = ahora.toLocaleString('es-CL', {
      dateStyle: 'short',
      timeStyle: 'medium',
    });

    let usuarioEmail = 'usuario_anonimo@futbian.pro';
    let usuarioRol = 'hincha';

    const currentUser = auth.currentUser;
    if (currentUser) {
      usuarioEmail = currentUser.email || currentUser.uid;
      try {
        const snap = await getDoc(doc(db, 'users', currentUser.uid));
        if (snap.exists()) {
          usuarioRol = snap.data().rol || 'hincha';
        }
      } catch {
        // Continúa si está offline
      }
    }

    const nuevoLog: AuditLog = {
      fechaHoraISO,
      fechaLegible,
      usuarioEmail,
      usuarioRol,
      modulo,
      accion,
      detalle,
    };

    // Guardar en localStorage como respaldo inmediato en el cliente
    if (typeof window !== 'undefined') {
      const prev = JSON.parse(
        localStorage.getItem('futbian_audit_logs') || '[]'
      );
      prev.unshift(nuevoLog);
      localStorage.setItem(
        'futbian_audit_logs',
        JSON.stringify(prev.slice(0, 500))
      );
    }

    // Guardar en Cloud Firestore
    await addDoc(collection(db, 'auditoria_acciones'), nuevoLog);
  } catch (error) {
    console.error('Error registrando log de auditoría:', error);
  }
};

export const descargarArchivoAuditoria = async () => {
  try {
    const snap = await getDocs(collection(db, 'auditoria_acciones'));
    const logs: AuditLog[] = snap.docs.map((d) => d.data() as AuditLog);

    logs.sort((a, b) => b.fechaHoraISO.localeCompare(a.fechaHoraISO));

    const lineasTexto = [
      '================================================================================',
      'REGISTRO OFICIAL DE AUDITORÍA DE ACCIONES - SISTEMA WEB FUTBIAN.PRO',
      `Generado el: ${new Date().toLocaleString('es-CL')}`,
      '================================================================================\n',
      ...logs.map(
        (l) =>
          `[${l.fechaLegible}] | USUARIO: ${l.usuarioEmail} (${l.usuarioRol.toUpperCase()}) | MÓDULO: ${l.modulo} | ACCIÓN: ${l.accion} | DETALLE: ${l.detalle}`
      ),
    ].join('\n');

    const blob = new Blob([lineasTexto], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `bitacora_auditoria_futbian_${new Date().toISOString().slice(0, 10)}.txt`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error descargando archivo de auditoría:', error);
  }
};
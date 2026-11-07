import { openDB, DBSchema } from 'idb';
import { ActaPartido } from '@/types';
import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

interface FutbianDB extends DBSchema {
  actas: {
    key: string;
    value: ActaPartido;
  };
  outbox: {
    key: string;
    value: { id: string; payload: ActaPartido; timestamp: number };
  };
}

export const getLocalDB = async () => {
  return openDB<FutbianDB>('futbian-offline-db', 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('actas')) {
        database.createObjectStore('actas', { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains('outbox')) {
        database.createObjectStore('outbox', { keyPath: 'id' });
      }
    },
  });
};

export const guardarActaOfflineFirst = async (acta: ActaPartido) => {
  const localDb = await getLocalDB();
  await localDb.put('actas', acta);
  await localDb.put('outbox', { id: acta.id, payload: acta, timestamp: Date.now() });

  if (typeof window !== 'undefined' && navigator.onLine) {
    await sincronizarOutboxConFirestore();
  }
};

export const sincronizarOutboxConFirestore = async () => {
  if (typeof window === 'undefined' || !navigator.onLine) return;
  const localDb = await getLocalDB();
  const pendientes = await localDb.getAll('outbox');

  for (const item of pendientes) {
    try {
      const ref = doc(db, 'partidos', item.id);
      const actaSincronizada: ActaPartido = { ...item.payload, sincronizado: true };
      await setDoc(ref, actaSincronizada, { merge: true });
      await localDb.put('actas', actaSincronizada);
      await localDb.delete('outbox', item.id);
    } catch (error) {
      console.error('Sin señal estable, el acta permanece protegida en Outbox local:', error);
    }
  }
};
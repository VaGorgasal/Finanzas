/** Captura también el bloqueo del acceso a localStorage (p. ej. modo privado). */
export function persistJson(getStorage: () => Pick<Storage, 'setItem'>, key: string, value: unknown): boolean {
  try {
    getStorage().setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

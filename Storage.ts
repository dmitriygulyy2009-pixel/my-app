// Обёртка над localStorage. Позже можно заменить на Capacitor Preferences / облако.
export const Storage = {
  get best(): number { return Number(localStorage.getItem('nj_best') || 0); },
  set best(v: number) { localStorage.setItem('nj_best', String(v)); }
};

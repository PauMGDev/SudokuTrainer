'use client';

import { useEffect } from 'react';

/**
 * Borra la query de la barra de direcciones al llegar desde un enlace antiguo.
 *
 * Las partidas vivían en `/?difficulty=hard&seed=12` y ahora viven en
 * `/hard/12`. La redirección funciona, pero tanto Next como Vercel arrastran
 * la query original al destino —no hay forma de desactivarlo— y la URL acaba
 * en `/hard/12?difficulty=hard&seed=12`, con la parte vieja pegada detrás.
 *
 * `replaceState` la quita sin navegar ni añadir una entrada al historial: no
 * hay petición, no hay parpadeo y el botón de atrás sigue llevando donde debe.
 * Si el JavaScript no llega a ejecutarse, la página funciona igual — la ruta
 * ya no mira la query para nada.
 */
export function StripQuery() {
  useEffect(() => {
    if (window.location.search === '') return;
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  return null;
}

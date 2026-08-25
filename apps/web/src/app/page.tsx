/**
 * La portada. Un tablero fácil, el mismo siempre, prerenderizado en el build.
 *
 * Antes la partida vivía aquí y salía de `searchParams`, lo que obligaba a
 * ejecutar una función en cada visita: leer la query hace dinámica toda la
 * ruta. En agosto de 2026 el rastreador de Meta pidió esta página 171 veces
 * por minuto, y cada petición se pagó en CPU hasta agotar la cuota del plan y
 * dejar la cuenta entera parada.
 *
 * Ahora la partida vive en `/[difficulty]/[seed]`, donde el nivel y la semilla
 * son parte de la ruta y por tanto se pueden cachear por URL. Esta página es
 * un archivo estático servido desde la red: pedirla mil veces por minuto no
 * cuesta CPU, que es la única defensa que no depende de la buena fe de quien
 * pide.
 */

import { BoardPage } from '../components/BoardPage';

export default function Page() {
  return <BoardPage difficulty="easy" seed={0} />;
}

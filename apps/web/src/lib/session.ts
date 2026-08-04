/**
 * Sesión anónima: un UUID en una cookie, nada más.
 *
 * Se lee de la cabecera y se escribe con `Set-Cookie` en vez de usar `cookies()`
 * de `next/headers`: aquello exige el contexto de petición de Next y volvería
 * la route imposible de probar llamándola como una función normal. Aquí no hace
 * falta nada de Next, así que no se usa nada de Next.
 */

const COOKIE_NAME = 'sid';
const ONE_YEAR = 365 * 24 * 60 * 60;

/** El identificador de sesión que trae la petición, o `null` si es la primera. */
export function readSessionId(request: Request): string | null {
  const header = request.headers.get('cookie');
  if (header === null) return null;

  for (const part of header.split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === COOKIE_NAME && value.length > 0) return decodeURIComponent(value.join('='));
  }
  return null;
}

export function newSessionId(): string {
  return crypto.randomUUID();
}

/**
 * La cookie de sesión. `httpOnly` porque el cliente no tiene nada que hacer con
 * ella, y `sameSite=lax` porque nadie debería poder gastar tu cuota desde otro
 * sitio. `secure` solo en producción: en `localhost` no hay HTTPS.
 */
export function sessionCookie(sessionId: string): string {
  const attributes = [
    `${COOKIE_NAME}=${sessionId}`,
    'Path=/',
    `Max-Age=${ONE_YEAR}`,
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (process.env.NODE_ENV === 'production') attributes.push('Secure');
  return attributes.join('; ');
}

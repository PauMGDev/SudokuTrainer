import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import type { NextConfig } from 'next';

/**
 * Next solo carga el `.env` del directorio de la app, pero en este monorepo el
 * `.env` vive en la raíz (una sola copia para engine, web y el CLI de Prisma).
 * Sin esta línea, `ANTHROPIC_API_KEY` y `DATABASE_URL` no existen en `next dev`
 * y la app se degrada en silencio: explicación de reserva y caché caída.
 */
config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

/**
 * Las partidas vivían en `/?difficulty=hard&seed=12` y ahora viven en
 * `/hard/12`. Los enlaces antiguos —los que alguien se guardó o compartió—
 * siguen funcionando por aquí. Es una redirección de configuración, así que la
 * resuelve la red sin ejecutar nada.
 *
 * Temporal (307) y no permanente: si algún día la ruta vuelve a cambiar, un 308
 * cacheado en el navegador de quien lo visitó se queda pegado durante meses.
 */
const LEVEL = '(?<difficulty>easy|medium|hard)';
const SEED = '(?<seed>[0-9]{1,10})';

const nextConfig: NextConfig = {
  // El engine se publica como TypeScript sin compilar (`exports` apunta a src/index.ts),
  // así que Next tiene que transpilarlo él mismo.
  transpilePackages: ['engine'],

  async redirects() {
    return [
      {
        source: '/',
        has: [
          { type: 'query', key: 'difficulty', value: LEVEL },
          { type: 'query', key: 'seed', value: SEED },
        ],
        destination: '/:difficulty/:seed',
        permanent: false,
      },
      {
        source: '/',
        has: [{ type: 'query', key: 'difficulty', value: LEVEL }],
        destination: '/:difficulty/0',
        permanent: false,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          /**
           * Reserva de derechos para minería de textos y datos, según el
           * protocolo TDMRep del W3C. La Directiva (UE) 2019/790 permite la
           * minería con fines comerciales salvo que el titular la reserve "de
           * manera expresa y legible por máquina": esta cabecera y el
           * `/.well-known/tdmrep.json` son esa reserva. El `robots.txt` dice lo
           * mismo en el idioma de los rastreadores; esto lo dice en el de los
           * abogados.
           */
          { key: 'TDM-Reservation', value: '1' },
        ],
      },
    ];
  },
};

export default nextConfig;

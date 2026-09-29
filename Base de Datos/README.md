# Kalory · Base de Datos online

Carpeta con todo lo necesario para que **cualquier persona con la app** inicie sesión
contra una base de datos central en internet, además del modo local (SQLite en cada equipo).

```
Base de Datos/
├── server/
│   ├── index.js      → API online (Express + SQLite + JWT + login con Google)
│   ├── admin.html    → Panel gráfico: usuarios registrados e información
│   ├── package.json
│   └── data/         → se crea solo: kalory-online.db (archivo de datos)
├── schema.sql            → esquema SQLite (referencia y app local)
├── postgres-schema.sql   → esquema para migrar cuando se agote SQLite
├── Dockerfile + docker-compose.yml
├── .env.example
└── README.md (este archivo)
```

## 1. Cómo funciona el modo online

1. Este servidor expone una API (`/api/...`) y el panel (`/admin`).
2. En la app (pantalla de inicio → **Servidor en línea**) se pega la dirección,
   por ejemplo `http://tu-servidor:3001`. La app verifica `/api/health` y cambia a modo online.
3. Desde entonces, registro, login (local o Google), perfil, diario y medallas
   viajan a la base central con token JWT. Cada cuenta ve **solo sus datos**.
4. Sin URL configurada, la app sigue en modo local (SQLite del equipo, offline).

## 2. Puertos y firewall

- Puerto por defecto: **3001** (variable `PORT`). Abrirlo donde se hospede:
  - Windows: `netsh advfirewall firewall add rule name="Kalory Server" dir=in action=allow protocol=TCP localport=3001`
  - Linux (ufw): `sudo ufw allow 3001/tcp`
- En producción se recomienda un proxy inverso con HTTPS (Nginx/Caddy) delante
  y exponer solo 443. La app acepta `https://...` igual que `http://...`.

## 3. Puesta en marcha

**Local (pruebas):**
```bash
cd "Base de Datos/server"
npm install
set ADMIN_TOKEN=tu-clave & set JWT_SECRET=texto-largo & node index.js
```
Panel: http://localhost:3001/admin · Salud: http://localhost:3001/api/health

**Docker (VPS propio):**
```bash
cd "Base de Datos"
# crea un .env a partir de .env.example con tus secretos
docker compose up -d --build
```

**Nube (Railway / Render / similar):** sube esta carpeta, define las variables
`JWT_SECRET`, `ADMIN_TOKEN`, `GOOGLE_CLIENT_ID` y el puerto que te asignen.
Usa un volumen persistente para `/srv/data` o se pierden los datos al redesplegar.

> ⚠️ Cambia `JWT_SECRET` y `ADMIN_TOKEN` en producción. Con los valores de
> ejemplo cualquiera podría administrar el servidor.

## 4. Capacidad: ¿cuántos usuarios aguanta?

El servidor guarda todo en **un archivo SQLite** (`data/kalory-online.db`).
Límites teóricos de SQLite: 281 TB por base y hasta 2⁶⁴ filas — en la práctica
mandan la **RAM** (sql.js carga la base completa en memoria) y que las
escrituras se atienden en serie.

Consumo típico por usuario:
| Dato | Tamaño aprox. |
|---|---|
| Cuenta + perfil + metas | ~2 KB (una vez) |
| Día activo (5 comidas + agua + ejercicios) | ~2.5 KB/día |
| 1 usuario activo 1 año | ~1 MB/año |

| Escala | Archivo aprox. | Estado |
|---|---|---|
| 100 usuarios | ~10–100 MB | ✅ sobrado |
| 1.000 usuarios | ~0.1–1 GB | ✅ cómodo |
| **~10.000 usuarios** | ~1–10 GB | ✅ **máximo recomendado en SQLite** |
| 100.000+ | decenas de GB en RAM | ❌ migrar a PostgreSQL |

**Respuesta corta: hasta ~10.000 cuentas en esta configuración.**
Miles de usuarios concurrentes no son problema (cada petición tarda
milisegundos y el uso real son unas pocas escrituras por persona al día);
el techo lo pone la memoria RAM del servidor.

**Para más:** usa `postgres-schema.sql` (mismo modelo en PostgreSQL) y cambia
la capa de datos: con Postgres el límite pasa a ser tu disco/servidor,
es decir, **cientos de miles a millones de usuarios**.

## 5. Panel de administración

Abre `http://tu-servidor:3001/admin`, introduce tu `ADMIN_TOKEN` y verás:
tarjetas (usuarios, comidas, medallas), tabla de registrados (acceso, perfil,
actividad) y detalle por usuario (perfil completo, metas, últimas comidas,
medallas). Todo con los colores de Kalory (esmeralda + fuego sobre oscuro).

# Kalory · Base de Datos online

Carpeta con todo lo necesario para que **cualquier persona con la app** inicie sesión
contra una base de datos central en internet, además del modo local (SQLite en cada equipo).

```
Base de Datos/
├── server/
│   ├── index.js        → API online (Express + PostgreSQL + JWT + login con Google)
│   ├── db.js           → conexión y esquema PostgreSQL (se crea solo, idempotente)
│   ├── import-sqlite.js→ migra un kalory-online.db viejo a PostgreSQL (idempotente)
│   ├── admin.html      → Panel gráfico: usuarios registrados e información
│   ├── package.json
│   └── data/           → SOLO SQLite local antigua (kalory-online.db) + backups .bak
├── schema.sql            → esquema SQLite histórico (referencia)
├── postgres-schema.sql   → copia del esquema PostgreSQL (referencia; lo crea db.js)
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

- Puerto por defecto: **3001** (variable `PORT`). En Render se asigna solo (respeta `PORT`).
- En producción Render da HTTPS automáticamente; para un VPS propio se recomienda un proxy inverso con HTTPS (Nginx/Caddy) delante y exponer solo 443.

## 3. Puesta en marcha

**Configuración (una vez):** los datos viven en un **PostgreSQL externo y gratuito (Neon)**.
Render/Docker NO guarda nada en disco — por eso la base nunca se pierde al reiniciar:

1. Crea una cuenta gratis en https://neon.tech → **New Project** → región la más cercana.
2. Copia la **Connection string** (formato `postgresql://usuario:clave@ep-xxxx.neon.tech/…?sslmode=require`).
3. Defínela como `DATABASE_URL` en el entorno del servidor (ver tabla abajo).

**Local (pruebas):**
```bash
cd "Base de Datos/server"
npm install
set DATABASE_URL=postgresql://... & set JWT_SECRET=texto-largo & set ADMIN_TOKEN=tu-clave & node index.js
```
Panel: http://localhost:3001/admin · Salud: http://localhost:3001/api/health

**Nube (Render — producción, plan FREE funciona):**
1. Render → New Web Service desde el repo (o toma el `render.yaml` de la raíz, que ya trae `plan: free` y healthcheck `/api/health`).
2. **Environment**: `DATABASE_URL` = la cadena de Neon (marcar "sync:false" / secreto), más `JWT_SECRET`, `ADMIN_TOKEN`, `GOOGLE_*`, `OPENROUTER_API_KEY`.
3. Desplegar. Primera vez: la base queda creada sola (tablas idempotentes en `db.js`).
4. **Importar la base SQLite antigua** (si quieres conservar las cuentas locales ya creadas):
   ```bash
   cd "Base de Datos/server"
   DATABASE_URL=postgresql://... node import-sqlite.js    # usa data/kalory-online.db por defecto
   ```
   Es idempotente: se puede repetir sin duplicados. Conserva los ids de usuario,
   así los JWT antiguos siguen valiendo con el mismo `JWT_SECRET`.
5. Si alguna vez migras de servidor, basta con cambiar `DATABASE_URL`: la app no depende del host.

> ⚠️ JWT_SECRET es la llave de todas las sesiones: fijo en producción. Si cambia,
> todos los usuarios deben entrar de nuevo (los datos NO se pierden — siguen en Neon).
> ⚠️ Desde 1.6.1 `JWT_SECRET` y `ADMIN_TOKEN` son OBLIGATORIOS: el servidor no arranca sin ellos.
> ⚠️ No existe `DATA_FILE`: si la ruta del archivo vuelve a aparecer, el servidor lo ignora.

**Nota:** el plan free de Render duerme tras ~15 min sin tráfico y tarda ~30–60 s
en despertar. No pierde datos (todo está en Neon); solo es una espera inicial.
Si quieres evitarla, un ping externo (p. ej. UptimeRobot → `/api/health`) lo mantiene despierto.

## 4. Capacidad: ¿cuántos usuarios aguanta?

Los datos están en **PostgreSQL (Neon)**: almacenamiento gestionado, plan gratuito
≈0.5 GB (decenas de miles de cuentas: ~1 MB por usuario activo al año).
~10.000 cuentas activas ≈ 10 GB o menos — pasar al plan de pago de Neon cuando
se necesite; sin cambios de código.

## 5. Panel de administración

Abre `http://tu-servidor:3001/admin`, introduce tu `ADMIN_TOKEN` y verás:
tarjetas (usuarios, comidas, medallas), tabla de registrados (acceso, perfil,
actividad) y detalle por usuario (perfil completo, metas, últimas comidas,
medallas). Todo con los colores de Kalory (esmeralda + fuego sobre oscuro).

# Backups de PostgreSQL

Carpeta de respaldo para migrar la BD `constructora` entre máquinas.

## Generar un dump (máquina de origen)

```bash
# Desde la raíz del repo, ajustá la ruta a pg_dump si hace falta
PGPASSWORD=12345 "/d/Archivos de programa/PostgreSQL/18/bin/pg_dump.exe" \
  -h localhost -p 5432 -U postgres -d constructora \
  -Fc --no-owner --no-privileges \
  --exclude-table-data=public.users \
  --exclude-table-data=public.activity_logs \
  --exclude-table-data=public.notifications \
  -f backend/prisma/backups/constructora_YYYY-MM-DD.dump
```

Flags clave:
- `-Fc` formato custom (comprimido).
- `--no-owner --no-privileges` no pide los mismos roles en destino.
- `--exclude-table-data=...` excluye datos de tablas con info sensible
  (estructura queda — se recarga vacía y luego se llena con el seed).

Por defecto los `*.dump` están en `.gitignore`. Si querés versionar **un**
backup específico, usá `git add -f`.

## Restaurar en otra máquina

> Prerrequisito: PostgreSQL ≥ 17 instalado en destino. `pg_restore.exe` suele
> vivir en `C:\Program Files\PostgreSQL\<versión>\bin\` (o `/d/Archivos de programa/PostgreSQL/<versión>/bin/` con git-bash).

### 1) Crear la BD vacía

```bash
PGPASSWORD=<tu_password> psql -h localhost -U postgres -c "CREATE DATABASE constructora;"
```

Si ya existe y querés tirarla:
```bash
PGPASSWORD=<tu_password> psql -h localhost -U postgres \
  -c "DROP DATABASE IF EXISTS constructora; CREATE DATABASE constructora;"
```

### 2) Configurar `.env` del backend

`backend/.env` debe contener algo como:

```
DATABASE_URL="postgresql://postgres:<tu_password>@localhost:5432/constructora?schema=public"
```

### 3) Restaurar el dump

```bash
PGPASSWORD=<tu_password> pg_restore \
  -h localhost -p 5432 -U postgres -d constructora \
  --no-owner --no-privileges \
  backend/prisma/backups/constructora_YYYY-MM-DD.dump
```

> Si ves warnings sobre `must be owner of extension plpgsql` o algún
> `comment on schema public` podés ignorarlos con seguridad.

### 4) Crear el usuario admin (los datos de `users` no vinieron en el dump)

```bash
cd backend
npm install        # si todavía no instalaste
npm run seed       # crea el usuario admin + datos seed
```

> Si `prisma/seed.ts` también limpia tablas, revisalo antes de correrlo en la
> BD recién restaurada para no perder el catálogo APU.

### 5) Verificar

```bash
PGPASSWORD=<tu_password> psql -h localhost -U postgres -d constructora -c \
  "SELECT (SELECT count(*) FROM materials) AS materials,
          (SELECT count(*) FROM apu_templates) AS apu_templates,
          (SELECT count(*) FROM contractors) AS contractors,
          (SELECT count(*) FROM users) AS users;"
```

Deberías ver los catálogos cargados y `users` con las filas que haya creado
el seed.

## Qué incluye el último dump

`constructora_2026-05-14.dump` (151 KB) — generado tras:

- Importación del Excel maestro (329 materiales, 200 plantillas APU, 901
  líneas de material en plantillas + 178 de mano de obra)
- Merge "cemento tipo 1" → "Cemento Cecon"
- Reset de proyectos (0 proyectos al momento del dump)

Tablas con datos:
- `materials`, `apu_templates`, `apu_template_materials`, `apu_template_labor`
- `contractors` (6)

Tablas con **solo estructura** (datos excluidos):
- `users`, `activity_logs`, `notifications` (info sensible — recargar con seed)

Tablas vacías por reset previo:
- `projects`, `categories`, `budget_items`, `budget_item_materials`,
  `budget_item_labor`, `payments`, `progress_entries`, `certificates`,
  `certificate_items`, `contractor_assignments`, `project_contractors`,
  `project_members`, `budget_summaries`, `attachments`, `client_payments`,
  `project_expenses`, `purchases`

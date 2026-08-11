# Archived Teams Module (Equipos)

## Historial y Contexto
El módulo de "Equipos" fue diseñado originalmente para organizar a los miembros de la iglesia en subgrupos (ej. "Banda Principal", "Coro Juvenil"). Los servicios (Services) tenían una llave foránea `team_id` opcional para indicar qué equipo estaba encargado de dicho servicio.

A petición del usuario, todo el concepto de "Equipos" fue removido de la aplicación para simplificar el flujo, dejando únicamente roles a nivel global por iglesia y asignaciones directas por servicio.

## Base de Datos (Esquema Original)

### Tabla `teams`
- `id`: UUID (Primary Key)
- `church_id`: UUID (Foreign Key a `churches.id`)
- `name`: TEXT
- `created_at`: TIMESTAMPTZ

### Tabla `team_members`
- `id`: UUID (Primary Key)
- `team_id`: UUID (Foreign Key a `teams.id`)
- `membership_id`: UUID (Foreign Key a `church_memberships.id`)
- `created_at`: TIMESTAMPTZ

### Relación con `services`
- La tabla `services` contaba con la columna `team_id` (Foreign Key a `teams.id`), la cual fue removida.

## Frontend (Componentes Eliminados)
La carpeta `src/features/teams` contenía:
- `TeamList.tsx`, `TeamCard.tsx`: Vistas para listar los equipos.
- `TeamDetailPage.tsx`: Vista detallada de un equipo.
- `TeamForm.tsx`: Formulario de creación/edición de un equipo.
- `TeamMembers.tsx`: Componente para administrar qué miembros pertenecían al equipo.
- `PeopleList.tsx`, `PersonCard.tsx`: Listas auxiliares que mostraban personas a agregar al equipo.
*(Nota: `ProfileForm.tsx` fue rescatado de esta carpeta y movido a `src/features/people/ProfilePage.tsx` ya que era el perfil global del usuario, no un componente exclusivo de equipos).*

El servicio encargado de la conexión con Supabase era `src/services/teamService.ts`.

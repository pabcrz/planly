# SelahPlan

Plataforma para organizar la planificación musical de una iglesia desde una sola base de datos: canciones, letras, acordes, versiones, equipos, servicios y setlists.

SelahPlan busca reemplazar la duplicación manual entre equipos y ofrecer una experiencia cómoda tanto para quienes administran la música como para quienes consultan letras y listas desde un teléfono.

## Objetivo

- Centralizar el catálogo de canciones.
- Mantener letras y acordes confiables en formato ChordPro.
- Transportar acordes a distintas tonalidades.
- Gestionar diferentes versiones de una misma canción.
- Crear servicios y asignarles un equipo.
- Preparar setlists usando un catálogo compartido.
- Consultar letras, acordes y referencias desde el setlist.
- Publicar listas y letras para la iglesia sin exigir una cuenta.
- Ofrecer una experiencia mobile-first, especialmente en teléfonos y tablets.

## Contexto inicial

- Servicios los jueves, viernes y domingos.
- Los domingos pueden existir servicios por la mañana y por la tarde.
- Dos equipos de aproximadamente 20 personas en total.
- Ambos equipos comparten el catálogo, pero conservan su propio historial de uso.
- En reuniones sin proyector, las letras deben poder consultarse cómodamente desde un teléfono.

## MVP

### Canciones

- Título.
- Autor o intérprete.
- Tempo.
- Etiquetas o categorías.
- Enlaces de referencia a YouTube, YouTube Music o Spotify.
- Una o más versiones.
- Historial de uso por equipo.

### Versiones

Una canción puede tener distintas versiones o arreglos. Cada versión puede definir:

- Nombre de la versión.
- Tonalidad original o base.
- Tonalidades utilizadas por cada equipo.
- Contenido ChordPro.
- Enlace de referencia.
- Notas musicales o de interpretación.

### Letras y acordes

- ChordPro como formato canónico desde el inicio.
- Vista de letra sin acordes.
- Vista de letra con acordes.
- Transposición a otra tonalidad sin modificar el contenido original.
- Modo de lectura mediante scroll.
- Base preparada para una futura vista por diapositivas.

La IA no forma parte del producto en esta etapa. Puede utilizarse externamente para ayudar a convertir contenido a ChordPro, pero el resultado debe revisarse antes de guardarlo.

### Equipos y personas

- Equipos musicales independientes usando el mismo catálogo.
- Personas con nombre e instrumentos o funciones.
- Roles musicales personalizables, por ejemplo:
  - Vocalista.
  - Guitarra acústica.
  - Guitarra eléctrica.
  - Piano.
  - Bajo.
  - Batería.
  - Líder.
  - Pastor.
- Roles de acceso a la aplicación:
  - Administrador.
  - Editor.
  - Lector.

### Servicios y setlists

- Crear servicios por fecha y horario.
- Asignar un equipo a cada servicio.
- Agregar canciones desde el catálogo compartido.
- Seleccionar la versión y tonalidad que se utilizarán.
- Ordenar las canciones.
- Agregar notas generales o por canción.
- Consultar el último uso de una canción por equipo.
- Generar una vista pública del setlist.

### Acceso público

- Enlaces públicos de solo lectura.
- Vista del setlist.
- Vista de letras optimizada para teléfonos.
- Sin acceso a funciones administrativas.

## Fuera del MVP

- IA integrada para importar o corregir canciones.
- Gestión de licencias musicales.
- Aplicaciones nativas para Android o iOS.
- Presentación avanzada tipo software de proyección.
- Reproducción o sincronización directa con plataformas musicales.
- Notificaciones y confirmación de asistencia.

## Stack tecnológico

### Aplicación

- React.
- Vite.
- TypeScript.
- React Router.
- TanStack Query.
- Tailwind CSS.
- Zod.
- PWA para instalación y uso cómodo en teléfonos y tablets.

### Backend

- Supabase.
- PostgreSQL.
- Supabase Auth.
- Supabase Storage cuando sea necesario.
- Row Level Security para proteger los datos por organización y rol.

Para el MVP no es necesario crear un backend independiente. La aplicación debe acceder a Supabase mediante una capa de servicios, nunca directamente desde los componentes.

## Arquitectura propuesta

```text
src/
├── app/
│   ├── providers/
│   ├── router/
│   └── layouts/
├── components/
│   ├── ui/
│   └── shared/
├── features/
│   ├── auth/
│   ├── songs/
│   ├── teams/
│   ├── people/
│   ├── services/
│   └── setlists/
├── lib/
│   ├── chordpro/
│   ├── transposition/
│   ├── supabase/
│   └── validation/
├── pages/
├── services/
├── types/
└── main.tsx
```

### Reglas de organización

- Los componentes muestran interfaz; no contienen consultas directas a Supabase.
- Cada dominio vive dentro de `features/`.
- Las consultas y mutaciones se concentran en `services/`.
- El procesamiento de ChordPro y la transposición son módulos independientes.
- Los esquemas de validación se comparten entre formularios y servicios.
- Las vistas públicas reutilizan los datos, pero tienen rutas y permisos separados.

## Modelo de datos inicial

```text
organizations
profiles
app_roles
music_roles
teams
team_members
songs
song_versions
team_song_settings
services
service_members
setlist_items
```

Relaciones principales:

- Una organización tiene equipos, personas, canciones y servicios.
- Una canción tiene una o más versiones.
- Una versión contiene la tonalidad base y el contenido ChordPro.
- `team_song_settings` conserva preferencias e historial específicos de cada equipo.
- Un servicio pertenece a un equipo.
- Un servicio contiene elementos ordenados en su setlist.
- Cada elemento del setlist referencia una canción, una versión y la tonalidad elegida.

## Seguridad

- Autenticación para las vistas administrativas.
- RLS activa en las tablas con información privada.
- Los permisos deben validarse en la base de datos, no solo ocultarse en la interfaz.
- Las rutas públicas exponen únicamente la información necesaria.
- Los roles musicales y los roles de acceso son conceptos separados.

## Experiencia de usuario

- Diseño mobile-first.
- Controles grandes y legibles durante un servicio.
- Navegación rápida entre canciones del setlist.
- Ajuste de tamaño de texto.
- Alternar entre letra y acordes.
- Transposición accesible sin alterar la versión guardada.
- Interfaz sobria, clara y sin depender de una estética visual genérica.

## Inicio del proyecto

```bash
npm create vite@latest selah-plan -- --template react-ts
cd selah-plan
npm install
npm install react-router-dom @tanstack/react-query @supabase/supabase-js zod
```

Después se configuran Tailwind CSS y el soporte PWA de acuerdo con sus integraciones vigentes para Vite.

## Orden de implementación

1. Crear el proyecto con React, Vite y TypeScript.
2. Configurar estilos, rutas, proveedores y layout principal.
3. Crear el proyecto de Supabase y las variables de entorno.
4. Definir el esquema inicial y las políticas RLS.
5. Implementar autenticación, perfiles y roles.
6. Construir el catálogo de canciones y versiones.
7. Implementar el parser/renderizador de ChordPro.
8. Implementar la transposición de acordes.
9. Crear equipos, personas y asignaciones.
10. Crear servicios y setlists.
11. Construir las vistas públicas.
12. Añadir PWA y optimizar la experiencia en teléfono y tablet.

## Criterio de éxito del MVP

SelahPlan estará listo para una primera prueba real cuando sea posible:

1. Registrar canciones con sus versiones y cifrados.
2. Crear los dos equipos.
3. Crear un servicio y asignarle un equipo.
4. Preparar un setlist seleccionando versiones y tonalidades.
5. Consultar el setlist, las letras y los acordes desde un teléfono.
6. Compartir una vista pública de solo lectura.
7. Consultar el historial de uso sin duplicar canciones entre equipos.

## Posible evolución

Una vez validada la aplicación web, el paso lógico hacia Android es reutilizar el conocimiento y la lógica del proyecto en React Native con Expo. La PWA permite comprobar primero el uso real en dispositivos móviles sin asumir desde el inicio el costo de mantener una aplicación nativa.


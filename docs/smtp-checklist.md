# Checklist de SMTP para Planly

## Antes de habilitar invitaciones en producción

- [ ] Seleccionar y verificar un proveedor SMTP.
- [ ] Configurar el remitente con nombre `Planly` y una dirección verificada.
- [ ] Publicar y verificar SPF, DKIM y DMARC.
- [ ] Guardar host, usuario, contraseña y dirección remitente exclusivamente como secretos del entorno o del panel de Supabase; nunca en Git.
- [ ] Configurar la Site URL de producción y permitir las redirecciones de `/auth/invite`, recuperación y magic link.
- [ ] Cargar las plantillas de invitación, recuperación y magic link con los asuntos en español definidos en `supabase/templates`.
- [ ] Enviar y verificar una entrega de cada flujo; confirmar vencimiento y rechazo de reutilización de enlaces.
- [ ] Registrar el procedimiento de reversión: deshabilitar el envío de invitaciones y restaurar la plantilla anterior.

La falta de SMTP personalizado bloquea únicamente el envío de invitaciones en producción. El desarrollo local puede usar Mailpit y las demás entregas de producción no relacionadas pueden continuar.

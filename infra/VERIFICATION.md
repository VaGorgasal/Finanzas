# Verificación del proyecto Supabase de Brújula

Proyecto: cxukahuesgrhxvobmlqc, organización VaGorgasal's Org. Verificado el 30/10/2026 desde el panel autenticado por el propietario.

Se aplicó infra/schema.sql en un proyecto sin tablas de aplicación. public.user_backups tiene RLS y cuatro políticas de propiedad. private.service_usage no concede acceso directo a clientes. consume_service_quota solo permite ejecución a service_role.

Se ejecutó infra/verify_rls.sql dentro de una transacción revertida: un usuario vio únicamente su copia, pudo actualizarla y no pudo leer/actualizar/insertar la de otro; anon no pudo leer; authenticated no pudo invocar cuotas; la solicitud 11 de IA fue rechazada tras diez aceptadas. La consulta final confirmó cero copias, cero registros de cuota y cero usuarios de prueba restantes.

Security Advisor: cero errores y cero advertencias. Aviso informativo esperado: RLS Enabled No Policy en private.service_usage; la denegación directa es intencional y la función privilegiada es la única vía.

Pendiente: variables de Vercel, dominio estable para Site URL y redirect /cuenta, SMTP de producción y prueba real del enlace de acceso y copia entre dispositivos. La conexión MCP actual pertenece a otra organización y no tiene acceso a este proyecto. No se han leído ni copiado claves privadas.

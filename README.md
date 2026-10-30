# Brújula Financiera · V0.3

Aplicación Next.js para registrar inversiones, entender sus resultados y planificar objetivos. La cartera personal comienza vacía. No ejecuta órdenes ni se conecta a cuentas bancarias.

## Arranque y validación

Node 22 o superior. `npm ci`, `npm run test`, `npm run lint -- --max-warnings 0`, `npm run build`, `npm run typecheck`. `npm run start` abre el servidor compilado; `npm run dev` es para desarrollo. Dependencias fijadas y package-lock incluido.

## Funciones locales disponibles

- Inicio guiado con cuatro pasos, patrimonio del plan, efectivo registrado y fecha más antigua de las posiciones abiertas.
- Cartera separada en posiciones, operaciones, traspasos y efectivo, e importación/copias.
- Compras, ventas, dividendos y traspasos económicos entre fondos. Coste medio móvil, no fiscal FIFO. No se comprueba la elegibilidad al diferimiento fiscal ni periodos de liquidación.
- Resultado = valor actual + ventas netas + dividendos netos − compras con costes. Resultado/compras no es anualizado.
- TIR ACT/365 de inversiones: flujos de compras, ventas y dividendos, más valor final. Excluye efectivo sin invertir y traspasos. Solo se calcula con una fecha común de precios, sin operaciones posteriores, al menos 30 días y un patrón convencional de signos. No fuerza una raíz si puede haber varias.
- Historial de valoraciones guardadas expresamente. No se inventa una curva histórica, no es TWR y las aportaciones afectan al valor. Una corrección del libro no reescribe las valoraciones guardadas: revisarlas y volver a guardar las fechas afectadas.
- Plan con datos desconocidos distintos de cero, reserva, objetivos y presupuesto compartido. Los ingresos futuros inciertos no financian el escenario base.
- Simulador independiente de préstamo fijo y ahorro, con sensibilidad. TIN, no TAE; sin cuota final, seguros, impuestos o promesas de retorno.
- Conversión explícita de operaciones USD/GBP/CHF/JPY/CAD/AUD a base EUR: cambio en EUR por unidad de moneda, fuente y fecha. Conserva el original de las operaciones. Las valoraciones convertidas se guardan como manuales en EUR. No hay cuenta de efectivo multidivisa, FX automático, ni atribución separada del efecto divisa.
- Exposición subyacente por composición JSON declarada, con fecha y URL fuente. Agrega identificadores iguales y muestra cobertura parcial y solapamientos. No descarga ni inventa posiciones de fondos. Las acciones directas aportan su ISIN. Usar la misma emisión/identificador en las composiciones para conciliar.
- CSV estándar `date;isin;type;amount;units;fee`, o adaptador explícito para columnas equivalentes en español/inglés con coma o punto y coma. Fechas ISO o DD/MM/AAAA en adaptador. No adivina liquidaciones netas, signos, miles ni formatos específicos de bancos. Detecta reimportaciones y exige revisión de posibles duplicados con movimientos previos. Registrar productos antes de importar.
- Copia completa v2: cartera, efectivo, plan guardado, perfil, historial y composiciones. Admite copias completas v1. Validación previa y reversión de claves si falla el almacenamiento. Las conversaciones de IA no se guardan.
- Recuperación: un original local ilegible no se sobrescribe automáticamente. Se bloquean ediciones y se ofrece descargar el original para revisarlo e importar una copia válida.
- Asesor de reglas explicables, academia y FAQ. Contexto de mercado contiene casos educativos, no noticias de actualidad.

## Servicios preparados que requieren activación

Las pantallas Mi cuenta, Noticias y Consultas IA están implementadas. **Sin los servicios y secretos configurados, muestran su estado pendiente; no simulan éxito.**

### 1. Proyecto de datos exclusivo

Crear un proyecto Supabase propio de Brújula en la organización elegida por su propietario. No usar las bases de FantasyCopilot o GunZhot. Confirmar costes antes de contratar recursos.

Aplicar `infra/schema.sql` una vez mediante el SQL Editor o un flujo de migraciones del proyecto. Si se desea generar una migración, usar primero `supabase migration new` y copiar el SQL, sin inventar una entrada de historial. Revisar los avisores de seguridad antes de activar.

La tabla user_backups aplica RLS con auth.uid()=user_id en SELECT/INSERT/UPDATE/DELETE y no concede acceso anónimo. La subida comprueba una revisión para detectar conflictos; no hay mezcla ni sobrescritura automática. El usuario comprueba/sube/recupera expresamente su copia. Cerrar sesión conserva los datos locales: en equipos compartidos usar perfiles separados.

Configurar autenticación por enlace de correo y SMTP de producción. Permitir exactamente el dominio estable del alojamiento y la ruta /cuenta como destino. Introducir URL y clave publishable en NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Nunca exponer service_role en el cliente.

**Antes de activar:** dos cuentas distintas no deben poder leer ni escribir copias ajenas; cuenta anónima sin acceso; carga concurrente rechazada por conflicto; subida/recuperación/exportación verificadas. Este SQL no se ha ejecutado contra un proyecto remoto en esta entrega.

### 2. Cuotas y cotizaciones

SUPABASE_SERVICE_ROLE_KEY solo en el servidor. ENABLE_REMOTE_FEATURES=true activa el acceso a servicios únicamente si hay configuración de datos, sesión validada con getUser y cuota persistente disponible. Si falla la comprobación de cuota, no se llama al proveedor.

La función consume_service_quota solo es ejecutable por service_role. Límites UTC por usuario/global: market 15/15 llamadas diarias; news 10/10; ai 10/100. Son límites conservadores de solicitudes, no garantía del coste facturado por el proveedor; distintas APIs pueden consumir varias unidades. Revisarlos según el contrato antes de ampliar. Las consultas de IA que recuperan noticias consumen ambos presupuestos. Los reintentos fallidos también consumen cuota para limitar abuso. BETA_USER_IDS permite restringir los servicios a UUID autorizados. Configurar también presupuestos de gasto en el proveedor de IA.

EODHD_API_KEY nunca lleva NEXT_PUBLIC_. La búsqueda por ISIN acepta solo coincidencia exacta, EUR, precio positivo y fecha real. No es tiempo real: último cierre disponible. Guarda símbolo, fecha y fuente; actualizaciones por lote con vista previa, sin borrar valores por un error. La caché de cotizaciones sigue en memoria una hora; el límite de acceso adicional sí es persistente. No habilitar claves de mercado en una beta abierta sin confirmar derechos de uso.

### 3. Noticias reales

EODHD /api/news, con filtros de símbolo guardado de cartera o tema, fecha/hora y enlace original, limpieza y deduplicación. Configurar NEWS_LICENSE_CONFIRMED=true solo tras verificar que la suscripción permite mostrar e interpretar esos datos. El feed se consulta bajo demanda o cada 5 minutos en pestaña visible hasta agotar cuota. No se presenta como entrega instantánea ni se rellena con artículos de ejemplo. No hay alertas en segundo plano ni notificaciones push.

### 4. Consultas e interpretación de IA

SDK ai fijado a la versión del lockfile. Configurar AI_GATEWAY_MODEL con un ID vigente de https://ai-gateway.vercel.sh/v1/models. Autenticación OIDC en Vercel o AI_GATEWAY_API_KEY fuera de Vercel. Sin modelo/credenciales no se hace ninguna llamada. No se ha verificado una generación real sin estos servicios configurados.

La IA recibe la pregunta y, solo si el usuario activa contexto, nombres/ISIN, valores/fechas y resultados calculados del plan. No recibe credenciales ni el historial bruto. La selección es por consulta y está desactivada inicialmente. Informar al usuario de las políticas de tratamiento y retención del proveedor antes de un lanzamiento comercial.

Consultas generales no navegan: no deben afirmar actualidad. Consultas de noticias recuperan en servidor el último lote de EODHD y devuelven fuentes numeradas. Interpretar un artículo exige que su ID siga en el lote filtrado; no se aceptan contenidos o URLs del cliente como noticias verificadas. No se descargan destinos arbitrarios. La interpretación distingue hechos, lectura e incertidumbres; no verifica automáticamente el contenido de un editor ni sustituye asesoramiento. La recuperación cubre el lote del proveedor, no una búsqueda exhaustiva de Internet. Texto plano escapado por React, sin HTML del modelo.

Las respuestas usan maxOutputTokens=1400 y un timeout. No hay conversación persistente ni memoria entre preguntas. Revisar además los registros, presupuestos y política de retención en el proveedor.

## Despliegue y verificación

Repositorio VaGorgasal/Finanzas, framework Next.js, raíz ./, Node 22. Verificar GitHub Actions y el despliegue READY del commit antes de darlo por publicado. Un enlace de despliegue antiguo no cambia al hacer push: usar el dominio estable de producción o el nuevo despliegue del commit.

Antes de activar servicios, probar: inicio vacío, registro/edición/importación, cartera por vistas, exportar/restaurar v1 y v2, navegación móvil, FAQ, simulador, TIR con datos conocidos, recuperación local dañada y conflictos de nube. API sin sesión debe fallar sin consultar al proveedor; configurar dos cuentas para probar aislamiento y cuotas con el backend real.

Noindex no constituye protección. Para beta privada configurar Deployment Protection; para servicio público las APIs de pago usan sesión y cuota. No incluir claves, bases con datos reales ni archivos .env.local en Git. Copias personales nunca forman parte del código.

## Pendientes de alcance ampliado

Activación/provisión y verificación real de base de datos, correo, noticias y modelo; acceso del conector al equipo va-gorgasal para gestionar configuración; licencias y presupuesto. Importadores específicos requieren extractos anonimizados de cada intermediario. Composición automática requiere proveedor y cobertura por clase. Multidivisa completa, cotizaciones FX automáticas y atribución activo/divisa; TWR e histórico de precios verificable; fiscalidad FIFO; refinanciación, pignoración y cuota final requieren motores adicionales. La sincronización actual es explícita por copia con control de conflictos, no colaboración en tiempo real.

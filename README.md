# Brújula Financiera · V0.5

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

La tabla user_backups aplica RLS con auth.uid()=user_id en SELECT/INSERT/UPDATE/DELETE y no concede acceso anónimo. El perfil se carga al entrar y los cambios persistidos se sincronizan automáticamente con revisión para detectar conflictos. No se fusionan operaciones de versiones distintas. La caché local se separa por UUID; cambiar de cuenta remonta el estado y elimina la vista del usuario anterior. Un conflicto conserva la copia local y pide decidir la versión.

Configurar autenticación Email (email y contraseña) y SMTP de producción para confirmación y recuperación. Permitir exactamente el dominio estable del alojamiento y la ruta /cuenta como destino. Introducir URL y clave publishable en NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Nunca exponer service_role en el cliente.

**Antes de activar:** dos cuentas distintas no deben poder leer ni escribir copias ajenas; cuenta anónima sin acceso; carga concurrente rechazada por conflicto; subida/recuperación/exportación verificadas. El esquema se ha aplicado y verificado en cxukahuesgrhxvobmlqc. Consulta infra/VERIFICATION.md para las comprobaciones y los pasos de activación pendientes.

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

Activación/provisión y verificación real de base de datos, correo, noticias y modelo; acceso del conector al equipo va-gorgasal para gestionar configuración; licencias y presupuesto. Importadores específicos requieren extractos anonimizados de cada intermediario. Composición automática requiere proveedor y cobertura por clase. Multidivisa completa, cotizaciones FX automáticas y atribución activo/divisa; TWR e histórico de precios verificable; fiscalidad FIFO; refinanciación, pignoración y cuota final requieren motores adicionales. La sincronización es automática tras confirmar los formularios, con comprobación al recuperar el foco y cada 30 segundos en pestañas visibles. No es colaboración en tiempo real y detiene la subida ante un conflicto.


## Cuentas y perfil por usuario (V0.4)

Mi cuenta permite registro con signUp, acceso con signInWithPassword, recuperación con resetPasswordForEmail y creación/cambio de contraseña con updateUser. Contraseña nueva mínima de 12 caracteres y confirmación; no se registran credenciales ni se envían al repositorio. Supabase aplica además sus propias restricciones. La confirmación de correo y SMTP siguen siendo configuración del proyecto. Las cuentas creadas anteriormente por enlace pueden establecer una contraseña dentro de su sesión, o mediante recuperación, sin cambiar su UUID o email.

Con Supabase configurado, las pantallas financieras requieren sesión. El perfil completo se carga antes de mostrarlo. Las claves locales usan el UUID de cuenta; ninguna cuenta nueva incorpora los datos sin dueño del antiguo modo local. Estos originales se conservan sin modificar: migrarlos mediante un archivo JSON exportado e importado por su propietario. La caché no se cifra y no protege frente a alguien con acceso físico al perfil de navegador o sus herramientas de desarrollo.

El sincronizador guarda al segundo de persistir cambios. El plan y el contexto del asesor siguen requiriendo confirmar su formulario; los borradores no se suben. La tabla existente user_backups contiene el perfil completo y no cambia sus políticas RLS. Una inserción inicial no sobrescribe una fila ya creada; las actualizaciones exigen la revisión conocida. Si hay otro cambio o un fallo, se conserva la copia local pendiente. Mi cuenta ofrece exportar y resolver. La salida intenta completar el guardado, avisa si queda pendiente y cambia a un espacio sin datos de la cuenta anterior. Las respuestas asíncronas de una sesión terminada se descartan.

Pruebas cubren separación de usuarios, carga inicial sin subida vacía, guardado y deduplicación, reanudación de pendientes, conflictos y resolución explícita, actualización desde otro dispositivo, fallo de red y respuestas antiguas tras cambio de cuenta. El acceso real con contraseña, confirmación y recuperación deberá validarlo cada titular con su correo; no se crean cuentas reales ni se manipulan sus contraseñas durante las pruebas automatizadas.


### Bienvenida e inicio personal (V0.5)

Desde Mi cuenta o el inicio, abrir `/bienvenida`: punto de partida (experiencia e inversiones), balance y presupuesto, objetivo opcional y resumen. Cada paso se guarda expresamente; se puede volver atrás o continuar después. Los datos guardados se recuperan al volver, aunque la guía vuelve a su primer paso. No se fuerza introducir inversiones ni se convierten campos vacíos en cero. El borrador de un paso no confirmado no se guarda. Añadir un objetivo conserva los anteriores; revisarlos o modificarlos desde Mi plan financiero.

El inicio calcula próximos pasos a partir de los datos guardados: bienvenida pendiente, presupuesto incompleto, asignaciones incoherentes, inversiones por registrar, precios ficticios o antiguos, objetivos y aprendizaje. Muestra patrimonio declarado, excedente, reserva, liquidez tras reserva y objetivos con proyección sin rendimientos. Sin operaciones, el patrimonio sigue pendiente hasta que el usuario indique que no invierte; no se deduce un saldo cero por ausencia de datos. La demostración no se combina con el plan real.

Las preferencias opcionales `plan.onboarding` se validan y conservan en la copia completa existente y su sincronización por usuario; los planes anteriores siguen siendo válidos. No requiere migración SQL ni nuevas variables. Pruebas de validación, compatibilidad de copias y selección de próximos pasos en `tests/home-overview.test.mjs`. La experiencia declarada solo adapta el recorrido educativo; no equivale a un test de idoneidad.

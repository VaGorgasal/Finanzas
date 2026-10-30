# Brújula Financiera — V0.2

Web educativa para principiantes: **cartera por operaciones**, valoración manual, resumen de mercado **ilustrativo** y cinco lecciones interactivas. Se ha migrado la idea y los contenidos del HTML V0.1 a un proyecto **Next.js App Router + TypeScript** modular, con almacenamiento local y pruebas unitarias del cálculo.

> **Sin noticias en directo ni cotizaciones en tiempo real.** Los precios de último cierre pueden consultarse mediante EODHD si está configurado el secreto del servidor. Las cifras del modo demostración son inventadas, incluida la valoración de los dos productos. No se conecta con Trade Republic ni ofrece asesoramiento de inversión personalizado.

## Requisitos

- Node.js **20.9+** (recomendado Node 22 LTS).
- npm y navegador actualizado.
- Internet al instalar las dependencias por primera vez.

## Ejecutar en Windows, macOS o Linux

```bash
unzip brujula-financiera-v02.zip
cd brujula-financiera-v02
npm install
npm run dev
```

En Windows también puedes descomprimir el ZIP desde el Explorador de archivos y ejecutar los tres últimos comandos en PowerShell desde la carpeta que contiene `package.json`.

Abrir **http://localhost:3000**. Si el puerto está ocupado, Next.js puede elegir otro: consulta la consola.

### Comprobaciones

```bash
npm run test        # Pruebas del motor contable, Node 22
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm run build       # Compilación de producción
npm run start       # Servidor tras compilar
```

**Notas del paquete:** Los números de versión están fijados; al instalar con acceso a npm se genera `package-lock.json`. Guárdalo en GitHub y utiliza `npm ci` en instalaciones posteriores. El archivo `node_modules` no está incluido.

## Primer uso

1. La aplicación comienza con una cartera vacía: no incluye inversiones ni precios de ejemplo.
2. En Mi cartera, pulsa Añadir producto e introduce el nombre, ISIN y precio por participación que muestra tu intermediario, junto con su fecha. Actualmente solo se admite EUR y la app no verifica la existencia del ISIN.
3. Registra tus compras, ventas y dividendos con fechas, importes, participaciones y comisiones reales.
4. También puedes importar una copia JSON compatible y exportar tu cartera como respaldo.
5. La demostración se activa únicamente mediante el botón explícito. Antes de reemplazar una cartera, exporta una copia. Al volver a abrir la aplicación, una sesión de demostración no se recupera automáticamente.
6. Las carteras personales anteriores se conservan. Si una posición mantiene un precio de ejemplo, introduce un precio real: mientras tanto el valor y la rentabilidad afectados permanecen ocultos.

No existe sincronización automática con bancos o cotizaciones. Los datos personales se guardan en el navegador del usuario y no se incluyen en el repositorio.

## Fórmulas contables (V0.2)

Para cada producto, procesando las operaciones por fecha y **compras antes de ventas del mismo día**:

- **Compra:** aumenta participaciones y coste en `importe de compra + comisión`.
- **Coste medio ponderado móvil:** `coste pendiente / participaciones`.
- **Venta:** reduce el coste pendiente por `participaciones vendidas × coste medio` y genera ganancia realizada `cobro bruto − comisión − coste vendido`.
- **Dividendo:** registra el cobro neto y lo añade a resultados, sin afectar al coste pendiente.
- **Ganancia latente:** `participaciones restantes × precio manual − coste pendiente`.
- **Resultado total:** `valor de mercado + ventas netas + dividendos netos − compras con costes`.
- **Aportaciones netas:** `compras con costes − ventas netas − dividendos netos`.
- **Porcentaje mostrado:** `resultado total / suma histórica de compras con costes`.

La última métrica **no es una TIR ni una rentabilidad anualizada**. Puede ser poco comparable cuando hay muchas ventas y recompras; por eso se muestra su definición junto a los resultados. No se calculan rentabilidades históricas sin una serie verificada de precios, ni se calculan impuestos, cambio de divisas, ajustes de splits, plusvalías fiscales ni rentabilidad temporal ponderada (TWR). Se trabaja en **EUR**.

Ejemplo comprobado (datos inventados): se compran 10 participaciones por 100 € más 1 € de comisión, 5 más por 50 €, se venden 6 por 78 € menos 2 € de comisión y se cobra un dividendo neto de 3 €. Con precio actual de 12 €, el total es **36 €**: 15,60 € realizados por venta + 17,40 € latentes + 3 € de dividendo.

## Estructura modular

```text
src/
  app/
    layout.tsx                 Diseño compartido y contexto
    page.tsx                   Panel general
    cartera/page.tsx           Operaciones, activos, import/export
    mercados/page.tsx          Casos de mercado explicados
    academia/page.tsx          Lecciones + cuestionarios
    globals.css                Diseño responsive
  components/
    Shell.tsx                  Menú y estructura
    Common.tsx                 Encabezados y componentes visuales
    TransactionForm.tsx        Formulario de compras/ventas/dividendos
    InstrumentForm.tsx         Alta de productos
  context/PortfolioContext.tsx Estado compartido y acciones
  data/demo.ts                 Cartera sintética de 72 €
  data/lessons.ts              Microlecciones
  data/stories.ts              Casos educativos, no noticias reales
  lib/portfolio.ts             Cálculo y validación del libro
  lib/storage.ts               Guardado local y validación de JSON
  lib/types.ts                 Tipos
public/icon.svg                Icono
 tests/portfolio.test.mjs      Pruebas del cálculo
```

## Subir a GitHub

Si no tienes un repositorio creado, desde la carpeta del proyecto:

```bash
git init
npm install
npm run test
npm run build
git add .
git commit -m "feat: Brújula Financiera v0.2"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/brujula-financiera.git
git push -u origin main
```

Crea primero el repositorio vacío en GitHub. Sustituye `TU_USUARIO`. El proyecto **no ha sido subido automáticamente**, y no debes añadir `.env` con claves privadas al repositorio. Si usas GitHub Desktop, puedes publicar la carpeta con su interfaz.

## Despliegue en Vercel

1. Entra en [vercel.com](https://vercel.com), inicia sesión con GitHub y selecciona **Add New → Project**.
2. Importa `brujula-financiera` desde GitHub.
3. Vercel detectará **Next.js**; deja el directorio raíz como `.` y mantén el comando de compilación predeterminado `next build`.
4. Pulsa **Deploy**. La URL generada mostrará la web, pero **cada navegador conservará su propia cartera local** (no hay login ni sincronización de datos).
5. Las nuevas confirmaciones en la rama principal generarán despliegues automáticos según la integración. Usa ramas y pull requests para probar cambios antes de publicar.

La entrada manual funciona sin secretos. Para consultas de precios, configura EODHD_API_KEY como secreto de servidor en el entorno de destino. El archivo local no se transfiere a Vercel. No se ha completado el despliegue: la creación por la conexión devolvió 403 y la sesión web requiere completar la autenticación.

## Limitaciones y seguridad

- El guardado es `localStorage`: borrar datos del navegador o usar otro dispositivo hace perder la información si no tienes copia JSON.
- Si alguien abre tu ordenador o perfil de navegador puede acceder a tu cartera; **no guardes datos financieros sensibles ni credenciales**.
- Los archivos importados se validan en estructura y balances de participaciones; la app no hace auditoría fiscal ni reconcilia extractos.
- Los precios son manuales; un precio de distintos días o un valor inventado produce rentabilidad no representativa.
- No conecta ni solicita credenciales de Trade Republic, CaixaBank u otros bancos.
- No hay operaciones de compra/venta reales, recomendaciones personales ni noticias en directo.
- Hasta implementar un proveedor con derechos de uso, las noticias seguirán siendo escenarios educativos claramente rotulados.
- La edición de operaciones utiliza **coste medio** para seguimiento económico; en España, el cálculo fiscal sobre acciones y fondos puede requerir otras reglas, como FIFO.

## Hoja de ruta propuesta

**V0.3:** proveedor de datos verificable por ISIN y fecha, retrasos y moneda explicitados, datos de posición, comparador de índices. **V0.4:** noticias verificadas con fuentes, seleccionadas según productos reales y con explicación de incertidumbre. **V0.5:** IA asistente con trazabilidad y sin órdenes de trading. **V1.0:** cuentas, guardado seguro en backend, autenticación, permisos por usuario y RLS.

## Sobre este entregable

Este ZIP incluye todo el **código fuente**, configuración, documentación y pruebas. No incluye dependencias descargadas. Validado en GitHub Codespaces: 48 pruebas superadas, TypeScript correcto, ESLint sin errores ni advertencias y compilación de producción correcta. Se incluye package-lock.json para instalar con npm ci.

## Mejoras de fiabilidad

Se avisa si el navegador no puede guardar los cambios; exporta una copia antes de cerrar la pestaña. La importación rechaza operaciones malformadas, identificadores vacíos y precios con fecha futura. GitHub Actions ejecuta pruebas, lint, compilación y TypeScript en cada push y pull request.

## Precios EODHD (prueba privada)

Configura EODHD_API_KEY en .env.local, solo en el servidor. Nunca uses NEXT_PUBLIC para esta clave. En otro alojamiento debes crear allí el mismo secreto; no se incluye en GitHub.

Añadir producto y Cambiar precio permiten buscar por ISIN. La app solo acepta coincidencias exactas con precios positivos, fecha válida y moneda EUR. El usuario elige el producto/mercado, aplica el precio y guarda; se registra EODHD como fuente. No es una conexión bancaria ni una cotización en tiempo real. Los datos de búsqueda corresponden al último cierre disponible según el proveedor.

La prueba cachea resultados una hora y limita a 15 consultas nuevas por instancia cada 24 horas. Este límite se reinicia al reiniciar el proceso y no constituye un límite distribuido. Antes de abrir la app al público, se necesitan autenticación, cuota persistente y una licencia que autorice mostrar los datos a otros usuarios.

Si no hay cobertura, la moneda no es EUR o falla el proveedor, se mantiene la valoración anterior y sigue disponible la entrada manual.

## Asesor de cartera v1

La ruta /asesor cruza cartera y contexto declarado (objetivo, plazo, meses de reserva y tolerancia a pérdidas). Produce diagnósticos deterministas con evidencia, prioridad y siguiente paso. No llama a una IA externa ni genera órdenes de compra o venta.

Umbrales de revisión: reserva inferior a 3 meses, horizonte de 3 años o menos, una acción por encima del 15%, productos tecnológicos por encima del 30%, un vehículo por encima del 60% y precios de más de 7 días. Son criterios orientativos de la aplicación, no recomendaciones universales ni un test de idoneidad. Un único fondo global no se interpreta como concentración en una empresa. No se calculan pesos si hay posiciones con precios ficticios.

Las categorías son declaradas por el usuario al añadir productos; no se infieren del nombre ni sustituyen la composición real de los fondos. El perfil se guarda aparte en el navegador y no está incluido en la copia JSON de la cartera. Faltan composición subyacente, ingresos, deudas y fiscalidad para un análisis personal completo.

## Plan financiero y objetivos

Mi plan financiero (/plan) registra liquidez, otros activos excluyendo la cartera, principal de deudas, ingresos y gastos mensuales. Los campos vacíos se conservan como datos desconocidos; introduce cero solo cuando corresponda. La cartera se suma una vez al patrimonio neto y la reserva elegida incluye gastos esenciales y cuotas de deuda.

Cada objetivo tiene importe, fecha, liquidez asignada y aportación mensual. El cálculo detecta asignaciones simultáneas superiores a la liquidez tras la reserva y aportaciones superiores al excedente. Proyecta meses de calendario, sin rentabilidad, inflación, impuestos ni liquidación automática de inversiones. Los ingresos futuros inciertos se guardan aparte y no financian el escenario base. El asesor incorpora el plan guardado, no el borrador.

La copia completa de /plan contiene plan y cartera. El perfil de tolerancia del asesor sigue almacenado aparte. Los datos permanecen en el navegador: sin cuentas ni sincronización entre dispositivos.

## Importación CSV de operaciones

En Mi cartera puedes descargar una plantilla e importar operaciones con vista previa. Cabecera exacta: date;isin;type;amount;units;fee. Fechas AAAA-MM-DD. Tipos BUY, SELL, DIVIDEND. Importes EUR sin separadores de miles; acepta coma o punto decimal y campos entre comillas. Registra primero los productos por ISIN y sus precios.

Ejemplo de formato, no datos reales: 2026-10-20;IE00BYX5NX33;BUY;100;10;1. Los dividendos deben ser netos, sin participaciones ni comisión. La vista previa valida el saldo de participaciones antes de confirmar. Máximo 5000 filas y 2 MB. Las filas repetidas se rechazan y los identificadores permiten detectar la reimportación de archivos iguales. Operaciones ya introducidas a mano o con otra fuente no se concilian automáticamente: revisa el extracto.

Pendiente: importadores específicos de bancos, fiscalidad por lotes FIFO, periodos de liquidación de traspasos y divisas.

## Traspasos y efectivo

Mi cartera admite traspasos económicos entre fondos con participaciones de salida y entrada. Se arrastra el coste medio pendiente y no se crea una venta, una nueva compra con dinero externo ni una ganancia realizada. Las correcciones retroactivas recalculan el coste. No se verifica el derecho al diferimiento fiscal ni se calculan lotes FIFO; no admite comisiones de traspaso ni liquidaciones pendientes. El orden del mismo día es: compras, traspasos por secuencia única, dividendos y ventas. Los traspasos se editan desde su propio panel. El porcentaje sobre compras del fondo receptor se deja sin calcular porque no representa correctamente el capital transferido.

El efectivo distingue ingresos y retiradas externos de compras, ventas y dividendos. Antes del primer movimiento externo se muestra Sin registrar. Un saldo diario negativo señala posibles movimientos ausentes; no se añaden ingresos supuestos ni se concilia con un banco. Los flujos de entrada se ordenan antes de compras y retiradas del mismo día: no se reconstruye el saldo intradía. Los datos de efectivo viajan en las copias de cartera y en las copias completas. No se suman automáticamente a Mi plan financiero para evitar duplicar liquidez ya declarada.

## Actualización conjunta de precios

Actualizar precios de mi cartera consulta solo posiciones abiertas, de forma secuencial y sujeta a la cuota del proveedor. La vista previa muestra cambios, errores, precios ya actualizados y productos sin cobertura. Se aplica solo al confirmar. Si hay varios mercados y ninguno guardado, se solicita elegir uno desde Cambiar precio. Se conserva el símbolo elegido y se rechazan fechas anteriores, otras monedas e ISIN diferentes. Si la cartera cambia después de preparar la vista previa, se debe volver a consultar antes de aplicarla. Un error en un producto no borra sus precios ni impide aplicar los demás.

Las divisas siguen pendientes: la cartera y el registro de efectivo trabajan únicamente en EUR.

## Preguntas frecuentes

La sección /faq incluye 26 respuestas sobre primeros pasos, cartera y contabilidad, precios, plan y asesor, y datos e importación. Permite buscar sin distinguir tildes ni mayúsculas, combinar filtros por tema y desplegar respuestas con controles HTML nativos. Cada respuesta enlaza a la sección correspondiente. Los contenidos están en src/data/faq.ts y el filtro en src/lib/faq.ts; deben actualizarse cuando cambie el comportamiento del producto. La búsqueda funciona localmente y no envía consultas ni datos de cartera a terceros.


## Preparación de beta privada

Repositorio: VaGorgasal/Finanzas; rama main; framework Next.js; raíz del repositorio; Node 22; instalación npm ci. Antes de desplegar, ejecutar npm run test, npm run lint -- --max-warnings 0, npm run build y npm run typecheck.

Crear el proyecto en el equipo DeadEmber y configurar protección de despliegue ANTES de habilitar el proveedor. Si el plan solo protege Preview, usar un despliegue Preview protegido y comprobar el acceso anónimo también a /api/market. No publicar una URL de producción sin protección como beta privada. Las etiquetas noindex no constituyen control de acceso.

Configurar EODHD_API_KEY como Secret solo en el entorno protegido que se use. No guardar la clave en Git ni usar NEXT_PUBLIC_. La cuota en memoria actual sirve solo para pruebas restringidas; antes de una beta abierta se necesitan cuota persistente, control de acceso y licencia de datos adecuada.

La beta muestra aviso de almacenamiento local en todas las páginas y no solicita indexación. Los datos de Codespaces no se migran automáticamente al dominio de Vercel: exportar en el origen e importar en el destino. El perfil del asesor se configura aparte.

Validación pendiente en Vercel: protección anónima de página y API, cartera inicialmente vacía, importación de una copia ficticia, persistencia tras recarga, exportación y recuperación, precio con fecha y fuente, FAQ y navegación móvil. No declarar el servicio publicado hasta verificar una URL READY.

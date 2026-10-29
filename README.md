# Brújula Financiera — V0.2

Web educativa para principiantes: **cartera por operaciones**, valoración manual, resumen de mercado **ilustrativo** y cinco lecciones interactivas. Se ha migrado la idea y los contenidos del HTML V0.1 a un proyecto **Next.js App Router + TypeScript** modular, con almacenamiento local y pruebas unitarias del cálculo.

> **Sin cotizaciones ni noticias en directo.** Las cifras del modo demostración son inventadas, incluida la valoración de los dos productos. No se conecta con Trade Republic ni ofrece asesoramiento de inversión personalizado.

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

No hacen falta variables de entorno para la V0.2. **No se ha efectuado ningún despliegue real desde esta entrega.**

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

Este ZIP incluye todo el **código fuente**, configuración, documentación y pruebas. No incluye dependencias descargadas. Validado en GitHub Codespaces: 14 pruebas superadas, TypeScript correcto, ESLint sin errores ni advertencias y compilación de producción correcta. Se incluye package-lock.json para instalar con npm ci.

## Mejoras de fiabilidad

Se avisa si el navegador no puede guardar los cambios; exporta una copia antes de cerrar la pestaña. La importación rechaza operaciones malformadas, identificadores vacíos y precios con fecha futura. GitHub Actions ejecuta pruebas, lint, compilación y TypeScript en cada push y pull request.

## Precios EODHD (prueba privada)

Configura EODHD_API_KEY en .env.local, solo en el servidor. Nunca uses NEXT_PUBLIC para esta clave. En otro alojamiento debes crear allí el mismo secreto; no se incluye en GitHub.

Añadir producto y Cambiar precio permiten buscar por ISIN. La app solo acepta coincidencias exactas con precios positivos, fecha válida y moneda EUR. El usuario elige el producto/mercado, aplica el precio y guarda; se registra EODHD como fuente. No es una conexión bancaria ni una cotización en tiempo real. Los datos de búsqueda corresponden al último cierre disponible según el proveedor.

La prueba cachea resultados una hora y limita a 15 consultas nuevas por instancia cada 24 horas. Este límite se reinicia al reiniciar el proceso y no constituye un límite distribuido. Antes de abrir la app al público, se necesitan autenticación, cuota persistente y una licencia que autorice mostrar los datos a otros usuarios.

Si no hay cobertura, la moneda no es EUR o falla el proveedor, se mantiene la valoración anterior y sigue disponible la entrada manual.

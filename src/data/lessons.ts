export interface Lesson {
  id: string; title: string; minutes: number; description: string; concept: string;
  question: string; choices: string[]; correct: number; explanation: string;
}
export const lessons: Lesson[] = [
  { id:'fundos',title:'¿Qué es un fondo de inversión?',minutes:3,
    description:'Un fondo agrupa capital de distintos inversores y lo invierte siguiendo una política.',
    concept:'Un fondo indexado trata de replicar un índice. Un ETF también puede ser indexado, pero se negocia en bolsa durante la sesión.',
    question:'¿Qué intenta conseguir un fondo indexado?',choices:['Garantizar rentabilidad','Seguir un índice de referencia','Comprar siempre la empresa con mayor subida'],correct:1,
    explanation:'Los fondos indexados siguen un índice, pero pueden registrar pérdidas.' },
  { id:'diversificacion',title:'Diversificación: repartir no significa blindar',minutes:3,
    description:'Tener muchas empresas reduce la dependencia de una sola, pero no elimina las caídas generales.',
    concept:'Tu fondo global ya tiene compañías tecnológicas. Añadir un ETF de tecnología aumenta esa concentración, no diversifica tanto como parece.',
    question:'¿Un fondo global de renta variable puede perder un 30 %?',choices:['Sí, es posible','No, porque tiene muchos países','Solo si quiebra el gestor'],correct:0,
    explanation:'Diversificar reduce riesgo específico, no elimina los movimientos del mercado global.' },
  { id:'rentabilidad',title:'Ganancias reales frente a porcentajes',minutes:4,
    description:'Aprende a separar aportaciones, valor de mercado, comisiones y ventas.',
    concept:'Ganancia total = valor de posiciones + cobros netos de ventas y dividendos − pagos de compras y comisiones. Si vendes, parte del resultado queda realizada.',
    question:'Compras por 100 €, vendes por 120 € y pagas 2 € de comisión de venta. ¿Ganancia?',choices:['20 €','18 €','22 €'],correct:1,
    explanation:'Cobras 118 € netos después de la comisión: la ganancia es de 18 €.' },
  { id:'comisiones',title:'Las comisiones pesan mucho en importes pequeños',minutes:2,
    description:'Un coste fijo aparentemente pequeño puede ser enorme en porcentaje.',
    concept:'Una comisión de 1 € sobre una inversión de 12 € equivale al 8,33 % antes de que el activo se mueva. Comprueba el coste final antes de comprar.',
    question:'¿Qué es más relevante al invertir solo 12 €?',choices:['El color del gráfico','La comisión efectiva de la operación','El número de noticias de prensa'],correct:1,
    explanation:'En importes pequeños, las tarifas fijas pueden consumir buena parte del capital.' },
  { id:'mercado',title:'No confundir noticias con causas',minutes:3,
    description:'Una noticia puede coincidir con una caída sin ser su causa demostrada.',
    concept:'Comprueba fuente, fecha y expectativas previas. Unas ganancias empresariales excelentes pueden decepcionar si el precio ya descontaba aún más.',
    question:'Tu ETF cae y una web cita los tipos de interés. ¿Qué haces?',choices:['Vender por el titular','Asumir que esa es la causa exacta','Verificar los datos y el horizonte temporal'],correct:2,
    explanation:'Un titular suele ser una interpretación y no una prueba causal.' },
];

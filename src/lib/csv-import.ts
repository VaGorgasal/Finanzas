import type {Instrument,Transaction} from './types.ts';
function readRows(input:string,delimiter=';'):string[][]{const text=input.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');const out:string[][]=[];let row:string[]=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(!quoted&&(c===delimiter||c==='\n')){row.push(cell.trim());cell='';if(c==='\n'){if(row.some(Boolean))out.push(row);row=[];}}else cell+=c;}
 if(quoted)throw new Error('Hay comillas sin cerrar en el CSV.');row.push(cell.trim());if(row.some(Boolean))out.push(row);return out;}
function number(value:string,zero=false){if(!value&&zero)return 0;if(!/^\d+([.,]\d+)?$/.test(value))throw new Error('Usa importes sin separadores de miles.');const n=Number(value.replace(',','.'));if(!Number.isFinite(n)||n>1e9)throw new Error('Importe fuera de rango.');return n;}
function hash(s:string){let n=2166136261;for(const c of s){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return (n>>>0).toString(16);}
export function parseTransactionsCsv(text:string,instruments:Instrument[]):Transaction[]{const rows=readRows(text);if(rows.length<2)throw new Error('El CSV no contiene operaciones.');if(rows.length>5001)throw new Error('Máximo 5000 operaciones por archivo.');
 const expected=['date','isin','type','amount','units','fee'];if(rows[0].map(x=>x.toLowerCase()).join(';')!==expected.join(';'))throw new Error('Cabecera requerida: date;isin;type;amount;units;fee');
 const seen=new Set<string>();return rows.slice(1).map((r,i)=>{try{if(r.length!==6)throw new Error('Se requieren 6 columnas.');const [date,isin,kind,amount,units,fee]=r;const asset=instruments.find(x=>x.isin===isin.toUpperCase());if(!asset)throw new Error('Añade primero el producto con ISIN '+isin+'.');const type=kind.toUpperCase();if(!['BUY','SELL','DIVIDEND'].includes(type))throw new Error('Tipo admitido: BUY, SELL o DIVIDEND.');const tx:Transaction={id:'',instrumentId:asset.id,type:type as Transaction['type'],date,amount:number(amount),units:number(units,type==='DIVIDEND'),fee:number(fee,true)};const signature=JSON.stringify(tx);tx.id='csv-'+hash(signature);if(seen.has(tx.id))throw new Error('Operación repetida: revisa las filas duplicadas antes de importar.');seen.add(tx.id);return tx;}catch(e){throw new Error('Fila '+(i+2)+': '+(e instanceof Error?e.message:'datos incorrectos'));}});
}
/** Explicit adapter, never guesses net settlement values, units or a bank-specific layout. */
export function adaptStatementCsv(text:string,instruments:Instrument[],delimiter:';'|','){
 const rows=readRows(text,delimiter);if(rows.length<2)throw new Error('El extracto no contiene operaciones.');
 const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
 const aliases:Record<string,string[]>={date:['date','fecha'],isin:['isin'],type:['type','tipo','operacion'],amount:['amount','importe bruto','importe'],units:['units','participaciones','titulos'],fee:['fee','comision','comisiones']};
 const head=rows[0].map(normalize);const keys=Object.keys(aliases);const indices=keys.map(key=>{const matches=head.flatMap((h,i)=>aliases[key].includes(h)?[i]:[]);if(matches.length!==1)throw new Error('Falta una columna inequívoca para '+key+'. Ajusta el extracto a la plantilla.');return matches[0];});
 const encode=(s:string)=>'"'+s.replaceAll('"','""')+'"';
 const types:Record<string,string>={compra:'BUY',buy:'BUY',venta:'SELL',sell:'SELL',dividendo:'DIVIDEND',dividend:'DIVIDEND'};
 const data=rows.slice(1).map((row,i)=>{if(row.length!==head.length)throw new Error('Número de columnas incorrecto en fila '+(i+2));const r=indices.map(index=>row[index]);if(/^\d{2}\/\d{2}\/\d{4}$/.test(r[0])){const [d,m,y]=r[0].split('/');r[0]=y+'-'+m+'-'+d;}r[2]=types[normalize(r[2])]??r[2];return r.map(encode).join(';');});
 return parseTransactionsCsv([keys.join(';'),...data].join('\n'),instruments);
}
export function possibleDuplicates(incoming:Transaction[],existing:Transaction[]){return incoming.filter(t=>existing.some(x=>x.instrumentId===t.instrumentId&&x.type===t.type&&x.date===t.date&&Math.abs(x.amount-t.amount)<1e-8&&Math.abs(x.units-t.units)<1e-8&&Math.abs(x.fee-t.fee)<1e-8));}

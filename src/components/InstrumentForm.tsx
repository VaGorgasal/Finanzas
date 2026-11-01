'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {lookupQuotes,type MarketQuote} from '../lib/market.ts';
import {instrumentFromQuote,selectProductQuote} from '../lib/instrument-lookup.ts';
import {usePortfolio} from '../context/PortfolioContext';
import {eur,todayIso} from '../lib/portfolio.ts';
import type {AssetCategory,AssetKind,Instrument} from '../lib/types.ts';
type Lookup={isin:string;phase:'loading'|'done'|'error';quotes:MarketQuote[];error:string};
export function InstrumentForm({onDone}:{onDone:(asset:Instrument)=>void}){
 const {addInstrument,state}=usePortfolio();
 const [isin,setIsin]=useState(''),[manual,setManual]=useState(false),[lookup,setLookup]=useState<Lookup|null>(null),[symbol,setSymbol]=useState(''),[retry,setRetry]=useState(0);
 const [name,setName]=useState(''),[kind,setKind]=useState<AssetKind>('fondo'),[category,setCategory]=useState<AssetCategory>('otro'),[price,setPrice]=useState(''),[day,setDay]=useState(todayIso()),[error,setError]=useState('');
 const input=useRef<HTMLInputElement>(null);const normalized=isin.trim().toUpperCase(),valid=/^[A-Z]{2}[A-Z0-9]{10}$/.test(normalized);
 const result=lookup?.isin===normalized?lookup:null,selected=result?.phase==='done'?selectProductQuote(result.quotes,normalized,symbol):null;
 const duplicate=state.instruments.some(asset=>asset.isin===normalized);
 useEffect(()=>{input.current?.focus();},[]);
 useEffect(()=>{
  if(manual||!valid||duplicate)return;
  let alive=true;const controller=new AbortController();
  const timer=setTimeout(()=>{
   setLookup({isin:normalized,phase:'loading',quotes:[],error:''});
   void lookupQuotes(normalized,controller.signal).then(quotes=>{if(alive)setLookup({isin:normalized,phase:'done',quotes,error:quotes.length?'':'No hay una ficha disponible en EUR para este ISIN.'});}).catch(e=>{if(alive)setLookup({isin:normalized,phase:'error',quotes:[],error:e instanceof Error?e.message:'No se pudo consultar el producto.'});});
  },500);
  return ()=>{alive=false;clearTimeout(timer);controller.abort();};
 },[normalized,valid,manual,duplicate,retry]);
 function submit(event:FormEvent){
  event.preventDefault();setError('');
  if(duplicate){setError('Este producto ya está en tu cartera. Registra una operación para añadir una compra.');return;}
  try{
   const id=crypto.randomUUID();
   const asset:Instrument=manual?{id,name:name.trim(),isin:normalized,kind,category,color:'#497d52',explanation:'Producto registrado manualmente.',risk:'Consulta la documentación oficial para conocer sus condiciones y riesgos.',currency:'EUR',price:Number(price),priceDate:day,quoteSource:'manual'}:selected?instrumentFromQuote(selected,normalized,id):(()=>{throw new Error('Espera la búsqueda o elige una ficha antes de guardar.');})();
   const saved=addInstrument(asset);if(!saved.ok){setError(saved.error);return;}onDone(asset);
  }catch(e){setError(e instanceof Error?e.message:'No se pudo guardar el producto.');}
 }
 return <form className="formStack instrumentLookup" onSubmit={submit}>
 <div className="field"><label htmlFor="newisin">ISIN del producto</label><input ref={input} id="newisin" maxLength={12} minLength={12} required autoComplete="off" spellCheck={false} placeholder="Ej. IE00…" value={isin} onChange={event=>{setIsin(event.target.value.replace(/\s/g,'').toUpperCase());setSymbol('');setError('');}} aria-describedby="isin-help"/></div>
 <p id="isin-help" className="hint">Introduce los 12 caracteres. Buscaremos el nombre, tipo, moneda y último precio disponible. La búsqueda comienza automáticamente.</p>
 {duplicate&&<p role="status" className="info">Este ISIN ya está en tu cartera. Puedes añadir compras desde Operaciones.</p>}
 {!manual&&!duplicate&&valid&&(!result||result.phase==='loading')&&<p role="status" aria-live="polite">Buscando el producto…</p>}
 {!manual&&!duplicate&&result?.error&&<div className="info" role="alert"><p>{result.error}</p><button type="button" className="textButton" onClick={()=>{setLookup(null);setRetry(value=>value+1);}}>Volver a buscar</button></div>}
 {!manual&&!duplicate&&result?.phase==='done'&&result.quotes.length>1&&<fieldset className="quoteOptions"><legend>Elige el mercado en el que tienes el producto</legend>{result.quotes.map(quote=><label key={quote.symbol} className="quoteOption"><input type="radio" name="product-market" checked={symbol===quote.symbol} onChange={()=>setSymbol(quote.symbol)}/><span><strong>{quote.name}</strong><small>{quote.symbol} · {eur(quote.price)} · {quote.date}</small></span></label>)}</fieldset>}
 {!manual&&!duplicate&&selected&&<section className="resolvedProduct" aria-label="Ficha encontrada"><span className="eyebrow">PRODUCTO IDENTIFICADO</span><h3>{selected.name}</h3><dl><div><dt>ISIN</dt><dd>{selected.isin}</dd></div><div><dt>Tipo</dt><dd>{selected.kind??'otro'}</dd></div><div><dt>Mercado</dt><dd>{selected.symbol}</dd></div><div><dt>Moneda</dt><dd>EUR</dd></div><div><dt>Último precio</dt><dd>{eur(selected.price)}</dd></div><div><dt>Fecha del precio</dt><dd>{selected.date}</dd></div></dl><p className="hint">EODHD · último cierre disponible. No es tiempo real. El producto se añade sin inventar compras ni participaciones.</p></section>}
 {manual&&<><p className="info">Registro manual para productos sin cobertura. Estos datos no han sido verificados por el proveedor.</p>
 <div className="field"><label htmlFor="newname">Nombre del producto</label><input id="newname" maxLength={150} required value={name} onChange={e=>setName(e.target.value)}/></div>
 <div className="fieldGrid"><div className="field"><label htmlFor="newkind">Tipo</label><select id="newkind" value={kind} onChange={e=>setKind(e.target.value as AssetKind)}><option value="fondo">Fondo</option><option value="etf">ETF</option><option value="acción">Acción</option><option value="otro">Otro</option></select></div><div className="field"><label htmlFor="newcategory">Categoría informativa</label><select id="newcategory" value={category} onChange={e=>setCategory(e.target.value as AssetCategory)}><option value="otro">Sin clasificar</option><option value="global">Global</option><option value="tecnología">Tecnología</option><option value="sectorial">Otro sector</option></select></div></div>
 <div className="fieldGrid"><div className="field"><label htmlFor="newprice">Precio por título (€)</label><input id="newprice" type="number" min="0.00001" max="1000000000" step="any" required value={price} onChange={e=>setPrice(e.target.value)}/></div><div className="field"><label htmlFor="newpricedate">Fecha del precio</label><input id="newpricedate" type="date" required max={todayIso()} value={day} onChange={e=>setDay(e.target.value)}/></div></div></>}
 {error&&<p role="alert" className="fieldError">{error}</p>}
 <div className="formActions"><button className="primaryButton" disabled={duplicate||!valid||!manual&&!selected} type="submit">Guardar producto</button><button className="textButton" type="button" onClick={()=>{setManual(value=>!value);setError('');}}>{manual?'Buscar por ISIN':'Registrar manualmente'}</button></div>
 </form>;
}

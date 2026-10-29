'use client';
import { useState, type FormEvent } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { todayIso } from '../lib/portfolio';
import type { AssetKind, Instrument } from '../lib/types';
export function InstrumentForm({onDone}:{onDone:()=>void}){
  const {addInstrument}=usePortfolio();
  const [name,setName]=useState(''); const [isin,setIsin]=useState('');
  const [kind,setKind]=useState<AssetKind>('fondo'); const [price,setPrice]=useState('');
  const [day,setDay]=useState(todayIso()); const [error,setError]=useState('');
  function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const asset:Instrument={id:`manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,name:name.trim(),isin:isin.trim().toUpperCase(),kind,category:'otro',color:'#db9c56',explanation:'Instrumento añadido manualmente. Comprueba sus condiciones y documentación oficial.',risk:'La aplicación no verifica el ISIN ni importa automáticamente riesgos o precios.',currency:'EUR',price:Number(price),priceDate:day,quoteSource:'manual'};
    if(!asset.name || asset.name.length>150 || !Number.isFinite(asset.price)||asset.price<=0){setError('Revisa nombre y precio.');return;}
    const result=addInstrument(asset);if(!result.ok){setError(result.error);return;}onDone();
  }
  return <form className="formStack" onSubmit={submit}><div className="field"><label htmlFor="newname">Nombre del producto</label><input id="newname" maxLength={150} value={name} onChange={e=>setName(e.target.value)} required placeholder="Ej. Fondo de renta variable global"/></div>
    <div className="fieldGrid"><div className="field"><label htmlFor="newisin">ISIN</label><input id="newisin" maxLength={12} value={isin} onChange={e=>setIsin(e.target.value.toUpperCase())} required placeholder="IE00..."/></div>
    <div className="field"><label htmlFor="newkind">Tipo</label><select id="newkind" value={kind} onChange={e=>setKind(e.target.value as AssetKind)}><option value="fondo">Fondo</option><option value="etf">ETF</option><option value="acción">Acción</option><option value="otro">Otro</option></select></div></div>
    <div className="fieldGrid"><div className="field"><label htmlFor="newprice">Precio manual por título (€)</label><input id="newprice" type="number" min="0.00001" step="any" required value={price} onChange={e=>setPrice(e.target.value)} placeholder="Ej. 24.50"/></div><div className="field"><label htmlFor="newpricedate">Fecha del precio</label><input id="newpricedate" type="date" required max={todayIso()} value={day} onChange={e=>setDay(e.target.value)}/></div></div>
    <p className="hint">El ISIN se valida solo en formato. Verifica que existe en la ficha oficial del producto. Por ahora la cartera admite únicamente euros.</p>
    {error&&<p role="alert" className="fieldError">{error}</p>}
    <button className="primaryButton">Añadir producto</button></form>;
}

'use client';
import { useState, type FormEvent } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { todayIso } from '../lib/portfolio.ts';
import { purchaseUnits } from '../lib/purchase-units.ts';
import type { Transaction, TransactionType } from '../lib/types.ts';

function makeId() { return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `tx-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
export function TransactionForm({editing,onDone}:{editing:Transaction|null,onDone:()=>void}) {
  const {state,addTransaction,editTransaction} = usePortfolio();
  const [product,setProduct]=useState(editing?.instrumentId??state.instruments[0]?.id??'');
  const [kind,setKind]=useState<TransactionType>(editing?.type??'BUY');
  const [day,setDay]=useState(editing?.date??todayIso());
  const [amount,setAmount]=useState(editing?.amount.toString()??'');
  const [units,setUnits]=useState(editing?.units.toString()??'');
  const [mode,setMode]=useState<'amount'|'units'>(editing?'units':'amount');
  const [price,setPrice]=useState(state.instruments.find(i=>i.id===product)?.price.toString()??'');
  const instrument=state.instruments.find(i=>i.id===product);
  const byAmount=kind==='BUY'&&mode==='amount';
  const calculatedUnits=purchaseUnits(Number(amount),Number(price));
  const effectiveUnits=byAmount?calculatedUnits:Number(units);
  const [fee,setFee]=useState(editing?.fee.toString()??'0');
  const [error,setError]=useState('');
  const displayPrice=effectiveUnits!==null&&effectiveUnits>0?Number(amount)/effectiveUnits:null;
  function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); setError('');
    if(byAmount&&calculatedUnits===null){setError('Introduce un importe y un precio válidos para calcular las participaciones.');return;}
    const tx:Transaction={id:editing?.id??makeId(),instrumentId:product,type:kind,date:day,
      amount:Number(amount),units:kind==='DIVIDEND'?0:effectiveUnits??0,fee:kind==='DIVIDEND'?0:Number(fee)};
    const result=editing?editTransaction(tx):addTransaction(tx);
    if(!result.ok){setError(result.error);return;}
    setAmount('');setUnits('');setFee('0');onDone();
  }
  return <form className="formStack" onSubmit={submit}>
    <div className="field"><label htmlFor="asset">Producto</label><select id="asset" value={product} onChange={e=>{setProduct(e.target.value);setPrice(state.instruments.find(i=>i.id===e.target.value)?.price.toString()??'');}} required>{state.instruments.map(i=><option value={i.id} key={i.id}>{i.name}</option>)}</select></div>
    <div className="fieldGrid"><div className="field"><label htmlFor="type">Tipo de operación</label><select id="type" value={kind} onChange={e=>setKind(e.target.value as TransactionType)}><option value="BUY">Compra</option><option value="SELL">Venta</option><option value="DIVIDEND">Dividendo neto</option></select></div>
    <div className="field"><label htmlFor="date">Fecha</label><input id="date" type="date" required value={day} max={todayIso()} onChange={e=>setDay(e.target.value)}/></div></div>
    {kind==='BUY' && <div className="field"><label htmlFor="purchase-mode">Cómo introducir la compra</label><select id="purchase-mode" value={mode} onChange={e=>{if(e.target.value==='units'&&calculatedUnits!==null)setUnits(calculatedUnits.toString());setMode(e.target.value as 'amount'|'units');}}><option value="amount">Por importe invertido (€)</option><option value="units">Por participaciones / títulos</option></select></div>}
    <div className="fieldGrid"><div className="field"><label htmlFor="amount">{kind==='DIVIDEND'?'Dividendo neto (€)':kind==='BUY'?'Importe de compra (€)':'Importe bruto de venta (€)'}</label><input id="amount" type="number" min="0.01" step="any" required value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Ej. 60"/></div>
    {byAmount && <div className="field"><label htmlFor="purchase-price">Precio de compra por participación (€)</label><input id="purchase-price" type="number" min="0.00000001" step="any" required value={price} onChange={e=>setPrice(e.target.value)} aria-describedby="purchase-price-hint"/></div>}
    {kind!=='DIVIDEND' && !byAmount && <div className="field"><label htmlFor="units">Participaciones / títulos</label><input id="units" type="number" min="0.00000001" step="any" value={units} onChange={e=>setUnits(e.target.value)} required placeholder="Ej. 4.2354"/></div>}</div>
    {byAmount && <><p id="purchase-price-hint" className="hint">Precio inicial de referencia del producto: {instrument?.price} € ({instrument?.priceDate}). Sustitúyelo por el precio de ejecución de tu banco para registrar una compra real. La cotización actual puede ser distinta de la de la fecha de compra.</p><div className="field"><span>Participaciones calculadas</span><output className="computedField" aria-live="polite">{calculatedUnits===null?'—':calculatedUnits.toLocaleString('es-ES',{maximumFractionDigits:12})}</output></div><p className="hint">Importe sin comisiones ÷ precio por participación. Se admiten fracciones; comprueba las unidades ejecutadas por tu intermediario o introdúcelas directamente.</p></>}
    {kind!=='DIVIDEND' && <div className="fieldGrid"><div className="field"><label htmlFor="fee">Comisión adicional (€)</label><input id="fee" type="number" min="0" step="any" value={fee} onChange={e=>setFee(e.target.value)} required/></div><div className="field"><label>Precio unitario deducido</label><div className="computedField">{displayPrice!==null && Number.isFinite(displayPrice)?`${displayPrice.toFixed(5).replace('.',',')} €`:'—'}</div></div></div>}
    <p className="hint">Introduce el importe negociado sin comisiones adicionales. En compras se suman al coste; en ventas se descuentan del cobro. El fondo y el ETF pueden admitir fracciones dependiendo del intermediario.</p>
    {error && <p className="fieldError" role="alert">{error}</p>}
    <div className="formActions"><button className="primaryButton" type="submit">{editing?'Guardar cambios':'Añadir operación'}</button>{editing && <button className="secondaryButton" type="button" onClick={onDone}>Cancelar</button>}</div>
  </form>;
}

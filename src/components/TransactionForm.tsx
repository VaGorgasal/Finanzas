'use client';
import { useState, type FormEvent } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { todayIso } from '../lib/portfolio.ts';
import type { Transaction, TransactionType } from '../lib/types.ts';

function makeId() { return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `tx-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
export function TransactionForm({editing,onDone}:{editing:Transaction|null,onDone:()=>void}) {
  const {state,addTransaction,editTransaction} = usePortfolio();
  const [product,setProduct]=useState(editing?.instrumentId??state.instruments[0]?.id??'');
  const [kind,setKind]=useState<TransactionType>(editing?.type??'BUY');
  const [day,setDay]=useState(editing?.date??todayIso());
  const [amount,setAmount]=useState(editing?.amount.toString()??'');
  const [units,setUnits]=useState(editing?.units.toString()??'');
  const [fee,setFee]=useState(editing?.fee.toString()??'0');
  const [error,setError]=useState('');
  const displayPrice=Number(units)>0?Number(amount)/Number(units):null;
  function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); setError('');
    const tx:Transaction={id:editing?.id??makeId(),instrumentId:product,type:kind,date:day,
      amount:Number(amount),units:kind==='DIVIDEND'?0:Number(units),fee:kind==='DIVIDEND'?0:Number(fee)};
    const result=editing?editTransaction(tx):addTransaction(tx);
    if(!result.ok){setError(result.error);return;}
    setAmount('');setUnits('');setFee('0');onDone();
  }
  return <form className="formStack" onSubmit={submit}>
    <div className="field"><label htmlFor="asset">Producto</label><select id="asset" value={product} onChange={e=>setProduct(e.target.value)} required>{state.instruments.map(i=><option value={i.id} key={i.id}>{i.name}</option>)}</select></div>
    <div className="fieldGrid"><div className="field"><label htmlFor="type">Tipo de operación</label><select id="type" value={kind} onChange={e=>setKind(e.target.value as TransactionType)}><option value="BUY">Compra</option><option value="SELL">Venta</option><option value="DIVIDEND">Dividendo neto</option></select></div>
    <div className="field"><label htmlFor="date">Fecha</label><input id="date" type="date" required value={day} max={todayIso()} onChange={e=>setDay(e.target.value)}/></div></div>
    <div className="fieldGrid"><div className="field"><label htmlFor="amount">{kind==='DIVIDEND'?'Dividendo neto (€)':kind==='BUY'?'Importe de compra (€)':'Importe bruto de venta (€)'}</label><input id="amount" type="number" min="0.01" step="any" required value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Ej. 60"/></div>
    {kind!=='DIVIDEND' && <div className="field"><label htmlFor="units">Participaciones / títulos</label><input id="units" type="number" min="0.00000001" step="any" value={units} onChange={e=>setUnits(e.target.value)} required placeholder="Ej. 4.2354"/></div>}</div>
    {kind!=='DIVIDEND' && <div className="fieldGrid"><div className="field"><label htmlFor="fee">Comisión adicional (€)</label><input id="fee" type="number" min="0" step="any" value={fee} onChange={e=>setFee(e.target.value)} required/></div><div className="field"><label>Precio unitario deducido</label><div className="computedField">{displayPrice!==null && Number.isFinite(displayPrice)?`${displayPrice.toFixed(5).replace('.',',')} €`:'—'}</div></div></div>}
    <p className="hint">Introduce el importe negociado sin comisiones adicionales. En compras se suman al coste; en ventas se descuentan del cobro. El fondo y el ETF pueden admitir fracciones dependiendo del intermediario.</p>
    {error && <p className="fieldError" role="alert">{error}</p>}
    <div className="formActions"><button className="primaryButton" type="submit">{editing?'Guardar cambios':'Añadir operación'}</button>{editing && <button className="secondaryButton" type="button" onClick={onDone}>Cancelar</button>}</div>
  </form>;
}

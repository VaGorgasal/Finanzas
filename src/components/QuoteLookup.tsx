'use client';
import {useState} from 'react';
import {lookupQuotes,type MarketQuote} from '../lib/market.ts';
import {eur} from '../lib/portfolio.ts';
export function QuoteLookup({isin,onSelect}:{isin:string;onSelect:(quote:MarketQuote)=>void}) {
  const [busy,setBusy]=useState(false), [error,setError]=useState('');
  const [quotes,setQuotes]=useState<MarketQuote[]>([]);
  async function search(){setBusy(true);setError('');setQuotes([]);
    try {setQuotes(await lookupQuotes(isin.trim().toUpperCase()));}
    catch(e){setError(e instanceof Error?e.message:'No se ha podido consultar el precio.');}
    finally {setBusy(false);}
  }
  return <div className="formStack"><button type="button" className="secondaryButton" disabled={busy || !/^[A-Z]{2}[A-Z0-9]{10}$/.test(isin.trim().toUpperCase())} onClick={search}>{busy?'Consultando…':'Buscar precio por ISIN'}</button>
    <p className="hint">EODHD · último cierre disponible en EUR. No es una cotización en tiempo real. Comprueba el producto y la fecha antes de aplicarlo.</p>
    {error && <p role="alert" className="fieldError">{error}</p>}
    {quotes.map(q=><div key={q.symbol}><strong>{q.name}</strong><p>{q.symbol} · {eur(q.price)} · {q.date}</p><button type="button" className="textButton" onClick={()=>{onSelect(q);setQuotes([]);}}>Usar este precio</button></div>)}
  </div>;
}

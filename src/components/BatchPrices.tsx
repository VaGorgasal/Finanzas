'use client';
import {useState} from 'react';
import {usePortfolio} from '../context/PortfolioContext';
import {lookupQuotes} from '../lib/market';
import {prepareQuoteUpdates,type QuoteReport} from '../lib/batch-quotes';
import {eur,todayIso} from '../lib/portfolio';
export function BatchPrices(){const {state,summary,applyPriceUpdates}=usePortfolio();const [busy,setBusy]=useState(false),[reports,setReports]=useState<QuoteReport[]>([]),[status,setStatus]=useState('');
 async function prepare(){setBusy(true);setStatus('');setReports([]);try{const ids=new Set(summary.holdings.filter(h=>h.units>1e-8).map(h=>h.instrument.id));setReports(await prepareQuoteUpdates(state.instruments.filter(a=>ids.has(a.id)),lookupQuotes,todayIso()));}finally{setBusy(false);}}
 const changes=reports.flatMap(r=>r.change?[r.change]:[]);
 function apply(){const r=applyPriceUpdates(changes);setStatus(r.ok?'Precios actualizados. Los productos sin cobertura mantienen su valoración anterior.':r.error);if(r.ok)setReports([]);}
 return <div className="formStack"><button className="secondaryButton" type="button" disabled={busy||state.demoMode||!summary.holdings.some(h=>h.units>1e-8)} onClick={prepare}>{busy?'Consultando posiciones…':'Actualizar precios de mi cartera'}</button><p className="hint">Consulta secuencial de posiciones abiertas en EUR, sujeta a cobertura y cuota. Revisa la vista previa antes de aplicar. Un fallo no cambia los precios anteriores.</p>{status&&<p role="status">{status}</p>}{reports.length>0&&<><div className="assetTableWrap"><table className="dataTable"><thead><tr><th>Producto</th><th>Resultado</th><th>Precio anterior → nuevo</th></tr></thead><tbody>{reports.map(r=><tr key={r.id}><td>{r.name}</td><td>{r.status==='ready'?'Listo · ':''}{r.message}</td><td>{r.change?eur(r.change.oldPrice)+' → '+eur(r.change.price):'Sin cambios'}</td></tr>)}</tbody></table></div><button className="primaryButton" type="button" disabled={!changes.length} onClick={apply}>Aplicar {changes.length} precios</button><button className="secondaryButton" type="button" onClick={()=>setReports([])}>Descartar vista previa</button></>}</div>;
}

'use client';
import { useEffect,useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Header, Info, Pnl, Section, Tag } from '../../components/Common';
import { QuoteLookup } from '../../components/QuoteLookup';
import type { MarketQuote } from '../../lib/market.ts';
import { AccountingPanel } from '../../components/AccountingPanel';
import { BatchPrices } from '../../components/BatchPrices';
import {Performance} from '../../components/Performance';
import Link from 'next/link';
import { CsvImport } from '../../components/CsvImport';
import { TransactionForm } from '../../components/TransactionForm';
import { InstrumentForm } from '../../components/InstrumentForm';
import { usePortfolio } from '../../context/PortfolioContext';
import { eur, nfmt, pct, sortedTransactions, todayIso } from '../../lib/portfolio.ts';
import type { Instrument, Transaction } from '../../lib/types.ts';

function PriceEditor({asset,onDone}:{asset:Instrument,onDone:()=>void}){
  const {updatePrice}=usePortfolio();
  const [quote,setQuote]=useState<MarketQuote|null>(null);
  const [price,setPrice]=useState(String(asset.price));const [day,setDay]=useState(asset.priceDate);
  const [error,setError]=useState('');
  function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const result=updatePrice(asset.id,Number(price),day,quote && quote.price===Number(price) && quote.date===day ? 'eodhd' : 'manual',quote?.symbol);
    if(!result.ok){setError(result.error);return;}onDone();}
  return <form onSubmit={submit} className="inlinePrice"><QuoteLookup isin={asset.isin} onSelect={q=>{setQuote(q);setPrice(String(q.price));setDay(q.date);}}/><div className="field"><label>Precio unitario (€)</label><input aria-label="Nuevo precio" type="number" min="0.00001" step="any" value={price} onChange={e=>setPrice(e.target.value)} required/></div><div className="field"><label>Fecha de valoración</label><input aria-label="Fecha del nuevo precio" type="date" max={todayIso()} value={day} onChange={e=>setDay(e.target.value)} required/></div><button className="primaryButton" type="submit">Guardar precio</button><button type="button" className="secondaryButton" onClick={onDone}>Cancelar</button>{error&&<span className="fieldError">{error}</span>}</form>;
}

export default function CarteraPage(){
  const {state,summary,deleteTransaction,restoreDemo,startBlank,importJson,recoveryError}=usePortfolio();
  const unpriced = !state.demoMode && summary.holdings.some(h=>h.units>0 && h.instrument.quoteSource==='demo');
  const [view,setView]=useState('positions');
  useEffect(()=>{const sync=()=>{if(window.location.hash==='#operaciones')setView('operations');else if(window.location.hash==='#productos')setView('positions');};sync();window.addEventListener('hashchange',sync);return ()=>window.removeEventListener('hashchange',sync);},[]);
  const [editing,setEditing]=useState<Transaction|null>(null);
  const [showForm,setShowForm]=useState(false);
  const [showAssetForm,setShowAssetForm]=useState(false);
  const [priceEdit,setPriceEdit]=useState<string|null>(null);
  const [status,setStatus]=useState('');
  const inputRef=useRef<HTMLInputElement>(null);
  const onDelete=(id:string)=>{if(!window.confirm('¿Eliminar esta operación? La rentabilidad se recalculará.'))return;
    const result=deleteTransaction(id);setStatus(result.ok?'Operación eliminada.':result.error);};
  function download(){if(recoveryError){setStatus('Descarga los datos originales desde el aviso de recuperación.');return;}const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='brujula-cartera-v02.json';a.click();URL.revokeObjectURL(url);}
  async function onImport(e:ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];if(!file)return;
    try {if(file.size>2_000_000)throw new Error('El archivo es demasiado grande.');
      const data=JSON.parse(await file.text()) as unknown;
      if(!window.confirm('¿Reemplazar toda la cartera local por los datos del archivo?'))return;
      const result=importJson(data);setStatus(result.ok?'Cartera importada correctamente.':result.error);}
    catch(err){setStatus(err instanceof Error?err.message:'No se ha podido importar el archivo.');}
    finally{e.target.value='';}
  }
  return <>
    <Header eyebrow="TU PATRIMONIO, EXPLICADO" title="Mi cartera" description="Registra cada compra y venta. El resultado se calcula a partir de tus movimientos y precios manuales." action={<Tag tone={state.demoMode?'amber':'mint'}>{state.demoMode?'Simulación · 72 €':'Cartera personal'}</Tag>}/>
    {state.demoMode ? <Info tone="amber"><strong>Modo demostración.</strong> Las dos operaciones y todos los precios son inventados. Puedes explorar cómo funciona la aplicación o <button className="linkButton" onClick={()=>{if(window.confirm('¿Empezar tu cartera real? Se eliminarán las operaciones de demostración y tendrás que introducir precios auténticos.'))startBlank();}}>Empezar mi cartera en blanco →</button>. Para registrar movimientos reales, activa primero tu cartera personal.</Info> : <Info><strong>Modo local/manual.</strong> No hay conexión con tu intermediario. Puedes consultar el último cierre en EUR desde «Cambiar precio» o introducir una valoración manual. Cada precio conserva su fuente y fecha.</Info>}
    {!state.demoMode && !state.instruments.length && <Info><strong>Añade tu primera inversión.</strong> Usa «Añadir producto» con el nombre, ISIN y precio real por participación de tu intermediario. Después registra compras, ventas y dividendos, o importa una copia JSON.</Info>}
    {unpriced && <Info tone="amber"><strong>Actualiza tus precios.</strong> Algunas posiciones conservan precios de ejemplo. El valor total y la rentabilidad permanecerán ocultos hasta que introduzcas precios reales.</Info>}
    <div className="metricGrid">
      <div className="metricCard"><span>Valor actual</span><strong>{unpriced ? 'Sin valorar' : eur(summary.marketValue)}</strong><small>Precios introducidos por el usuario</small></div>
      <div className="metricCard"><span>Aportaciones netas</span><strong>{eur(summary.netCashContributed)}</strong><small>Compras + costes − cobros</small></div>
      <div className="metricCard"><span>Resultado total</span><strong>{unpriced ? '—' : <Pnl amount={summary.totalPnL}/>}</strong><small>Realizado + latente + dividendos</small></div>
      <div className="metricCard"><span>Resultado / compras</span><strong>{unpriced ? '—' : pct(summary.returnOnBuys)}</strong><small>No anualizado; sensible a rotación</small></div>
    </div>
    <div className="viewTabs" role="group" aria-label="Secciones de la cartera">{[['positions','Posiciones'],['operations','Operaciones'],['cash','Traspasos y efectivo'],['data','Importar y copias']].map(([id,label])=><button type="button" key={id} className="secondaryButton" aria-pressed={view===id} onClick={()=>setView(id)}>{label}</button>)}</div>
    {view==='positions'&&<><BatchPrices/><Performance/></>}
    {view==='cash'&&<AccountingPanel/>}
    <div className="contentGrid">
      {view==='positions'&&<div className="span12" id="productos"><Section className="span12" title="Productos de tu cartera" extra={<div className="toolbar">{!state.demoMode&&<button className="secondaryButton" onClick={()=>setShowAssetForm(!showAssetForm)}>{showAssetForm?'Cerrar':'＋ Añadir producto'}</button>}</div>}>
        {showAssetForm&&!state.demoMode&&<div className="formInset"><h3>Nuevo producto</h3><InstrumentForm onDone={()=>setShowAssetForm(false)}/></div>}
        <div className="assetTableWrap"><table className="dataTable"><thead><tr><th>Producto</th><th>Participaciones</th><th>Coste medio</th><th>Precio actual</th><th>Valor</th><th>Resultado total</th><th/></tr></thead>
        <tbody>{summary.holdings.map(h=><tr key={h.instrument.id}><td><div className="assetName"><span className="assetDot" style={{background:h.instrument.color}}/><strong>{h.instrument.name}</strong></div><div className="tinyMuted">{h.instrument.kind.toUpperCase()} · {h.instrument.isin}</div></td><td>{nfmt(h.units,6)}</td><td>{eur(h.averageCost)}</td><td>{!state.demoMode && h.instrument.quoteSource==='demo' ? 'Sin precio real' : eur(h.instrument.price)}<div className="tinyMuted">{h.instrument.priceDate} · {h.instrument.quoteSource==='demo'?'DEMO':h.instrument.quoteSource==='eodhd'?'EODHD · cierre':'Manual'}</div></td><td><strong>{!state.demoMode && h.instrument.quoteSource==='demo' ? '—' : eur(h.value)}</strong></td><td>{!state.demoMode && h.instrument.quoteSource==='demo' ? '—' : <Pnl amount={h.totalPnL} percent={h.returnOnBuys}/>}</td><td>{priceEdit===h.instrument.id?<button className="textButton" onClick={()=>setPriceEdit(null)}>Cerrar</button>:<button className="textButton" onClick={()=>setPriceEdit(h.instrument.id)}>Cambiar precio</button>}</td></tr>)}
        </tbody></table></div>
        {priceEdit&&<div className="formInset"><h3>Actualizar valoración · {state.instruments.find(x=>x.id===priceEdit)?.name}</h3><PriceEditor key={priceEdit} asset={state.instruments.find(x=>x.id===priceEdit)!} onDone={()=>setPriceEdit(null)}/></div>}
        <p className="hint">Precio manual por participación en euros. Una clase de fondo y un ETF tienen sus propias reglas de valoración. No se usan precios supuestos para simular rendimientos históricos.</p>
      </Section>
      </div>}
      {view==='operations'&&<div className="span12" id="operaciones"><Section className="span12" title="Operaciones" extra={!state.demoMode?<button className="primaryButton" disabled={!state.instruments.length} onClick={()=>{setEditing(null);setShowForm(x=>!x);}}>{showForm?'Cerrar formulario':'＋ Nueva operación'}</button>:<Tag>Exploración sin edición</Tag>}>
        {showForm&&!state.demoMode&&<div className="formInset"><h3>{editing?'Editar operación':'Registrar una operación'}</h3><TransactionForm key={editing?.id??'new'} editing={editing} onDone={()=>{setShowForm(false);setEditing(null);setStatus('Operación guardada.');}}/></div>}
        {status&&<p role="status" className="statusMsg">{status} <button className="textButton" onClick={()=>setStatus('')}>Cerrar</button></p>}
        <div className="assetTableWrap"><table className="dataTable"><thead><tr><th>Fecha</th><th>Producto</th><th>Movimiento</th><th>Importe</th><th>Participaciones</th><th>Comisión</th><th/></tr></thead><tbody>
          {sortedTransactions(state.transactions).reverse().map(tx=>{const asset=state.instruments.find(x=>x.id===tx.instrumentId);
            return <tr key={tx.id}><td>{tx.date}{tx.fx&&<div className="tinyMuted">{tx.fx.amount} {tx.fx.currency} · cambio {tx.fx.eurPerUnit} EUR · {tx.fx.source}</div>}</td><td>{asset?.name??'—'}</td><td><span className={`eventType ${tx.type.toLowerCase()}`}>{tx.type==='BUY'?'Compra':tx.type==='SELL'?'Venta':tx.type==='TRANSFER'?'Traspaso':'Dividendo'}</span></td><td>{tx.type==='TRANSFER'?'—':eur(tx.amount)}</td><td>{tx.type==='DIVIDEND'?'—':nfmt(tx.units,6)}</td><td>{eur(tx.fee)}</td><td>{!state.demoMode&&<div className="tableActions">{tx.type!=='TRANSFER'&&<button className="textButton" onClick={()=>{setEditing(tx);setShowForm(true);setStatus('');}}>Editar</button>}<button className="textButton danger" onClick={()=>onDelete(tx.id)}>Borrar</button></div>}</td></tr>;
          })}
          {!state.transactions.length&&<tr><td colSpan={7} className="muted">No hay operaciones registradas. Pulsa «Nueva operación» para empezar.</td></tr>}
        </tbody></table></div>
      </Section>
      </div>}
      {view==='positions'&&<Section className="span12" title="Cómo calculamos la rentabilidad">
        <div className="explainList"><div><strong>Ganancia realizada</strong><p>Ventas netas menos coste asignado a las participaciones vendidas. Se utiliza coste medio ponderado móvil, no necesariamente la regla fiscal aplicable.</p></div>
        <div><strong>Ganancia latente</strong><p>Valor actual de las participaciones restantes menos su coste pendiente.</p></div>
        <div><strong>Resultado total</strong><p>Ganancias realizadas + latentes + dividendos netos. Equivale a valor actual + cobros netos − desembolsos totales.</p></div></div>
        <div className="miniStats"><div>Realizado + dividendos <strong>{eur(summary.realizedPnL)}</strong></div><div>Latente <strong>{unpriced ? '—' : eur(summary.unrealizedPnL)}</strong></div></div>
        <p className="hint">El porcentaje mostrado divide el resultado total entre el coste de todas las compras, incluidas comisiones. No es rentabilidad anualizada ni TIR; la rotación y el calendario de aportaciones afectan a su interpretación. No se calculan impuestos, divisas, retenciones ni ajustes de eventos corporativos.</p>
      </Section>
      }
      {view==='data'&&<Section className="span12" title="Tus datos, bajo control">
        <p className="muted">Los cambios se guardan en este navegador. Mi cuenta permite gestionar una copia en la nube cuando está configurada. Mi plan financiero exporta la copia completa con el perfil.</p>
        <p><Link className="textLink" href="/cuenta">Mi cuenta y copias entre dispositivos →</Link></p><p><Link className="textLink" href="/plan">Exportar copia completa →</Link></p><CsvImport/>
        <div className="actionStack"><button className="secondaryButton" onClick={download}>↓ Exportar cartera (.json)</button><button className="secondaryButton" onClick={()=>inputRef.current?.click()}>↑ Importar copia (.json)</button>
          <input ref={inputRef} type="file" accept="application/json,.json" className="visuallyHidden" onChange={onImport}/>
          <button className="secondaryButton" onClick={()=>{if(window.confirm('¿Restaurar la demostración? Esto sobrescribe los datos locales. Exporta antes si quieres guardar una copia.')){restoreDemo();setStatus('Demostración restaurada.');}}}>Ver demostración con datos ficticios</button>
          {!state.demoMode&&<button className="secondaryButton dangerOutline" onClick={()=>{if(window.confirm('¿Borrar los productos y operaciones de tu cartera? Exporta una copia antes.')){startBlank();setStatus('Cartera vaciada.');}}}>Vaciar mi cartera</button>}
        </div>
      </Section>}
    </div>
  </>;
}

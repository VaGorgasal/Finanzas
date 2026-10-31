import type {PricePoint,Currency} from '../lib/research.ts';
export function money(value:number,currency:Currency){return new Intl.NumberFormat('es-ES',{style:'currency',currency,maximumFractionDigits:4}).format(value);}
export function WatchChart({points,currency}:{points:PricePoint[];currency:Currency}){
 if(points.length<2)return <p>Faltan precios para dibujar el gráfico.</p>;
 const low=Math.min(...points.map(p=>p.price)),high=Math.max(...points.map(p=>p.price)),spread=high-low||1;
 const first=Date.parse(points[0].date),last=Date.parse(points.at(-1)!.date);
 const line=points.map(p=>`${10+(Date.parse(p.date)-first)/(last-first)*780},${150-(p.price-low)/spread*130}`).join(' ');
 return <figure className="watchChart"><figcaption>Último año disponible · cierres ajustados · {currency}</figcaption><svg viewBox="0 0 800 170" role="img" aria-label={'Evolución de cierres ajustados desde '+points[0].date+' hasta '+points.at(-1)!.date}><polyline points={line} fill="none" stroke="#087f78" strokeWidth="3"/></svg><div className="toolbar"><span>Mínimo: {money(low,currency)}</span><span>Máximo: {money(high,currency)}</span><span>{points[0].date} → {points.at(-1)!.date}</span></div><p className="hint">EODHD · {points.length} observaciones. Ajustado por dividendos y desdoblamientos. No es tu rentabilidad personal ni una cotización en directo.</p><details><summary>Ver precios del gráfico</summary><div className="tableScroll"><table className="dataTable"><thead><tr><th>Fecha</th><th>Cierre ajustado</th></tr></thead><tbody>{points.map(p=><tr key={p.date}><td>{p.date}</td><td>{money(p.price,currency)}</td></tr>)}</tbody></table></div></details></figure>;
}

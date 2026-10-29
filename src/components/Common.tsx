import type { ReactNode } from 'react';
export function Header({eyebrow,title,description,action}:{eyebrow:string,title:string,description:string,action?:ReactNode}) {
  return <header className="pageHeader"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="subtitle">{description}</p></div>{action}</header>;
}
export function Section({title,extra,children,className=''}:{title?:string,extra?:ReactNode,children:ReactNode,className?:string}) {
  return <section className={`panel ${className}`}><div className="panelHeading">{title&&<h2>{title}</h2>}{extra}</div>{children}</section>;
}
export function Tag({children,tone='neutral'}:{children:ReactNode,tone?:'neutral'|'mint'|'amber'|'red'}) {
  return <span className={`tag tag-${tone}`}>{children}</span>;
}
export function Info({children,tone='blue'}:{children:ReactNode,tone?:'blue'|'amber'|'red'}) {
  return <div className={`info info-${tone}`}>{children}</div>;
}
export function Pnl({amount,percent}:{amount:number,percent?:number|null}) {
  return <span className={amount>=-0.005?'up':'down'}>{amount>=0?'+':''}{new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(amount)}{percent!==undefined?<span className="small"> ({percent === null ? '—' : `${percent>=0?'+':''}${percent.toFixed(2).replace('.',',')} %`})</span>:null}</span>;
}

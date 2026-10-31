export const planLabels={cash:'Liquidez disponible (€)',otherAssets:'Otros activos, excluyendo tu cartera (€)',debt:'Deuda pendiente (€)',income:'Ingresos netos mensuales (€)',essential:'Gastos esenciales mensuales sin cuotas de deuda (€)',otherExpenses:'Otros gastos mensuales (€)',debtPayment:'Cuotas de deuda mensuales (€)',investments:'Aportaciones mensuales fuera de estos objetivos (€)'};
export type Goal={id:string;name:string;target:number;date:string;earmarked:number;monthly:number};
export type Receipt={id:string;name:string;amount:number;date:string};
export const fields=['cash','otherAssets','debt','income','essential','otherExpenses','debtPayment','investments'] as const;
export type Onboarding={completed:boolean;experience:'new'|'some'|'experienced'|null;investments:'yes'|'not-yet'|'later'};
export type Plan={onboarding?:Onboarding;version:1;cash:number|null;otherAssets:number|null;debt:number|null;income:number|null;essential:number|null;otherExpenses:number|null;debtPayment:number|null;investments:number|null;reserveMonths:number;goals:Goal[];receipts:Receipt[]};
export const PLAN_KEY='brujula-financial-plan-v1';
export function emptyPlan():Plan{return {version:1,cash:null,otherAssets:null,debt:null,income:null,essential:null,otherExpenses:null,debtPayment:null,investments:null,reserveMonths:3,goals:[],receipts:[]};}
const money=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1e12;
function day(s:unknown):boolean{if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00Z');return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===s;}
export function parsePlan(input:unknown):Plan{if(!input||typeof input!=='object')throw new Error('Plan no válido.');const p=input as Plan;
 if(p.version!==1||fields.some(k=>p[k]!==null&&!money(p[k]))||!money(p.reserveMonths)||p.reserveMonths>60||!Array.isArray(p.goals)||p.goals.length>20||!Array.isArray(p.receipts)||p.receipts.length>20)throw new Error('Revisa importes y formato del plan.');
 if(p.onboarding!==undefined){const o=p.onboarding;if(!o||typeof o.completed!=='boolean'||!['new','some','experienced',null].includes(o.experience)||!['yes','not-yet','later'].includes(o.investments))throw new Error('Revisa las preferencias de bienvenida.');}
 const ids=new Set<string>();for(const x of [...p.goals,...p.receipts]){if(!x||typeof x.id!=='string'||!x.id||ids.has(x.id)||typeof x.name!=='string'||!x.name.trim()||x.name.length>100||!day(x.date))throw new Error('Revisa nombres y fechas de objetivos e ingresos previstos.');ids.add(x.id);}
 for(const g of p.goals)if(!money(g.target)||g.target===0||!money(g.earmarked)||!money(g.monthly))throw new Error('Revisa los importes de tus objetivos.');
 for(const r of p.receipts)if(!money(r.amount)||r.amount===0)throw new Error('Revisa los ingresos previstos.');
 return {version:1,...(p.onboarding?{onboarding:{completed:p.onboarding.completed,experience:p.onboarding.experience,investments:p.onboarding.investments}}:{}),...Object.fromEntries(fields.map(k=>[k,p[k]])),reserveMonths:p.reserveMonths,goals:p.goals.map(g=>({id:g.id,name:g.name.trim(),target:g.target,date:g.date,earmarked:g.earmarked,monthly:g.monthly})),receipts:p.receipts.map(r=>({id:r.id,name:r.name.trim(),amount:r.amount,date:r.date}))} as Plan;
}
export function analyzePlan(input:Plan,portfolio:number|null,today:string){const p=parsePlan(input);const known=fields.filter(k=>p[k]!==null).length;
 const surplus=[p.income,p.essential,p.otherExpenses,p.debtPayment,p.investments].every(x=>x!==null)?p.income!-p.essential!-p.otherExpenses!-p.debtPayment!-p.investments!:null;
 const reserve=p.essential!==null&&p.debtPayment!==null?(p.essential+p.debtPayment)*p.reserveMonths:null;
 const available=p.cash!==null&&reserve!==null?Math.max(0,p.cash-reserve):null;
 const assigned=p.goals.reduce((n,g)=>n+g.earmarked,0),monthly=p.goals.reduce((n,g)=>n+g.monthly,0);
 const net=p.cash!==null&&p.otherAssets!==null&&p.debt!==null&&portfolio!==null?p.cash+p.otherAssets+portfolio-p.debt:null;
 const warnings:string[]=[];
 if(surplus!==null&&surplus<0)warnings.push('Tu presupuesto mensual presenta déficit.');
 if(surplus!==null&&monthly>Math.max(0,surplus))warnings.push('Las aportaciones a objetivos superan el excedente mensual.');
 if(available!==null&&assigned>available)warnings.push('Se ha asignado más liquidez de la disponible después de la reserva. Evita contar el mismo dinero varias veces.');
 if(p.cash!==null&&reserve!==null&&p.cash<reserve)warnings.push('La liquidez no cubre la reserva elegida.');
 const coherent=surplus!==null&&available!==null&&surplus>=0&&assigned<=available&&monthly<=surplus;
 const [y,m]=today.split('-').map(Number);const goals=p.goals.map(g=>{const [gy,gm]=g.date.split('-').map(Number);const months=Math.max(0,(gy-y)*12+gm-m);const projected=g.earmarked+g.monthly*months;return {...g,months,projected,gap:Math.max(0,g.target-projected),required:months?Math.max(0,g.target-g.earmarked)/months:null,feasible:coherent&&g.date>=today&&projected>=g.target};});
 return {known,surplus,reserve,available,net,warnings,goals,uncertain:p.receipts.reduce((n,r)=>n+r.amount,0)};
}

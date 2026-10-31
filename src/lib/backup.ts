import {parseWatchlist,WATCH_KEY} from './watchlist.ts';
import {workspaceStorage} from './workspace-storage.ts';
import {parsePortfolio,STORAGE_KEY} from './storage.ts';
import {parsePlan,emptyPlan,PLAN_KEY} from './financial-plan.ts';
import {parseProfile} from './advisor.ts';
import {parseSnapshots} from './analytics.ts';
import {parseCompositions} from './exposures.ts';
import type {PortfolioState} from './types.ts';
export const PROFILE_KEY='brujula-investor-profile-v1';
export const HISTORY_KEY='brujula-history-v1';
export const EXPOSURES_KEY='brujula-exposures-v1';
export function parseBackup(input:unknown){
 if(!input||typeof input!=='object')throw new Error('Copia no válida.');const x=input as Record<string,unknown>;
 if(!['brujula-complete-v1','brujula-complete-v2','brujula-complete-v3'].includes(String(x.format)))throw new Error('Formato de copia no reconocido.');
 const profile=x.profile==null?null:parseProfile(x.profile);if(x.profile!=null&&!profile)throw new Error('Perfil no válido.');
 return {format:'brujula-complete-v3' as const,portfolio:parsePortfolio(x.portfolio),plan:parsePlan(x.plan),profile,history:parseSnapshots(x.history??[]),compositions:parseCompositions(x.compositions??[]),watchlist:parseWatchlist(x.watchlist??[])};
}
export function createBackup(portfolio:PortfolioState){
 const read=(key:string)=>{const raw=workspaceStorage().getItem(key);return raw?JSON.parse(raw):null;};
 return parseBackup({format:'brujula-complete-v3',portfolio,plan:read(PLAN_KEY)??emptyPlan(),profile:read(PROFILE_KEY),history:read(HISTORY_KEY)??[],compositions:read(EXPOSURES_KEY)??[],watchlist:read(WATCH_KEY)??[]});
}
/** Roll back every key on a quota/access error. Never partially replace a backup. */
export function restoreBackupExtras(input:ReturnType<typeof parseBackup>){
 const entries=[[STORAGE_KEY,input.portfolio],[PLAN_KEY,input.plan],[PROFILE_KEY,input.profile],[HISTORY_KEY,input.history],[EXPOSURES_KEY,input.compositions],[WATCH_KEY,input.watchlist]] as const;
 const old=entries.map(([key])=>[key,workspaceStorage().getItem(key)] as const);
 try{for(const [key,value] of entries)workspaceStorage().setItem(key,JSON.stringify(value));}
 catch(e){for(const [key,value] of old){try{if(value===null)workspaceStorage().removeItem(key);else workspaceStorage().setItem(key,value);}catch{}}throw e;}
 window.dispatchEvent(new Event('brujula-data-restored'));
}
export function downloadJson(value:unknown,name:string){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

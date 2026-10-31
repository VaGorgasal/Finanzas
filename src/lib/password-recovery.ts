/** These flags select a screen only. Supabase still authorizes every password update. */
export const RECOVERY_KEY='brujula-password-recovery-v1';
const WINDOW_MS=30*60*1000;
type Store=Pick<Storage,'getItem'|'setItem'|'removeItem'>|null;
export function recoveryStorage():Store{try{return window.sessionStorage;}catch{return null;}}
export function recoveryRequested(href:string):boolean{
 const url=new URL(href);return url.searchParams.get('recuperar')==='1'||new URLSearchParams(url.hash.slice(1)).get('type')==='recovery';
}
export function rememberRecovery(storage:Store,userId:string,now=Date.now()){
 try{storage?.setItem(RECOVERY_KEY,JSON.stringify({userId,expires:now+WINDOW_MS}));}catch{/* The current page still works if session storage is unavailable. */}
}
export function resumeRecovery(storage:Store,userId:string,now=Date.now()):boolean{
 try{const value=JSON.parse(storage?.getItem(RECOVERY_KEY)??'null');return value?.userId===userId&&Number.isFinite(value.expires)&&value.expires>now&&value.expires<=now+WINDOW_MS;}catch{return false;}
}
export function forgetRecovery(storage:Store){try{storage?.removeItem(RECOVERY_KEY);}catch{}}
export function recoveryFinishedUrl(href:string):string{
 const url=new URL(href);url.searchParams.delete('recuperar');if(new URLSearchParams(url.hash.slice(1)).get('type')==='recovery')url.hash='';return url.pathname+url.search+url.hash;
}

export const DATA_KEYS=['brujula-financiera-v02','brujula-financial-plan-v1','brujula-investor-profile-v1','brujula-history-v1','brujula-exposures-v1'] as const;
let scope='local';
export function setStorageScope(value:string){scope=value;}
export function scopedKey(key:string,owner=scope){return owner==='local'?key:`brujula:account:${owner}:${key}`;}
/** Capture the owner so an outstanding operation cannot write into a new session. */
export function workspaceStorage(owner=scope):Pick<Storage,'getItem'|'setItem'|'removeItem'>{
 return {
  getItem:key=>window.localStorage.getItem(scopedKey(key,owner)),
  setItem(key,value){const full=scopedKey(key,owner);if(window.localStorage.getItem(full)===value)return;window.localStorage.setItem(full,value);window.dispatchEvent(new CustomEvent('brujula-local-change',{detail:{owner,key}}));},
  removeItem(key){window.localStorage.removeItem(scopedKey(key,owner));window.dispatchEvent(new CustomEvent('brujula-local-change',{detail:{owner,key}}));},
 };
}

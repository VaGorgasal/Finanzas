export type RemoteProfile<T>={payload:T;revision:number;updatedAt:string}|null;
export type SyncState={phase:'loading'|'saved'|'pending'|'saving'|'conflict'|'error';message:string;date?:string};
type Meta={revision:number|null;base:string;dirty:boolean};
export function stableJson(value:unknown):string{if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return '['+value.map(stableJson).join(',')+']';return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stableJson((value as Record<string,unknown>)[k])).join(',')+'}';}
export class ProfileSync<T>{
 private revision:number|null=null;private base='';private started=false;private stopped=false;private blocked=false;private writing=false;private timer:ReturnType<typeof setTimeout>|null=null;
 private deps:{read:()=>T;apply:(value:T)=>void;empty:()=>T;getMeta:()=>Meta|null;setMeta:(m:Meta)=>void;load:()=>Promise<RemoteProfile<T>>;save:(payload:T,revision:number|null)=>Promise<{revision:number;updatedAt:string}>;status:(s:SyncState)=>void;ready:()=>void;delay?:number};
 constructor(deps:ProfileSync<T>["deps"]){this.deps=deps;}
 private emit(s:SyncState){if(!this.stopped)this.deps.status(s);}
 private meta(dirty:boolean){try{this.deps.setMeta({revision:this.revision,base:this.base,dirty});return true;}catch{this.blocked=true;this.emit({phase:'error',message:'El navegador no permite registrar el estado de sincronización. Conserva la pestaña y exporta una copia.'});return false;}}
 async start(){try{const remote=await this.deps.load();if(this.stopped)return;const meta=this.deps.getMeta();let local:T;try{local=this.deps.read();}catch{this.blocked=true;this.started=true;this.deps.ready();this.emit({phase:'conflict',message:'Hay datos locales que no se pueden leer. Se conservan sin sobrescribir. Recupera la versión de tu cuenta cuando hayas guardado el original.'});return;}
  const pending=!!meta?.dirty&&stableJson(local)!==meta.base;
  this.revision=remote?.revision??null;this.base=remote?stableJson(remote.payload):stableJson(this.deps.empty());this.started=true;
  if(pending&&meta?.revision!==this.revision){this.blocked=true;this.deps.ready();this.emit({phase:'conflict',message:'Hay cambios locales pendientes y una versión distinta en tu cuenta. Elige cuál conservar.'});return;}
  if(pending){this.deps.ready();this.changed();return;}
  this.deps.apply(remote?.payload??this.deps.empty());if(!this.meta(false)){this.deps.ready();return;}this.deps.ready();this.emit({phase:'saved',message:remote?'Perfil de tu cuenta cargado.':'Tu perfil está listo. Los cambios se guardarán automáticamente.',date:remote?.updatedAt});
 }catch{this.emit({phase:'error',message:'No se ha podido cargar tu perfil. Reintenta la conexión; no hemos reemplazado los datos locales.'});}}
 changed(){if(!this.started||this.stopped)return;if(!this.meta(true))return;if(this.blocked)return;this.emit({phase:'pending',message:'Cambios pendientes de guardar en tu cuenta.'});if(this.timer)clearTimeout(this.timer);this.timer=setTimeout(()=>{void this.flush();},this.deps.delay??1000);}
 async flush(){if(!this.started||this.stopped||this.blocked||this.writing)return;
  let local:T;let fingerprint:string;try{local=this.deps.read();fingerprint=stableJson(local);}catch{this.emit({phase:'error',message:'No se puede guardar el perfil: revisa los datos y sal de la demostración.'});return;}
  if(fingerprint===this.base){if(!this.meta(false))return;this.emit({phase:'saved',message:'Sin cambios pendientes.'});return;}
  this.writing=true;this.emit({phase:'saving',message:'Guardando en tu cuenta…'});
  try{const result=await this.deps.save(local,this.revision);if(this.stopped)return;this.revision=result.revision;this.base=fingerprint;const more=stableJson(this.deps.read())!==this.base;if(!this.meta(more))return;this.emit({phase:more?'pending':'saved',message:more?'Guardando los últimos cambios…':'Perfil guardado en tu cuenta.',date:result.updatedAt});if(more){this.writing=false;await this.flush();}}
  catch{if(!this.stopped){this.blocked=true;if(!this.meta(true))return;this.emit({phase:'conflict',message:'No se ha podido guardar: puede haber cambios en otro dispositivo o un fallo de conexión. Conservamos los cambios locales. Comprueba el estado antes de continuar.'});}}
  finally{this.writing=false;}
 }
 async check(){if(this.stopped||!this.started||this.writing||this.blocked)return;let clean=false;try{clean=stableJson(this.deps.read())===this.base;}catch{return;}if(!clean)return;
  try{const remote=await this.deps.load();if(this.stopped||this.writing||this.blocked||stableJson(this.deps.read())!==this.base)return;if((remote?.revision??null)===this.revision)return;this.revision=remote?.revision??null;this.base=stableJson(remote?.payload??this.deps.empty());this.deps.apply(remote?.payload??this.deps.empty());if(!this.meta(false))return;this.emit({phase:'saved',message:'Perfil actualizado desde tu cuenta.',date:remote?.updatedAt});}catch{/* Next focus or retry checks again; local data is kept. */}}
 async resolve(prefer:'remote'|'local'){if(this.writing||this.stopped)return;try{const remote=await this.deps.load();if(this.stopped)return;this.revision=remote?.revision??null;this.base=stableJson(remote?.payload??this.deps.empty());this.blocked=false;this.started=true;
  if(prefer==='remote'){this.deps.apply(remote?.payload??this.deps.empty());if(!this.meta(false)){this.deps.ready();return;}this.deps.ready();this.emit({phase:'saved',message:'Perfil recuperado desde tu cuenta.',date:remote?.updatedAt});}
  else{this.deps.ready();this.changed();await this.flush();}
 }catch{this.blocked=true;this.emit({phase:'error',message:'No se puede conectar con tu cuenta. Los datos locales se mantienen.'});}}
 async leave(){await this.flush();if(this.writing||this.blocked)return false;try{return !this.started||stableJson(this.deps.read())===this.base;}catch{return false;}}
 stop(){this.stopped=true;if(this.timer)clearTimeout(this.timer);}
}

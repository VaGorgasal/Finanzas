'use client';
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import type {User} from '@supabase/supabase-js';
import {usePathname} from 'next/navigation';
import {AccessWelcome} from '../components/AccessWelcome';
import {PasswordRecovery} from '../components/PasswordRecovery';
import {recoveryRequested,rememberRecovery,resumeRecovery,forgetRecovery,recoveryStorage,recoveryFinishedUrl} from '../lib/password-recovery.ts';
import {browserDatabase} from '../lib/supabase.ts';
import {createBackup,parseBackup,restoreBackupExtras} from '../lib/backup.ts';
import {makeEmptyPortfolio} from '../data/empty.ts';
import {emptyPlan} from '../lib/financial-plan.ts';
import {DATA_KEYS,setStorageScope,workspaceStorage} from '../lib/workspace-storage.ts';
import {ProfileSync,type SyncState} from '../lib/profile-sync.ts';
import {PortfolioProvider} from './PortfolioContext';
type Backup=ReturnType<typeof parseBackup>;
type Account={user:User|null;configured:boolean;recovery:boolean;clearRecovery:()=>void;sync:SyncState;resolve:(preference:'remote'|'local')=>Promise<void>;signOut:()=>Promise<boolean>};
const Context=createContext<Account|null>(null);
function emptyBackup():Backup{return parseBackup({format:'brujula-complete-v3',portfolio:makeEmptyPortfolio(),plan:emptyPlan()});}
function Gate({user,configured,onStatus,controllerRef,children}:{user:User|null;configured:boolean;onStatus:(s:SyncState)=>void;controllerRef:React.MutableRefObject<ProfileSync<Backup>|null>;children:ReactNode}){
 const [prepared,setPrepared]=useState(false),[epoch,setEpoch]=useState(0),[retry,setRetry]=useState(0);const path=usePathname();const ownerId=user?.id;const {sync:syncStatus}=useAccount();
 useEffect(()=>{
  const db=browserDatabase();const owner=ownerId??(configured?'signed-out':'local');setStorageScope(owner);
  let alive=true;
  if(!ownerId||!db){queueMicrotask(()=>{if(alive)setPrepared(true);});return ()=>{alive=false;};}
  const storage=workspaceStorage(owner);let applying=false;
  const sync=new ProfileSync<Backup>({
   read:()=>{const raw=storage.getItem(DATA_KEYS[0]);const portfolio=raw?JSON.parse(raw):makeEmptyPortfolio();if(portfolio.demoMode)throw new Error('Modo demo');return createBackup(portfolio);},
   empty:emptyBackup,
   apply:backup=>{applying=true;try{restoreBackupExtras(backup);}finally{applying=false;}if(alive)setEpoch(e=>e+1);},
   getMeta:()=>{try{const raw=storage.getItem('sync-meta-v1');return raw?JSON.parse(raw):null;}catch{return null;}},
   setMeta:meta=>storage.setItem('sync-meta-v1',JSON.stringify(meta)),
   load:async()=>{const {data,error}=await db.from('user_backups').select('payload,revision,updated_at').eq('user_id',ownerId).maybeSingle();if(error)throw error;return data?{payload:parseBackup(data.payload),revision:data.revision,updatedAt:data.updated_at}:null;},
   save:async(payload,revision)=>{const next=(revision??0)+1;const updatedAt=new Date().toISOString();const row={user_id:ownerId,payload,revision:next,updated_at:updatedAt};const result=revision===null?await db.from('user_backups').insert(row).select('revision').single():await db.from('user_backups').update(row).eq('user_id',ownerId).eq('revision',revision).select('revision').single();if(result.error)throw result.error;return {revision:result.data.revision,updatedAt};},
   status:s=>{if(alive)onStatus(s);},ready:()=>{if(alive)setPrepared(true);},
  });
  controllerRef.current=sync;
  const change=(event:Event)=>{const {owner:source,key}=(event as CustomEvent).detail??{};if(!applying&&source===owner&&DATA_KEYS.includes(key))sync.changed();};
  const focus=()=>{if(document.visibilityState==='visible')void sync.check();};
  const beforeLeave=(event:BeforeUnloadEvent)=>{try{const meta=storage.getItem('sync-meta-v1');if(meta&&JSON.parse(meta).dirty){event.preventDefault();event.returnValue='';}}catch{}};
  window.addEventListener('brujula-local-change',change);window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);window.addEventListener('beforeunload',beforeLeave);
  const timer=setInterval(focus,30000);void sync.start();
  return ()=>{alive=false;sync.stop();if(controllerRef.current===sync)controllerRef.current=null;clearInterval(timer);window.removeEventListener('brujula-local-change',change);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);window.removeEventListener('beforeunload',beforeLeave);};
 },[ownerId,configured,onStatus,controllerRef,retry]);
 if(!prepared)return <div className="accountLoading"><h1>Cargando tu perfil…</h1><p>{syncStatus.phase==='error'?syncStatus.message:'Conectando con los datos de tu cuenta.'}</p><button className="secondaryButton" onClick={()=>setRetry(r=>r+1)}>Reintentar conexión</button><button className="textButton" onClick={()=>browserDatabase()?.auth.signOut()}>Volver al acceso</button></div>;
 const publicPage=['/cuenta','/faq','/academia','/mercados'].includes(path);
 return <PortfolioProvider key={epoch}>{configured&&!user&&!publicPage?<AccessWelcome/>:children}</PortfolioProvider>;
}
export function AccountProvider({children}:{children:ReactNode}){
 const configured=!!(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
 const [user,setUser]=useState<User|null>(null),[ready,setReady]=useState(false),[recovery,setRecovery]=useState(false),[sync,setSync]=useState<SyncState>({phase:'loading',message:'Preparando tu cuenta…'});
 const controllerRef=useRef<ProfileSync<Backup>|null>(null);const requestedRef=useRef<boolean|null>(null);
 useEffect(()=>{requestedRef.current??=recoveryRequested(window.location.href);let requested=requestedRef.current;const db=browserDatabase();let alive=true;let events=0;if(!db){queueMicrotask(()=>{if(alive)setReady(true);});return ()=>{alive=false;};}
  const {data}=db.auth.onAuthStateChange((event,session)=>{events++;if(!alive)return;setUser(session?.user??null);if(session?.user){const recovering=event==='PASSWORD_RECOVERY'||requested||resumeRecovery(recoveryStorage(),session.user.id);if(recovering){requested=false;requestedRef.current=false;rememberRecovery(recoveryStorage(),session.user.id);}setRecovery(recovering);}if(event==='SIGNED_OUT'){forgetRecovery(recoveryStorage());setRecovery(false);}setReady(true);});
  const observed=events;void db.auth.getSession().then(async({data,error})=>{if(error)throw error;const actual=data.session?await db.auth.getUser():null;if(actual?.error)throw actual.error;if(alive&&events===observed){const current=actual?.data.user;setUser(current??null);if(current&&(requested||resumeRecovery(recoveryStorage(),current.id))){requested=false;requestedRef.current=false;rememberRecovery(recoveryStorage(),current.id);setRecovery(true);}setReady(true);}}).catch(()=>{if(alive)setSync({phase:'error',message:'No se ha podido verificar la sesión. Recarga para volver a intentarlo.'});});
  return ()=>{alive=false;data.subscription.unsubscribe();};
 },[]);
 async function signOut(){const saved=await controllerRef.current?.leave();if(saved===false&&!confirm('Hay cambios pendientes de guardar. Se conservarán en este navegador para esta cuenta. ¿Cerrar sesión igualmente?'))return false;const db=browserDatabase();if(!db)return false;const {error}=await db.auth.signOut();if(error){setSync({phase:'error',message:'No se pudo cerrar la sesión. Inténtalo de nuevo.'});return false;}return true;}
 const value:Account={user,configured,recovery,clearRecovery:()=>{forgetRecovery(recoveryStorage());window.history.replaceState(null,'',recoveryFinishedUrl(window.location.href));setRecovery(false);},sync,resolve:async preference=>{await controllerRef.current?.resolve(preference);},signOut};
 return <Context.Provider value={value}>{ready?(recovery&&user?<PasswordRecovery email={user.email} onComplete={value.clearRecovery}/>:<Gate key={user?.id??'guest'} user={user} configured={configured} onStatus={setSync} controllerRef={controllerRef}>{children}</Gate>):<div className="accountLoading"><h1>Preparando Brújula…</h1><p>{sync.phase==='error'?sync.message:'Comprobando la sesión.'}</p></div>}</Context.Provider>;
}
export function useAccount(){const value=useContext(Context);if(!value)throw new Error('AccountProvider no disponible.');return value;}

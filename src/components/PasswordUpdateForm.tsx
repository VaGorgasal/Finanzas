'use client';
import {useState,type FormEvent} from 'react';
import {browserDatabase} from '../lib/supabase.ts';
import {passwordIssue} from '../lib/account-validation.ts';
export function PasswordUpdateForm({onSaved}:{onSaved?:()=>void}){
 const [password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[saved,setSaved]=useState(false);
 async function submit(event:FormEvent){
  event.preventDefault();const issue=passwordIssue(password,confirmation);if(issue){setStatus(issue);return;}
  const db=browserDatabase();if(!db){setStatus('El acceso por cuentas no está disponible en este despliegue.');return;}
  setBusy(true);setStatus('');
  try{const {error}=await db.auth.updateUser({password});if(error)throw error;setPassword('');setConfirmation('');setSaved(true);onSaved?.();}
  catch{setStatus('No se pudo guardar la contraseña. El enlace puede haber caducado o requerir una verificación reciente. Solicita un nuevo enlace de recuperación e inténtalo otra vez.');}
  finally{setBusy(false);}
 }
 if(saved)return <div role="status" className="info"><strong>Contraseña guardada.</strong><p>Ya puedes entrar con tu email y la nueva contraseña.</p></div>;
 return <form onSubmit={submit} className="formStack">
 <div className="field"><label htmlFor="new-account-password">Nueva contraseña</label><input id="new-account-password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/></div>
 <div className="field"><label htmlFor="confirm-account-password">Repite la nueva contraseña</label><input id="confirm-account-password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></div>
 <p className="hint">Al menos 12 caracteres. Puedes usar una frase larga que no reutilices en otros servicios.</p>
 <button className="primaryButton" disabled={busy}>{busy?'Guardando…':'Guardar nueva contraseña'}</button>
 {status&&<p role="alert" className="info">{status}</p>}
 </form>;
}

'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Header,Section} from './Common';
import {PasswordUpdateForm} from './PasswordUpdateForm';
import {forgetRecovery,recoveryStorage,recoveryFinishedUrl} from '../lib/password-recovery.ts';
/** Independent of portfolio loading: recovering access must not wait on financial data. */
export function PasswordRecovery({email,onComplete}:{email:string|undefined;onComplete:()=>void}){
 const [saved,setSaved]=useState(false);const router=useRouter();
 function leave(){onComplete();router.replace('/cuenta');}
 function finish(){forgetRecovery(recoveryStorage());window.history.replaceState(null,'',recoveryFinishedUrl(window.location.href));setSaved(true);}
 return <main className="passwordRecoveryPage" id="contenido">
 <Header eyebrow="RECUPERAR EL ACCESO" title="Elige tu nueva contraseña" description="El enlace del correo verifica tu acceso. Falta guardar la contraseña que usarás la próxima vez."/>
 <Section title={saved?'Tu acceso está preparado':'Establecer contraseña'}>
 {email&&<p className="recoveryEmail">Cuenta: <strong>{email}</strong></p>}
 <PasswordUpdateForm onSaved={finish}/>
 {saved&&<button className="primaryButton" onClick={leave}>Continuar a mi cuenta →</button>}
 {!saved&&<button className="textButton" onClick={leave}>Volver a mi cuenta</button>}
 </Section></main>;
}

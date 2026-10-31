'use client';
import {workspaceStorage} from '../lib/workspace-storage.ts';

import {useEffect,useState} from 'react';
import {PLAN_KEY,emptyPlan,parsePlan,type Plan} from '../lib/financial-plan.ts';
export function useFinancialPlan(){const [plan,setPlan]=useState<Plan>(emptyPlan),[ready,setReady]=useState(false),[error,setError]=useState('');
 useEffect(()=>{try{const raw=workspaceStorage().getItem(PLAN_KEY);
 // eslint-disable-next-line react-hooks/set-state-in-effect
 if(raw)setPlan(parsePlan(JSON.parse(raw)));
 }catch{setError('No se ha podido recuperar el plan guardado.');}setReady(true);
 const reload=()=>{try{const raw=workspaceStorage().getItem(PLAN_KEY);setPlan(raw?parsePlan(JSON.parse(raw)):emptyPlan());setError('');}catch{setError('No se ha podido recuperar el plan.');}};window.addEventListener('brujula-data-restored',reload);return ()=>window.removeEventListener('brujula-data-restored',reload);},[]);
 function save(input:unknown){try{const valid=parsePlan(input);workspaceStorage().setItem(PLAN_KEY,JSON.stringify(valid));setPlan(valid);setError('');return true;}catch(e){setError(e instanceof Error?e.message:'No se ha podido guardar.');return false;}}
 return {plan,ready,error,save};}

'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { makeDemoPortfolio } from '../data/demo';
import { calculatePortfolio, isValidDay, todayIso, validateLedger } from '../lib/portfolio';
import { parsePortfolio, readPortfolio, savePortfolio } from '../lib/storage';
import type { Instrument, PortfolioState, Transaction } from '../lib/types';

type Result = { ok: true } | { ok: false; error: string };
type ContextType = {
  state: PortfolioState;
  ready: boolean;
  summary: ReturnType<typeof calculatePortfolio>;
  addTransaction: (tx: Transaction) => Result;
  editTransaction: (tx: Transaction) => Result;
  deleteTransaction: (id: string) => Result;
  addInstrument: (asset: Instrument) => Result;
  updatePrice: (id: string, price: number, date: string) => Result;
  importJson: (input: unknown) => Result;
  restoreDemo: () => void;
  startBlank: () => void;
  completeLesson: (id: string) => void;
};
const Context = createContext<ContextType | undefined>(undefined);

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PortfolioState>(makeDemoPortfolio);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // Carga el estado solo en cliente, conservando HTML inicial estable para SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(readPortfolio());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, []);
  useEffect(() => { if (ready) savePortfolio(state); }, [ready, state]);
  const summary = useMemo(() => calculatePortfolio(state.instruments, state.transactions), [state]);
  const safeLedger = (txs: Transaction[]) => validateLedger(txs, state.instruments);

  function addTransaction(tx: Transaction): Result {
    if (state.demoMode) return {ok:false,error:"Activa primero una cartera personal; los movimientos de demostración son ficticios."};
    if (state.transactions.some(x => x.id === tx.id)) return {ok:false,error:'Identificador repetido.'};
    const error = safeLedger([...state.transactions, tx]);
    if (error) return {ok:false,error};
    setState(s => ({...s, demoMode:false, transactions:[...s.transactions, tx]}));
    return {ok:true};
  }
  function editTransaction(tx: Transaction): Result {
    if (state.demoMode) return {ok:false,error:"Activa primero una cartera personal."};
    if (!state.transactions.some(x => x.id === tx.id)) return {ok:false,error:'Operación no encontrada.'};
    const updated = state.transactions.map(x => x.id === tx.id ? tx : x);
    const error = safeLedger(updated);
    if (error) return {ok:false,error};
    setState(s => ({...s, demoMode:false, transactions:updated}));
    return {ok:true};
  }
  function deleteTransaction(id: string): Result {
    if (state.demoMode) return {ok:false,error:"Activa primero una cartera personal."};
    const updated = state.transactions.filter(x => x.id !== id);
    const error = safeLedger(updated);
    if (error) return {ok:false,error:`No se puede borrar: ${error}`};
    setState(s => ({...s, demoMode:false, transactions:updated}));
    return {ok:true};
  }
  function addInstrument(instrument: Instrument): Result {
    if (state.demoMode) return {ok:false,error:"Activa primero una cartera personal."};
    if (!/^[A-Z]{2}[A-Z0-9]{10}$/.test(instrument.isin)) return {ok:false,error:'Introduce un ISIN de 12 caracteres (formato, no verificación de existencia).'};
    if (state.instruments.some(x => x.isin === instrument.isin || x.id === instrument.id)) return {ok:false,error:'Ese producto ya está registrado.'};
    if (!Number.isFinite(instrument.price) || instrument.price <= 0 || !isValidDay(instrument.priceDate) || instrument.priceDate > todayIso()) return {ok:false,error:'El precio debe ser positivo y la fecha válida.'};
    setState(s => ({...s, demoMode:false, instruments:[...s.instruments, instrument]}));
    return {ok:true};
  }
  function updatePrice(id: string, price: number, date: string): Result {
    if (!Number.isFinite(price) || price <= 0 || price > 1e9 || !isValidDay(date) || date > todayIso()) return {ok:false,error:'Indica precio y fecha válidos.'};
    setState(s => ({...s, instruments:s.instruments.map(x => x.id === id ? {...x,price,priceDate:date,quoteSource:'manual'} : x)}));
    return {ok:true};
  }
  function importJson(input: unknown): Result {
    try { const imported = parsePortfolio(input); setState(imported); return {ok:true}; }
    catch (e) { return {ok:false,error:e instanceof Error ? e.message : 'No se ha podido leer el archivo.'}; }
  }
  function completeLesson(id: string) {
    setState(s => s.completedLessons.includes(id) ? s : ({...s,completedLessons:[...s.completedLessons,id]}));
  }
  function restoreDemo() { setState(makeDemoPortfolio()); }
  function startBlank() { const demo = makeDemoPortfolio(); setState({...demo, demoMode:false, transactions:[]}); }

  const ctx: ContextType = {state, ready, summary, addTransaction, editTransaction, deleteTransaction,
    addInstrument, updatePrice, importJson, restoreDemo, startBlank, completeLesson};
  return <Context.Provider value={ctx}>{children}</Context.Provider>;
}
export function usePortfolio(): ContextType {
  const value = useContext(Context);
  if (!value) throw new Error('usePortfolio requiere PortfolioProvider');
  return value;
}

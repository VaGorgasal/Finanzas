import type {Transaction} from './types.ts';

/** The execution price belongs to the transaction, not today's valuation. */
export function executionPrice(amount:number,units:number):number|null {
  if(!Number.isFinite(amount)||!Number.isFinite(units)||amount<=0||units<=0)return null;
  const price=amount/units;
  return Number.isFinite(price)&&price>0?price:null;
}

/** Keep the original FX evidence when editing units; never silently erase it. */
export function preserveTransactionFx(draft:Transaction,original:Transaction|null):Transaction {
  if(!original?.fx)return draft;
  if(draft.amount!==original.amount||draft.fee!==original.fee||draft.date!==original.date||draft.type!==original.type||draft.instrumentId!==original.instrumentId)
    throw new Error('Esta operación tiene una conversión de divisa registrada. Aquí puedes corregir las participaciones; conserva producto, tipo, fecha, importe y comisión para mantener la conversión original.');
  return {...draft,fx:{...original.fx}};
}

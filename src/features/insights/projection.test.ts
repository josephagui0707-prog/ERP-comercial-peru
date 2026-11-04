import {describe,expect,it} from 'vitest';
import {today} from '../../core/types';
import {makeEmpty} from '../../core/empty';
import {makeSeed} from '../../core/seed';
import {projection} from './projection';
import {normalizeInventory} from '../inventory/model';
describe('Proyección y compatibilidad',()=>{
  it('fecha comercial peruana antes de la medianoche local',()=>{expect(today(new Date('2026-11-03T03:15:00Z'))).toBe('2026-11-02');});
  it('cruza el año y distingue meses sin actividad',()=>{const p=projection(makeEmpty(),'2026-02');expect(p.rows.map(r=>r.key)).toEqual(['2025-11','2025-12','2026-01']);expect(p.flow).toBeNull();expect(p.sales).toBeNull();});
  it('promedia meses cerrados, excluye pagos rechazados y calcula por separado ventas y efectivo',()=>{
    const s=makeEmpty(),months=['2025-11','2025-12','2026-01','2026-02'];
    s.expenses=months.map((m,i)=>({id:m,amount:[10,20,30,900][i],date:m+'-15',type:'egreso',category:'Servicios',description:'Aula'}));
    s.payments=[{id:'1',saleId:'A',amount:900,date:'2025-12-12',method:'demo',status:'rechazado',reference:''}];
    const p=projection(s,'2026-02');expect(p.flow).toBe(-20);expect(p.sales).toBeNull();
  });
  it('conserva inactivos los productos existentes al normalizar',()=>{const s=makeSeed();s.products[0].active=false;expect(normalizeInventory(s).products[0].active).toBe(false);});
});

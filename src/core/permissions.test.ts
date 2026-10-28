import {describe,expect,it} from 'vitest';
import {allowed} from './permissions';

describe('Visibilidad por rol de demostración',()=>{
  it('administrador ve todos los módulos registrados',()=>{
    for(const section of ['inicio','ventas','kardex','reportes','cloud','auditoria','compras']){
      expect(allowed('admin',section)).toBe(true);
    }
  });
  it('comercial accede únicamente a sus rutas y las comunes',()=>{
    expect(allowed('ventas','cobros')).toBe(true);
    expect(allowed('ventas','perfil')).toBe(true);
    expect(allowed('ventas','reportes')).toBe(false);
    expect(allowed('ventas','cloud')).toBe(false);
  });
  it('almacén no ve finanzas y finanzas no ve inventario',()=>{
    expect(allowed('almacen','kardex')).toBe(true);
    expect(allowed('almacen','finanzas')).toBe(false);
    expect(allowed('finanzas','reportes')).toBe(true);
    expect(allowed('finanzas','ajustes')).toBe(false);
  });
});

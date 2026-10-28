import {describe,it,expect} from 'vitest';
import {initialAccounts,reviseUser} from './users';
describe('Administración de cuentas locales',()=>{
 const admin=initialAccounts[0];
 it('crea cuentas y normaliza el correo',()=>{const next=reviseUser(initialAccounts,{...initialAccounts[1],id:'nuevo',email:' NUEVO@DEMO.PE '},admin.id);expect(next).toHaveLength(5);expect(next[4].email).toBe('nuevo@demo.pe');});
 it('rechaza correos duplicados sin distinguir mayúsculas',()=>{expect(()=>reviseUser(initialAccounts,{...initialAccounts[1],email:admin.email.toUpperCase()},admin.id)).toThrow('correo');});
 it('impide el autobloqueo del administrador',()=>{expect(()=>reviseUser(initialAccounts,{...admin,active:false},admin.id)).toThrow('propia');expect(()=>reviseUser(initialAccounts,{...admin,role:'ventas'},admin.id)).toThrow('propia');});
 it('permite desactivar y cambiar el rol de otras cuentas',()=>{const next=reviseUser(initialAccounts,{...initialAccounts[1],active:false,role:'finanzas'},admin.id);expect(next[1].active).toBe(false);expect(next[1].role).toBe('finanzas');});
 it('rechaza contraseñas cortas y evita perder el último administrador',()=>{expect(()=>reviseUser(initialAccounts,{...admin,password:'123'},admin.id)).toThrow('8');expect(()=>reviseUser(initialAccounts,{...admin,active:false},'otro')).toThrow('administrador activo');});
});

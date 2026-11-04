-- Esquema destino. Ejecutar una vez en una base PostgreSQL vacía con un rol migrador.
BEGIN;
CREATE SCHEMA erp;
SET LOCAL search_path TO erp, public;
CREATE TABLE empresa(id uuid PRIMARY KEY, nombre text NOT NULL);
CREATE TABLE producto(tenant_id uuid NOT NULL REFERENCES empresa, id uuid NOT NULL, sku text NOT NULL, nombre text NOT NULL, activo boolean NOT NULL DEFAULT true,
 PRIMARY KEY(tenant_id,id), UNIQUE(tenant_id,sku));
CREATE TABLE almacen(tenant_id uuid NOT NULL REFERENCES empresa, id uuid NOT NULL, nombre text NOT NULL, activo boolean NOT NULL DEFAULT true, PRIMARY KEY(tenant_id,id));
CREATE TABLE existencia(tenant_id uuid NOT NULL, producto_id uuid NOT NULL, almacen_id uuid NOT NULL, unidades bigint NOT NULL DEFAULT 0 CHECK(unidades>=0),
 PRIMARY KEY(tenant_id,producto_id,almacen_id), FOREIGN KEY(tenant_id,producto_id) REFERENCES producto, FOREIGN KEY(tenant_id,almacen_id) REFERENCES almacen);
CREATE TABLE movimiento(tenant_id uuid NOT NULL, id uuid NOT NULL, producto_id uuid NOT NULL, almacen_id uuid NOT NULL,
 delta bigint NOT NULL CHECK(delta<>0), concepto text NOT NULL, referencia text NOT NULL, clave_operacion text NOT NULL, linea integer NOT NULL CHECK(linea>0),
 actor_id uuid NOT NULL, registrado timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,id), UNIQUE(tenant_id,clave_operacion,linea), FOREIGN KEY(tenant_id,producto_id) REFERENCES producto, FOREIGN KEY(tenant_id,almacen_id) REFERENCES almacen);
CREATE INDEX kardex ON movimiento(tenant_id,producto_id,almacen_id,registrado,id);
CREATE FUNCTION aplicar_movimiento() RETURNS trigger LANGUAGE plpgsql SET search_path=erp,pg_temp AS $$
BEGIN
 INSERT INTO existencia(tenant_id,producto_id,almacen_id,unidades) VALUES(NEW.tenant_id,NEW.producto_id,NEW.almacen_id,0) ON CONFLICT DO NOTHING;
 UPDATE existencia SET unidades=unidades+NEW.delta
 WHERE tenant_id=NEW.tenant_id AND producto_id=NEW.producto_id AND almacen_id=NEW.almacen_id AND unidades+NEW.delta>=0;
 IF NOT FOUND THEN RAISE EXCEPTION 'Stock insuficiente'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER saldo_inventario AFTER INSERT ON movimiento FOR EACH ROW EXECUTE FUNCTION aplicar_movimiento();
CREATE FUNCTION inmutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Documento inmutable. Registre un movimiento inverso.'; END $$;
CREATE TRIGGER kardex_inmutable BEFORE UPDATE OR DELETE ON movimiento FOR EACH ROW EXECUTE FUNCTION inmutable();

CREATE TABLE tercero(tenant_id uuid NOT NULL REFERENCES empresa,id uuid NOT NULL,nombre text NOT NULL,documento text NOT NULL,PRIMARY KEY(tenant_id,id),UNIQUE(tenant_id,documento));
CREATE TABLE cuenta(tenant_id uuid NOT NULL REFERENCES empresa,id uuid NOT NULL,codigo text NOT NULL,nombre text NOT NULL,
 clase text NOT NULL CHECK(clase IN('activo','pasivo','patrimonio','ingreso','gasto')),PRIMARY KEY(tenant_id,id),UNIQUE(tenant_id,codigo));
CREATE TABLE asiento(tenant_id uuid NOT NULL REFERENCES empresa,id uuid NOT NULL,referencia text NOT NULL,fecha date NOT NULL,moneda char(3) NOT NULL DEFAULT 'PEN' CHECK(moneda='PEN'),
 estado text NOT NULL DEFAULT 'borrador' CHECK(estado IN('borrador','contabilizado')),actor_id uuid NOT NULL,
 PRIMARY KEY(tenant_id,id),UNIQUE(tenant_id,referencia));
CREATE TABLE apunte(tenant_id uuid NOT NULL, asiento_id uuid NOT NULL, linea integer NOT NULL CHECK(linea>0), cuenta_id uuid NOT NULL,
 debe numeric(16,2) NOT NULL DEFAULT 0, haber numeric(16,2) NOT NULL DEFAULT 0,
 CHECK((debe>0 AND haber=0) OR (haber>0 AND debe=0)),PRIMARY KEY(tenant_id,asiento_id,linea),
 FOREIGN KEY(tenant_id,asiento_id) REFERENCES asiento, FOREIGN KEY(tenant_id,cuenta_id) REFERENCES cuenta);
CREATE INDEX mayor_por_cuenta ON apunte(tenant_id,cuenta_id,asiento_id);
CREATE FUNCTION proteger_apunte() RETURNS trigger LANGUAGE plpgsql SET search_path=erp,pg_temp AS $$
DECLARE a apunte%ROWTYPE; estado_actual text;
BEGIN
 IF TG_OP='DELETE' THEN a:=OLD; ELSE a:=NEW; END IF;
 IF TG_OP='UPDATE' AND (OLD.tenant_id,OLD.asiento_id)<>(NEW.tenant_id,NEW.asiento_id) THEN RAISE EXCEPTION 'No se puede mover una línea a otro asiento'; END IF;
 SELECT estado INTO estado_actual FROM asiento WHERE tenant_id=a.tenant_id AND id=a.asiento_id FOR UPDATE;
 IF estado_actual IS DISTINCT FROM 'borrador' THEN RAISE EXCEPTION 'El asiento debe estar abierto'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER apunte_abierto BEFORE INSERT OR UPDATE OR DELETE ON apunte FOR EACH ROW EXECUTE FUNCTION proteger_apunte();
CREATE FUNCTION verificar_asiento() RETURNS trigger LANGUAGE plpgsql SET search_path=erp,pg_temp AS $$
DECLARE n integer; saldo numeric;
BEGIN
 IF TG_OP='INSERT' THEN
   IF NEW.estado<>'borrador' THEN RAISE EXCEPTION 'El asiento se inicia en borrador'; END IF;
   RETURN NEW;
 END IF;
 IF OLD.estado='contabilizado' THEN RAISE EXCEPTION 'El asiento está cerrado'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 IF NEW.estado='contabilizado' THEN
   SELECT count(*),sum(debe-haber) INTO n,saldo FROM apunte WHERE tenant_id=OLD.tenant_id AND asiento_id=OLD.id;
   IF n<2 OR saldo<>0 THEN RAISE EXCEPTION 'El asiento requiere al menos dos líneas y debe cuadrar'; END IF;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER asiento_cuadrado BEFORE INSERT OR UPDATE OR DELETE ON asiento FOR EACH ROW EXECUTE FUNCTION verificar_asiento();

CREATE TABLE documento_financiero(tenant_id uuid NOT NULL,id uuid NOT NULL,tercero_id uuid NOT NULL,asiento_id uuid NOT NULL,
 clase text NOT NULL CHECK(clase IN('cxc','cxp')),referencia text NOT NULL,emision date NOT NULL,vencimiento date NOT NULL CHECK(vencimiento>=emision),
 importe numeric(16,2) NOT NULL CHECK(importe>0),saldo numeric(16,2) NOT NULL CHECK(saldo BETWEEN 0 AND importe),
 PRIMARY KEY(tenant_id,id),UNIQUE(tenant_id,clase,referencia,tercero_id),UNIQUE(tenant_id,asiento_id),
 FOREIGN KEY(tenant_id,tercero_id) REFERENCES tercero,FOREIGN KEY(tenant_id,asiento_id) REFERENCES asiento);
CREATE INDEX cartera_abierta ON documento_financiero(tenant_id,clase,vencimiento) WHERE saldo>0;
CREATE TABLE liquidacion(tenant_id uuid NOT NULL,id uuid NOT NULL,documento_id uuid NOT NULL,asiento_id uuid NOT NULL,
 importe numeric(16,2) NOT NULL CHECK(importe>0),fecha date NOT NULL,clave_operacion text NOT NULL,
 PRIMARY KEY(tenant_id,id),UNIQUE(tenant_id,clave_operacion),UNIQUE(tenant_id,asiento_id),
 FOREIGN KEY(tenant_id,documento_id) REFERENCES documento_financiero,FOREIGN KEY(tenant_id,asiento_id) REFERENCES asiento);
CREATE FUNCTION documento_inicial() RETURNS trigger LANGUAGE plpgsql SET search_path=erp,pg_temp AS $$
BEGIN
 PERFORM 1 FROM asiento WHERE tenant_id=NEW.tenant_id AND id=NEW.asiento_id AND estado='contabilizado' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Contabilice el asiento de origen'; END IF;
 IF EXISTS(SELECT FROM liquidacion WHERE tenant_id=NEW.tenant_id AND asiento_id=NEW.asiento_id) THEN RAISE EXCEPTION 'Asiento ya utilizado para liquidar'; END IF;
 NEW.saldo:=NEW.importe;RETURN NEW;
END $$;
CREATE TRIGGER abrir_cartera BEFORE INSERT ON documento_financiero FOR EACH ROW EXECUTE FUNCTION documento_inicial();
CREATE FUNCTION aplicar_liquidacion() RETURNS trigger LANGUAGE plpgsql SET search_path=erp,pg_temp AS $$
BEGIN
 PERFORM 1 FROM asiento WHERE tenant_id=NEW.tenant_id AND id=NEW.asiento_id AND estado='contabilizado' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Contabilice el asiento de liquidación'; END IF;
 IF EXISTS(SELECT FROM documento_financiero WHERE tenant_id=NEW.tenant_id AND asiento_id=NEW.asiento_id) THEN RAISE EXCEPTION 'Use un asiento distinto al de emisión'; END IF;
 IF (SELECT sum(debe) FROM apunte WHERE tenant_id=NEW.tenant_id AND asiento_id=NEW.asiento_id) IS DISTINCT FROM NEW.importe THEN RAISE EXCEPTION 'El asiento de liquidación debe corresponder al importe aplicado'; END IF;
 UPDATE documento_financiero SET saldo=saldo-NEW.importe WHERE tenant_id=NEW.tenant_id AND id=NEW.documento_id AND saldo>=NEW.importe AND emision<=NEW.fecha;
 IF NOT FOUND THEN RAISE EXCEPTION 'Saldo insuficiente o fecha anterior a la emisión'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER saldo_cartera AFTER INSERT ON liquidacion FOR EACH ROW EXECUTE FUNCTION aplicar_liquidacion();
CREATE TRIGGER liquidacion_inmutable BEFORE UPDATE OR DELETE ON liquidacion FOR EACH ROW EXECUTE FUNCTION inmutable();

-- El backend abre una transacción y ejecuta set_config('app.tenant', $1, true)
-- usando el tenant autenticado. Una conexión sin contexto no ve filas.
ALTER TABLE empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa FORCE ROW LEVEL SECURITY;
CREATE POLICY propia_empresa ON empresa USING (id=nullif(current_setting('app.tenant',true),'')::uuid) WITH CHECK(id=nullif(current_setting('app.tenant',true),'')::uuid);
DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['producto','almacen','existencia','movimiento','tercero','cuenta','asiento','apunte','documento_financiero','liquidacion'] LOOP
   EXECUTE format('ALTER TABLE erp.%I ENABLE ROW LEVEL SECURITY',t);
   EXECUTE format('ALTER TABLE erp.%I FORCE ROW LEVEL SECURITY',t);
   EXECUTE format('CREATE POLICY propia_empresa ON erp.%I USING (tenant_id=nullif(current_setting(''app.tenant'',true),'''')::uuid) WITH CHECK (tenant_id=nullif(current_setting(''app.tenant'',true),'''')::uuid)',t);
 END LOOP;
END $$;
COMMIT;

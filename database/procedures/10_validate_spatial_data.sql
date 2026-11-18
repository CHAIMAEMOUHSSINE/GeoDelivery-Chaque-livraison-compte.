-- Demonstration PL/SQL facultative, a creer comme GEODELIVERY.
-- Execution : SET SERVEROUTPUT ON, puis EXEC GD_VALIDATE_SPATIAL_DATA;
CREATE OR REPLACE PROCEDURE GD_VALIDATE_SPATIAL_DATA AUTHID CURRENT_USER AS
 invalid_count PLS_INTEGER:=0;
 total_count PLS_INTEGER:=0;
BEGIN
 FOR r IN (
  SELECT 'CLIENT' entity,c.id,SDO_GEOM.VALIDATE_GEOMETRY_WITH_CONTEXT(c.position,0.005) validity FROM CLIENT c
  UNION ALL
  SELECT 'DRIVER',d.id,SDO_GEOM.VALIDATE_GEOMETRY_WITH_CONTEXT(d.current_position,0.005) FROM DRIVER d
  UNION ALL
  SELECT 'DEPOT',p.id,SDO_GEOM.VALIDATE_GEOMETRY_WITH_CONTEXT(p.position,0.005) FROM DEPOT p
 ) LOOP
  total_count:=total_count+1;
  IF r.validity IS NULL OR r.validity<>'TRUE' THEN
   invalid_count:=invalid_count+1;
   DBMS_OUTPUT.PUT_LINE(r.entity||' #'||r.id||' : '||NVL(r.validity,'NULL'));
  END IF;
 END LOOP;
 DBMS_OUTPUT.PUT_LINE('Geometries verifiees : '||total_count||', invalides : '||invalid_count);
 IF invalid_count>0 THEN RAISE_APPLICATION_ERROR(-20020,'Geometries invalides detectees'); END IF;
END;
/
SHOW ERRORS

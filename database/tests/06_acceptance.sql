SET SERVEROUTPUT ON
DECLARE
 n NUMBER;
 d NUMBER;
BEGIN
 SELECT COUNT(*) INTO n FROM user_sdo_geom_metadata WHERE table_name IN ('CLIENT','DRIVER','DEPOT');
 IF n<>3 THEN RAISE_APPLICATION_ERROR(-20001,'3 metadonnees spatiales attendues'); END IF;
 SELECT COUNT(*) INTO n FROM user_indexes WHERE index_name IN ('IDX_CLIENT_POSITION','IDX_DRIVER_POSITION','IDX_DEPOT_POSITION') AND domidx_status='VALID';
 IF n<>3 THEN RAISE_APPLICATION_ERROR(-20002,'3 index spatiaux valides attendus'); END IF;
 SELECT SDO_GEOM.SDO_DISTANCE(a.position,b.position,0.005,'unit=KM') INTO d FROM DEPOT a CROSS JOIN DEPOT b WHERE a.id=1 AND b.id=2;
 IF d<=0 THEN RAISE_APPLICATION_ERROR(-20003,'Distance positive attendue'); END IF;
 DBMS_OUTPUT.PUT_LINE('PASS : metadonnees, index, distance entre depots = '||d||' km');
END;
/
SELECT 'CLIENT' AS entity,c.id,SDO_GEOM.VALIDATE_GEOMETRY_WITH_CONTEXT(c.position,0.005) AS validity FROM CLIENT c
UNION ALL SELECT 'DRIVER',d.id,SDO_GEOM.VALIDATE_GEOMETRY_WITH_CONTEXT(d.current_position,0.005) FROM DRIVER d;

-- A executer comme GEODELIVERY apres install.sql.
SELECT d.id,d.name,SDO_GEOM.VALIDATE_GEOMETRY_WITH_CONTEXT(d.position,0.005) AS validity FROM DEPOT d;
SELECT SDO_GEOM.SDO_DISTANCE(a.position,b.position,0.005,'unit=KM') AS distance_km
 FROM DEPOT a CROSS JOIN DEPOT b WHERE a.id=1 AND b.id=2;
-- sdo_batch_size + ROWNUM permet de filtrer AVAILABLE avant d'obtenir 5 resultats.
-- Ne pas utiliser sdo_num_res=5 avant le filtrage de disponibilite.
SELECT d.id,d.name,SDO_NN_DISTANCE(1) AS distance_km
FROM DRIVER d
WHERE d.status='AVAILABLE'
 AND SDO_NN(d.current_position,
 MDSYS.SDO_GEOMETRY(2001,4326,MDSYS.SDO_POINT_TYPE(-7.63,33.53,NULL),NULL,NULL),
 'sdo_batch_size=10 unit=KM',1)='TRUE'
 AND ROWNUM<=5
ORDER BY distance_km;
SELECT d.id,d.name FROM DRIVER d WHERE d.status='AVAILABLE' AND
 SDO_WITHIN_DISTANCE(d.current_position,
 MDSYS.SDO_GEOMETRY(2001,4326,MDSYS.SDO_POINT_TYPE(-7.63,33.53,NULL),NULL,NULL),
 'distance=5 unit=KM')='TRUE';
-- Zone rectangulaire fictive, point couvert par/interieur au polygone.
SELECT c.id,c.name FROM CLIENT c WHERE SDO_RELATE(c.position,
 MDSYS.SDO_GEOMETRY(2003,4326,NULL,MDSYS.SDO_ELEM_INFO_ARRAY(1,1003,3),
 MDSYS.SDO_ORDINATE_ARRAY(-7.66,33.54,-7.60,33.59)),
 'mask=INSIDE+COVEREDBY')='TRUE';
SELECT SDO_CS.TRANSFORM(d.position,3857) AS web_mercator FROM DEPOT d WHERE d.id=1;

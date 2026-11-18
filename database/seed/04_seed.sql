-- Donnees entierement fictives. Coordonnees plausibles a Casablanca.
INSERT INTO DEPOT(name,address,position) VALUES ('Hub Sidi Maarouf','Zone logistique fictive, Casablanca',
 MDSYS.SDO_GEOMETRY(2001,4326,MDSYS.SDO_POINT_TYPE(-7.630,33.530,NULL),NULL,NULL));
INSERT INTO DEPOT(name,address,position) VALUES ('Hub Centre','Centre logistique fictif, Casablanca',
 MDSYS.SDO_GEOMETRY(2001,4326,MDSYS.SDO_POINT_TYPE(-7.610,33.585,NULL),NULL,NULL));
DECLARE
 names SYS.ODCIVARCHAR2LIST := SYS.ODCIVARCHAR2LIST('Amine','Salma','Youssef','Nour','Mehdi','Lina','Omar','Aya','Adam','Sara');
BEGIN
 FOR i IN 1..10 LOOP
  INSERT INTO DRIVER(name,phone,status,current_position) VALUES(
   names(i)||' (demo)','060000'||TO_CHAR(i,'FM0000'),CASE WHEN i=10 THEN 'OFFLINE' ELSE 'AVAILABLE' END,
   MDSYS.SDO_GEOMETRY(2001,4326,MDSYS.SDO_POINT_TYPE(-7.68+MOD(i*7,15)*0.007,33.53+MOD(i*3,11)*0.008,NULL),NULL,NULL));
  INSERT INTO VEHICLE(driver_id,plate_number,capacity_kg) VALUES(i,'DEMO-'||TO_CHAR(i,'FM000'),CASE WHEN i<=3 THEN 150 ELSE 80 END);
 END LOOP;
 FOR i IN 1..40 LOOP
  INSERT INTO CLIENT(name,address,phone,position) VALUES(
   'Client demo '||TO_CHAR(i,'FM00'),'Adresse fictive '||i||', Casablanca','061000'||TO_CHAR(i,'FM0000'),
   MDSYS.SDO_GEOMETRY(2001,4326,MDSYS.SDO_POINT_TYPE(-7.69+MOD(i*13,31)*0.004,33.525+MOD(i*11,29)*0.003,NULL),NULL,NULL));
 END LOOP;
 FOR i IN 1..60 LOOP
  INSERT INTO DELIVERY_ORDER(client_id,reference,weight_kg,priority,status) VALUES(
   MOD(i-1,40)+1,'GD-2026-'||TO_CHAR(i,'FM0000'),1+MOD(i*3,12),
   CASE WHEN MOD(i,5)=0 THEN 'HIGH' WHEN MOD(i,4)=0 THEN 'LOW' ELSE 'NORMAL' END,
   CASE WHEN MOD(i,13)=0 THEN 'CANCELLED' ELSE 'PENDING' END);
 END LOOP;
END;
/
COMMIT;

-- Executer dans SQL Developer avec votre compte habituel, dans la PDB cible.
SELECT banner_full FROM v$version;
SELECT SYS_CONTEXT('USERENV', 'CON_NAME') AS container_name FROM dual;
-- DBA uniquement, si disponible : SELECT comp_id, version, status FROM dba_registry;
SELECT owner, type_name FROM all_types WHERE owner='MDSYS' AND type_name='SDO_GEOMETRY';
SELECT index_name FROM user_indexes WHERE ityp_owner='MDSYS';

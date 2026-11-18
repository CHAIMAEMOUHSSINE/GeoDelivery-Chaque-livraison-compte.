-- Connexion GEODELIVERY dans la PDB cible. SQL Developer : F5 (Run Script).
-- Scripts non idempotents : ne PAS relancer sur un schema deja installe.
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
SET DEFINE OFF
@@schema/01_schema.sql
@@spatial/02_metadata.sql
@@spatial/03_indexes.sql
@@seed/04_seed.sql
PROMPT GeoDelivery : installation terminee.

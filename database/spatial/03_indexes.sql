-- Teste avec Oracle 19c. Sur une ancienne version : SPATIAL_INDEX si necessaire.
CREATE INDEX idx_client_position ON CLIENT(position) INDEXTYPE IS MDSYS.SPATIAL_INDEX_V2;
CREATE INDEX idx_driver_position ON DRIVER(current_position) INDEXTYPE IS MDSYS.SPATIAL_INDEX_V2;
CREATE INDEX idx_depot_position ON DEPOT(position) INDEXTYPE IS MDSYS.SPATIAL_INDEX_V2;

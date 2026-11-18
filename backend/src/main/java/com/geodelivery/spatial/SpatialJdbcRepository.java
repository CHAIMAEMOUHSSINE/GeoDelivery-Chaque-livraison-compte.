package com.geodelivery.spatial;

import java.util.*;
import com.geodelivery.common.Db;
import org.springframework.stereotype.Repository;

@Repository
public class SpatialJdbcRepository {
    private final Db db;
    public SpatialJdbcRepository(Db db) { this.db=db; }
    public GeoPointDto client(long id) {
        var row=db.one("SELECT c.position.SDO_POINT.Y latitude,c.position.SDO_POINT.X longitude FROM CLIENT c WHERE id=:id",Map.of("id",id));
        return new GeoPointDto(Db.number(row,"latitude"),Db.number(row,"longitude"));
    }
    public List<Map<String,Object>> nearest(GeoPointDto p,int limit) {
        return db.list("""
            SELECT d.id,d.name,d.status,d.current_position.SDO_POINT.Y latitude,d.current_position.SDO_POINT.X longitude,
             SDO_NN_DISTANCE(1) distance_km FROM DRIVER d
            WHERE d.status='AVAILABLE' AND SDO_NN(d.current_position,
             MDSYS.SDO_GEOMETRY(2001,4326,MDSYS.SDO_POINT_TYPE(:lon,:lat,NULL),NULL,NULL),
             'sdo_batch_size=10 unit=KM',1)='TRUE' AND ROWNUM<=:maxRows
            ORDER BY distance_km
            """,Map.of("lon",p.longitude(),"lat",p.latitude(),"maxRows",limit));
    }
    public List<Map<String,Object>> radius(GeoPointDto p,double radius) {
        // Le parametre operateur entier est lie, jamais concatene depuis une entree utilisateur.
        return db.list("""
            SELECT d.id,d.name,d.status,d.current_position.SDO_POINT.Y latitude,d.current_position.SDO_POINT.X longitude,
             SDO_GEOM.SDO_DISTANCE(d.current_position,
              MDSYS.SDO_GEOMETRY(2001,4326,MDSYS.SDO_POINT_TYPE(:lon,:lat,NULL),NULL,NULL),0.005,'unit=KM') distance_km
            FROM DRIVER d WHERE d.status='AVAILABLE' AND SDO_WITHIN_DISTANCE(d.current_position,
             MDSYS.SDO_GEOMETRY(2001,4326,MDSYS.SDO_POINT_TYPE(:lon,:lat,NULL),NULL,NULL),:params)='TRUE'
            ORDER BY distance_km FETCH FIRST 200 ROWS ONLY
            """,Map.of("lon",p.longitude(),"lat",p.latitude(),"params","distance="+radius+" unit=KM"));
    }
    public double[][] matrix(List<GeoPointDto> points) {
        Map<String,Object> params=new HashMap<>();
        List<String> selects=new ArrayList<>();
        for(int i=0;i<points.size();i++) {
            params.put("x"+i,points.get(i).longitude()); params.put("y"+i,points.get(i).latitude());
            selects.add("SELECT "+i+" idx, MDSYS.SDO_GEOMETRY(2001,4326,MDSYS.SDO_POINT_TYPE(:x"+i+",:y"+i+",NULL),NULL,NULL) geom FROM dual");
        }
        String sql="WITH pts AS ("+String.join(" UNION ALL ",selects)+") SELECT a.idx i,b.idx j,SDO_GEOM.SDO_DISTANCE(a.geom,b.geom,0.005,'unit=KM') km FROM pts a CROSS JOIN pts b WHERE a.idx<b.idx";
        double[][] matrix=new double[points.size()][points.size()];
        for(var row:db.list(sql,params)) {
            int i=(int)Db.id(row,"i"),j=(int)Db.id(row,"j");
            matrix[i][j]=matrix[j][i]=Db.number(row,"km");
        }
        return matrix;
    }
}

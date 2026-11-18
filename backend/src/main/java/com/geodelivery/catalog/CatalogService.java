package com.geodelivery.catalog;

import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.geodelivery.common.*;

@Service
public class CatalogService {
    private final Db db;
    private static final String POINT="MDSYS.SDO_GEOMETRY(2001,4326,MDSYS.SDO_POINT_TYPE(:lon,:lat,NULL),NULL,NULL)";
    public CatalogService(Db db) { this.db=db; }
    private String table(String kind) {
        return switch(kind) { case "clients" -> "CLIENT"; case "drivers" -> "DRIVER"; case "depots" -> "DEPOT"; case "vehicles" -> "VEHICLE"; default -> throw new IllegalArgumentException(); };
    }
    private String select(String kind) {
        return switch(kind) {
            case "clients" -> "SELECT c.id,c.name,c.address,c.phone,c.active,c.position.SDO_POINT.Y latitude,c.position.SDO_POINT.X longitude FROM CLIENT c";
            case "drivers" -> "SELECT d.id,d.name,d.phone,d.user_id,d.status,d.position_updated_at,d.current_position.SDO_POINT.Y latitude,d.current_position.SDO_POINT.X longitude FROM DRIVER d";
            case "depots" -> "SELECT d.id,d.name,d.address,d.position.SDO_POINT.Y latitude,d.position.SDO_POINT.X longitude FROM DEPOT d";
            case "vehicles" -> "SELECT v.id,v.driver_id,v.plate_number,v.capacity_kg FROM VEHICLE v";
            default -> throw new IllegalArgumentException();
        };
    }
    public List<Map<String,Object>> list(String kind,int page,int size,String search) {
        String alias=switch(kind) { case "clients" -> "c"; case "vehicles" -> "v"; default -> "d"; };
        String field=kind.equals("vehicles") ? "plate_number" : "name";
        return db.list(select(kind)+" WHERE LOWER("+alias+"."+field+") LIKE :search ORDER BY "+alias+".id OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY",
            Map.of("search","%"+search.toLowerCase(Locale.ROOT)+"%","offset",(long)page*size,"size",size));
    }
    public Map<String,Object> get(String kind,long id) {
        String alias=kind.equals("clients")?"c":kind.equals("vehicles")?"v":"d";
        return db.one(select(kind)+" WHERE "+alias+".id=:id",Map.of("id",id));
    }
    @Transactional
    public Map<String,Object> save(String kind,Long id,CatalogRequest r) {
        String table=table(kind);
        if (id!=null) {
            db.one("SELECT id FROM "+table+" WHERE id=:id FOR UPDATE",Map.of("id",id));
            if ((kind.equals("drivers") || kind.equals("depots")) && Db.id(db.one(
                "SELECT COUNT(*) n FROM DELIVERY_ROUTE WHERE "+(kind.equals("drivers")?"driver_id":"depot_id")+"=:id AND status IN ('PLANNED','IN_PROGRESS')",Map.of("id",id)),"n")>0)
                throw BusinessException.conflict("Ressource engagée dans une tournée active");
            if (kind.equals("vehicles")) {
                var vehicle=get(kind,id);
                if (vehicle.get("driverId")!=null) checkDriverFree(Db.id(vehicle,"driverId"));
            }
        }
        Map<String,Object> p=new HashMap<>(); p.put("id",id);
        String fields,values,updates;
        if (kind.equals("vehicles")) {
            required(r.plateNumber()); if (r.capacityKg()==null || r.capacityKg()>1_000_000) throw new IllegalArgumentException();
            if (r.driverId()!=null) { db.one("SELECT id FROM DRIVER WHERE id=:id FOR UPDATE",Map.of("id",r.driverId())); checkDriverFree(r.driverId()); }
            p.put("plate",r.plateNumber()); p.put("capacity",r.capacityKg()); p.put("driver",r.driverId());
            fields="plate_number,capacity_kg,driver_id"; values=":plate,:capacity,:driver"; updates="plate_number=:plate,capacity_kg=:capacity,driver_id=:driver";
        } else {
            required(r.name()); if (r.position()==null) throw new IllegalArgumentException();
            p.put("name",r.name()); p.put("lat",r.position().latitude()); p.put("lon",r.position().longitude());
            if (kind.equals("drivers")) {
                if(r.userId()!=null) {
                    var user=db.one("SELECT role FROM APP_USER WHERE id=:id",Map.of("id",r.userId()));
                    if(!"DRIVER".equals(user.get("role"))) throw BusinessException.conflict("Le compte doit avoir le rôle DRIVER");
                }
                p.put("phone",r.phone()); p.put("status",r.status()==null?"AVAILABLE":r.status()); p.put("user",r.userId());
                fields="name,phone,status,user_id,current_position"; values=":name,:phone,:status,:user,"+POINT;
                updates="name=:name,phone=:phone,status=:status,user_id=:user,current_position="+POINT+",position_updated_at=SYSTIMESTAMP";
            } else {
                required(r.address()); p.put("address",r.address()); p.put("phone",r.phone());
                fields="name,address,position"+(kind.equals("clients")?",phone":"");
                values=":name,:address,"+POINT+(kind.equals("clients")?",:phone":"");
                updates="name=:name,address=:address,position="+POINT+(kind.equals("clients")?",phone=:phone":"");
            }
        }
        if(id==null) id=db.insert("INSERT INTO "+table+" ("+fields+") VALUES ("+values+")",p);
        else db.update("UPDATE "+table+" SET "+updates+" WHERE id=:id",p);
        return get(kind,id);
    }
    private void checkDriverFree(long id) {
        if(Db.id(db.one("SELECT COUNT(*) n FROM DELIVERY_ROUTE WHERE driver_id=:id AND status IN ('PLANNED','IN_PROGRESS')",Map.of("id",id)),"n")>0)
            throw BusinessException.conflict("Véhicule ou livreur engagé dans une tournée");
    }
    private void required(String s) { if(s==null || s.isBlank()) throw new IllegalArgumentException(); }
    @Transactional public void disableClient(long id) {
        get("clients",id);
        if(Db.id(db.one("SELECT COUNT(*) n FROM DELIVERY_ORDER WHERE client_id=:id AND status IN ('PENDING','ASSIGNED','IN_DELIVERY')",Map.of("id",id)),"n")>0)
            throw BusinessException.conflict("Ce client possède des commandes actives");
        db.update("UPDATE CLIENT SET active=0 WHERE id=:id",Map.of("id",id));
    }
    @Transactional public void position(long id,com.geodelivery.spatial.GeoPointDto p) {
        get("drivers",id);
        db.update("UPDATE DRIVER SET current_position="+POINT+",position_updated_at=SYSTIMESTAMP WHERE id=:id",
            Map.of("id",id,"lat",p.latitude(),"lon",p.longitude()));
    }
}

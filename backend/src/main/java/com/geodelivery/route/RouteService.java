package com.geodelivery.route;

import java.util.*;
import com.geodelivery.common.*;
import com.geodelivery.optimization.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RouteService {
    private final Db db; private final OptimizationService optimization;
    private static final String SELECT="SELECT r.*,d.name driver_name,p.name depot_name FROM DELIVERY_ROUTE r JOIN DRIVER d ON d.id=r.driver_id JOIN DEPOT p ON p.id=r.depot_id";
    public RouteService(Db db,OptimizationService optimization) { this.db=db; this.optimization=optimization; }
    public List<Map<String,Object>> list(Long driverId,int page,int size) {
        Map<String,Object> params=new HashMap<>(); params.put("driver",driverId); params.put("offset",(long)page*size); params.put("size",size);
        return db.list(SELECT+" WHERE (:driver IS NULL OR r.driver_id=:driver) ORDER BY r.id DESC OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY",params);
    }
    public Map<String,Object> detail(long id) {
        var route=db.one(SELECT+" WHERE r.id=:id",Map.of("id",id));
        route.put("distanceMode","GEODESIC");
        route.put("depot",Map.of("latitude",route.get("depotLatitude"),"longitude",route.get("depotLongitude")));
        var stops=db.list("""
            SELECT s.id,s.order_id,s.stop_order sequence,s.latitude,s.longitude,s.segment_distance_km,
             o.reference,c.name client_name,c.address,l.id delivery_id,l.status delivery_status
            FROM ROUTE_STOP s JOIN DELIVERY_ORDER o ON o.id=s.order_id JOIN CLIENT c ON c.id=o.client_id
            LEFT JOIN DELIVERY l ON l.route_stop_id=s.id WHERE s.route_id=:id ORDER BY s.stop_order
            """,Map.of("id",id));
        route.put("orderedStops",stops);
        double outbound=stops.stream().mapToDouble(x -> Db.number(x,"segmentDistanceKm")).sum();
        route.put("returnDistanceKm",Math.max(0,Db.number(route,"totalDistanceKm")-outbound));
        return route;
    }
    @Transactional
    public Map<String,Object> confirm(OptimizeRouteRequest r) {
        // Verrous avant validation et recalcul : deux confirmations ne peuvent pas affecter la meme commande.
        db.one("SELECT id FROM DRIVER WHERE id=:id FOR UPDATE",Map.of("id",r.driverId()));
        db.one("SELECT id FROM DEPOT WHERE id=:id FOR UPDATE",Map.of("id",r.depotId()));
        db.list("SELECT id FROM DELIVERY_ORDER WHERE id IN (:ids) ORDER BY id FOR UPDATE",Map.of("ids",r.orderIds()));
        db.list("SELECT id FROM CLIENT WHERE id IN (SELECT client_id FROM DELIVERY_ORDER WHERE id IN (:ids)) ORDER BY id FOR UPDATE",
            Map.of("ids",r.orderIds()));
        var plan=optimization.preview(r);
        long id=db.insert("""
            INSERT INTO DELIVERY_ROUTE(driver_id,depot_id,status,algorithm,return_to_depot,initial_distance_km,
             total_distance_km,depot_longitude,depot_latitude)
            VALUES(:driver,:depot,'PLANNED',:algorithm,:closed,:initial,:total,:lon,:lat)
            """,Map.of("driver",r.driverId(),"depot",r.depotId(),"algorithm",r.algorithm().name(),
                "closed",r.returnToDepot()?1:0,"initial",plan.initialDistanceKm(),"total",plan.optimizedDistanceKm(),
                "lon",plan.depot().longitude(),"lat",plan.depot().latitude()));
        for(var stop:plan.orderedStops()) {
            long stopId=db.insert("""
                INSERT INTO ROUTE_STOP(route_id,order_id,stop_order,longitude,latitude,segment_distance_km)
                VALUES(:route,:orderId,:rank,:lon,:lat,:km)
                """,Map.of("route",id,"orderId",stop.orderId(),"rank",stop.sequence(),
                    "lon",stop.longitude(),"lat",stop.latitude(),"km",stop.segmentDistanceKm()));
            db.update("INSERT INTO DELIVERY(order_id,route_stop_id,status) VALUES(:orderId,:stop,'PENDING')",
                Map.of("orderId",stop.orderId(),"stop",stopId));
            db.update("UPDATE DELIVERY_ORDER SET status='ASSIGNED' WHERE id=:id",Map.of("id",stop.orderId()));
        }
        db.update("UPDATE DRIVER SET status='BUSY' WHERE id=:id",Map.of("id",r.driverId()));
        return detail(id);
    }
    @Transactional
    public void status(long id,String to) {
        var route=db.one("SELECT id,driver_id,status FROM DELIVERY_ROUTE WHERE id=:id FOR UPDATE",Map.of("id",id));
        Workflow.route((String)route.get("status"),to);
        var p=Map.<String,Object>of("id",id,"driver",route.get("driverId"),"status",to);
        if(to.equals("IN_PROGRESS")) {
            db.update("UPDATE DELIVERY_ORDER SET status='IN_DELIVERY' WHERE id IN (SELECT order_id FROM ROUTE_STOP WHERE route_id=:id)",p);
            db.update("UPDATE DELIVERY SET status='IN_PROGRESS' WHERE route_stop_id IN (SELECT id FROM ROUTE_STOP WHERE route_id=:id)",p);
        } else if(to.equals("COMPLETED")) {
            long unfinished=Db.id(db.one("SELECT COUNT(*) n FROM DELIVERY WHERE route_stop_id IN (SELECT id FROM ROUTE_STOP WHERE route_id=:id) AND status<>'DELIVERED'",p),"n");
            if(unfinished>0) throw BusinessException.conflict("Toutes les livraisons doivent être réalisées");
        } else if(to.equals("CANCELLED")) {
            // MVP : pas de replanification historique ; les commandes de cette tournee sont annulees.
            db.update("UPDATE DELIVERY_ORDER SET status='CANCELLED' WHERE id IN (SELECT order_id FROM ROUTE_STOP WHERE route_id=:id)",p);
        }
        db.update("UPDATE DELIVERY_ROUTE SET status=:status WHERE id=:id",p);
        if(to.equals("COMPLETED") || to.equals("CANCELLED"))
            db.update("UPDATE DRIVER SET status='AVAILABLE' WHERE id=:driver",p);
    }
}

package com.geodelivery.delivery;

import java.util.*;
import com.geodelivery.common.*;
import com.geodelivery.auth.Ownership;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DeliveryService {
    private final Db db; private final Ownership ownership;
    public DeliveryService(Db db,Ownership ownership) { this.db=db; this.ownership=ownership; }
    public List<Map<String,Object>> list(int page,int size) {
        Map<String,Object> p=new HashMap<>(); p.put("driver",ownership.isDriver()?ownership.driverId():null);
        p.put("offset",(long)page*size); p.put("size",size);
        return db.list("""
            SELECT l.id,l.order_id,l.status,l.delivered_at,o.reference,c.name client_name,s.route_id,s.stop_order,
             r.status route_status,d.name driver_name FROM DELIVERY l
            JOIN DELIVERY_ORDER o ON o.id=l.order_id JOIN CLIENT c ON c.id=o.client_id
            JOIN ROUTE_STOP s ON s.id=l.route_stop_id JOIN DELIVERY_ROUTE r ON r.id=s.route_id
            JOIN DRIVER d ON d.id=r.driver_id WHERE (:driver IS NULL OR r.driver_id=:driver)
            ORDER BY l.id DESC OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY
            """,p);
    }
    @Transactional public void status(long id,String to) {
        var link=db.one("SELECT s.route_id FROM DELIVERY l JOIN ROUTE_STOP s ON s.id=l.route_stop_id WHERE l.id=:id",Map.of("id",id));
        long routeId=Db.id(link,"routeId"); ownership.route(routeId);
        // Meme ordre de verrouillage que les transitions de tournee.
        var route=db.one("SELECT status,driver_id FROM DELIVERY_ROUTE WHERE id=:id FOR UPDATE",Map.of("id",routeId));
        if(!"IN_PROGRESS".equals(route.get("status"))) throw BusinessException.conflict("La tournée doit être en cours");
        var delivery=db.one("SELECT status,order_id FROM DELIVERY WHERE id=:id FOR UPDATE",Map.of("id",id));
        Workflow.delivery((String)delivery.get("status"),to);
        db.update("UPDATE DELIVERY SET status=:status,delivered_at=CASE WHEN :status='DELIVERED' THEN SYSTIMESTAMP ELSE NULL END WHERE id=:id",
            Map.of("id",id,"status",to));
        if(to.equals("DELIVERED")) {
            db.update("UPDATE DELIVERY_ORDER SET status='DELIVERED' WHERE id=:id",Map.of("id",delivery.get("orderId")));
            long remaining=Db.id(db.one("SELECT COUNT(*) n FROM DELIVERY WHERE route_stop_id IN (SELECT id FROM ROUTE_STOP WHERE route_id=:id) AND status<>'DELIVERED'",Map.of("id",routeId)),"n");
            if(remaining==0) {
                db.update("UPDATE DELIVERY_ROUTE SET status='COMPLETED' WHERE id=:id",Map.of("id",routeId));
                db.update("UPDATE DRIVER SET status='AVAILABLE' WHERE id=:id",Map.of("id",route.get("driverId")));
            }
        }
    }
}

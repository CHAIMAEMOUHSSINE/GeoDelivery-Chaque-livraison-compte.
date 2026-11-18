package com.geodelivery.dashboard;

import java.util.*;
import com.geodelivery.common.Db;
import org.springframework.stereotype.Service;

@Service
public class DashboardService {
    private final Db db;
    public DashboardService(Db db) { this.db=db; }
    public Map<String,Object> stats() {
        var result=db.one("""
            SELECT (SELECT COUNT(*) FROM DELIVERY_ORDER) total_orders,
             (SELECT COUNT(*) FROM DELIVERY_ORDER WHERE status='PENDING') pending_orders,
             (SELECT COUNT(*) FROM DELIVERY_ORDER WHERE status='DELIVERED') delivered_orders,
             (SELECT COUNT(*) FROM DRIVER WHERE status='AVAILABLE') available_drivers,
             (SELECT COUNT(*) FROM DRIVER) total_drivers,
             (SELECT COUNT(*) FROM DELIVERY_ROUTE WHERE status IN ('PLANNED','IN_PROGRESS')) active_routes,
             (SELECT NVL(SUM(total_distance_km),0) FROM DELIVERY_ROUTE WHERE status<>'CANCELLED') estimated_km,
             (SELECT NVL(SUM(initial_distance_km-total_distance_km),0) FROM DELIVERY_ROUTE WHERE status<>'CANCELLED') saved_km
            FROM dual
            """,Map.of());
        result.put("ordersByStatus",db.list("SELECT status,COUNT(*) count FROM DELIVERY_ORDER GROUP BY status",Map.of()));
        result.put("distanceMode","GEODESIC");
        result.put("databaseVersion",db.one("SELECT version FROM product_component_version WHERE product LIKE 'Oracle Database%' FETCH FIRST 1 ROW ONLY",Map.of()).get("version"));
        return result;
    }
}

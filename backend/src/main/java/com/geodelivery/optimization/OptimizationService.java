package com.geodelivery.optimization;

import java.util.*;
import com.geodelivery.common.*;
import com.geodelivery.spatial.GeoPointDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OptimizationService {
    private final Db db; private final DistanceMatrixService matrices;
    public OptimizationService(Db db,DistanceMatrixService matrices) { this.db=db; this.matrices=matrices; }
    @Transactional(readOnly=true)
    public OptimizationResult preview(OptimizeRouteRequest r) {
        long start=System.nanoTime();
        if(new HashSet<>(r.orderIds()).size()!=r.orderIds().size()) throw new IllegalArgumentException("Commandes dupliquées");
        var driver=db.one("SELECT status FROM DRIVER WHERE id=:id",Map.of("id",r.driverId()));
        if(!"AVAILABLE".equals(driver.get("status"))) throw BusinessException.conflict("Livreur indisponible");
        var vehicle=db.list("SELECT capacity_kg FROM VEHICLE WHERE driver_id=:id",Map.of("id",r.driverId()));
        if(vehicle.isEmpty()) throw BusinessException.conflict("Aucun véhicule affecté au livreur");
        double capacity=Db.number(vehicle.getFirst(),"capacityKg");
        var depot=db.one("SELECT d.position.SDO_POINT.Y latitude,d.position.SDO_POINT.X longitude FROM DEPOT d WHERE id=:id",Map.of("id",r.depotId()));
        var rows=db.list("""
            SELECT o.id,o.reference,o.weight_kg,o.status,c.active,c.name client_name,c.address,
             c.position.SDO_POINT.Y latitude,c.position.SDO_POINT.X longitude
            FROM DELIVERY_ORDER o JOIN CLIENT c ON c.id=o.client_id WHERE o.id IN (:ids)
            """,Map.of("ids",r.orderIds()));
        if(rows.size()!=r.orderIds().size()) throw BusinessException.missing("Commande introuvable");
        Map<Long,Map<String,Object>> byId=new HashMap<>();
        double weight=0;
        for(var row:rows) {
            if(!"PENDING".equals(row.get("status")) || Db.id(row,"active")!=1)
                throw BusinessException.conflict("Toutes les commandes doivent être en attente et leurs clients actifs");
            byId.put(Db.id(row,"id"),row); weight+=Db.number(row,"weightKg");
        }
        if(weight>capacity+1e-9) throw BusinessException.conflict("Capacité dépassée : "+weight+" kg / "+capacity+" kg");
        List<Map<String,Object>> ordered=r.orderIds().stream().map(byId::get).toList();
        List<GeoPointDto> points=new ArrayList<>(); points.add(point(depot));
        ordered.forEach(row -> points.add(point(row)));
        double[][] d=matrices.compute(points);
        var initial=NearestNeighborAlgorithm.solve(d,r.returnToDepot());
        var result=r.algorithm()==OptimizeRouteRequest.Algorithm.TWO_OPT
            ?TwoOptAlgorithm.improve(initial,d,r.returnToDepot()):initial;
        double before=NearestNeighborAlgorithm.distance(initial,d),after=NearestNeighborAlgorithm.distance(result,d);
        List<OptimizationResult.Stop> stops=new ArrayList<>();
        for(int i=1;i<=ordered.size();i++) {
            int index=result.get(i); var row=ordered.get(index-1); var p=points.get(index);
            stops.add(new OptimizationResult.Stop(Db.id(row,"id"),i,(String)row.get("reference"),
                (String)row.get("clientName"),(String)row.get("address"),p.latitude(),p.longitude(),d[result.get(i-1)][index]));
        }
        return new OptimizationResult(r.algorithm().name(),"GEODESIC",r.driverId(),r.depotId(),r.returnToDepot(),
            points.getFirst(),before,after,before==0?null:Math.max(0,(before-after)/before*100),
            stops.size(),(System.nanoTime()-start)/1_000_000.0,weight,capacity,stops,
            r.returnToDepot()?d[result.get(result.size()-2)][0]:0);
    }
    private GeoPointDto point(Map<String,Object> row) { return new GeoPointDto(Db.number(row,"latitude"),Db.number(row,"longitude")); }
}

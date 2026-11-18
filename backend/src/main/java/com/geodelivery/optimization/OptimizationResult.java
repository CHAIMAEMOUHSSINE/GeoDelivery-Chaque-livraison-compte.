package com.geodelivery.optimization;

import java.util.List;
import com.geodelivery.spatial.GeoPointDto;

public record OptimizationResult(
    String algorithm,String distanceMode,long driverId,long depotId,boolean returnToDepot,
    GeoPointDto depot,double initialDistanceKm,double optimizedDistanceKm,Double improvementPercent,
    int stopCount,double computationTimeMs,double totalWeightKg,double capacityKg,
    List<Stop> orderedStops,double returnDistanceKm) {
    public record Stop(long orderId,int sequence,String reference,String clientName,String address,
        double latitude,double longitude,double segmentDistanceKm) {}
}

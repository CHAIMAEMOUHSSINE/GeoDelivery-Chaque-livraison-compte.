package com.geodelivery.optimization;

import java.util.List;
import com.geodelivery.spatial.*;
import org.springframework.stereotype.Service;

@Service
public class DistanceMatrixService {
    private final SpatialJdbcRepository spatial;
    public DistanceMatrixService(SpatialJdbcRepository spatial) { this.spatial=spatial; }
    public double[][] compute(List<GeoPointDto> points) { return spatial.matrix(points); }
}

package com.geodelivery.spatial;

import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class SpatialService {
    private final SpatialJdbcRepository repository;
    public SpatialService(SpatialJdbcRepository repository) { this.repository=repository; }
    public List<Map<String,Object>> nearest(long client,int limit) { return repository.nearest(repository.client(client),limit); }
    public List<Map<String,Object>> radius(long client,double radius) { return repository.radius(repository.client(client),radius); }
}

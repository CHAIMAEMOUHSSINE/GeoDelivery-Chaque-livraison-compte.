package com.geodelivery.catalog;

import com.geodelivery.spatial.GeoPointDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

public record CatalogRequest(
    @Size(max=100) String name,@Size(max=255) String address,@Size(max=30) String phone,
    @Valid GeoPointDto position,
    @Pattern(regexp="AVAILABLE|OFFLINE") String status,
    @Size(max=30) String plateNumber,@Positive Double capacityKg,@Positive Long driverId,@Positive Long userId) {}

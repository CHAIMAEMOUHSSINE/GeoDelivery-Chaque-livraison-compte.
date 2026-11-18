package com.geodelivery.spatial;

import java.util.*;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/spatial")
@PreAuthorize("hasAnyRole('ADMIN','DISPATCHER')")
public class SpatialController {
    private final SpatialService service;
    public SpatialController(SpatialService service) { this.service=service; }
    @GetMapping("/nearest-drivers") public List<Map<String,Object>> nearest(@RequestParam @Positive long clientId,
        @RequestParam(defaultValue="5") @Min(1) @Max(20) int limit) { return service.nearest(clientId,limit); }
    @GetMapping("/drivers-within-radius") public List<Map<String,Object>> radius(@RequestParam @Positive long clientId,
        @RequestParam @DecimalMin("0.01") @DecimalMax("100") double radiusKm) { return service.radius(clientId,radiusKm); }
}

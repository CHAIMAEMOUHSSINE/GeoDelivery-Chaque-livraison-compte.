package com.geodelivery.route;

import java.util.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import com.geodelivery.auth.Ownership;
import com.geodelivery.optimization.*;
import com.geodelivery.order.OrderController.StatusRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/routes")
public class RouteController {
    private final RouteService routes; private final OptimizationService optimization; private final Ownership ownership;
    public RouteController(RouteService routes,OptimizationService optimization,Ownership ownership) {
        this.routes=routes; this.optimization=optimization; this.ownership=ownership;
    }
    @GetMapping public List<Map<String,Object>> list(@RequestParam(defaultValue="0") @Min(0) int page,
        @RequestParam(defaultValue="100") @Min(1) @Max(200) int size) {
        return routes.list(ownership.isDriver()?ownership.driverId():null,page,size);
    }
    @GetMapping("/{id}") public Map<String,Object> get(@PathVariable long id) { ownership.route(id); return routes.detail(id); }
    @PostMapping("/optimize") @PreAuthorize("hasAnyRole('ADMIN','DISPATCHER')")
    public OptimizationResult preview(@Valid @RequestBody OptimizeRouteRequest r) { return optimization.preview(r); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasAnyRole('ADMIN','DISPATCHER')")
    public Map<String,Object> confirm(@Valid @RequestBody OptimizeRouteRequest r) { return routes.confirm(r); }
    @PatchMapping("/{id}/status") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void status(@PathVariable long id,@Valid @RequestBody StatusRequest r) {
        ownership.route(id);
        if(ownership.isDriver() && r.status().equals("CANCELLED")) throw new AccessDeniedException("Annulation réservée au dispatch");
        routes.status(id,r.status());
    }
}

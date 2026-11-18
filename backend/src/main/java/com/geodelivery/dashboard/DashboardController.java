package com.geodelivery.dashboard;

import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/dashboard")
@PreAuthorize("hasAnyRole('ADMIN','DISPATCHER')")
public class DashboardController {
    private final DashboardService service;
    public DashboardController(DashboardService service) { this.service=service; }
    @GetMapping("/stats") public Map<String,Object> stats() { return service.stats(); }
}

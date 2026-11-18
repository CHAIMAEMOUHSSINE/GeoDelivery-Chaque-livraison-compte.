package com.geodelivery.catalog;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import com.geodelivery.auth.Ownership;
import com.geodelivery.spatial.GeoPointDto;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class CatalogController {
    private final CatalogService service; private final Ownership ownership;
    public CatalogController(CatalogService service,Ownership ownership) { this.service=service; this.ownership=ownership; }
    private String kind(HttpServletRequest req) { return req.getRequestURI().split("/")[2]; }
    private void write(String kind,Authentication a) {
        if(!kind.equals("clients") && a.getAuthorities().stream().noneMatch(x -> x.getAuthority().equals("ROLE_ADMIN")))
            throw new AccessDeniedException("Administration requise");
    }
    @GetMapping({"/clients","/drivers","/depots","/vehicles"})
    @PreAuthorize("hasAnyRole('ADMIN','DISPATCHER')")
    public List<Map<String,Object>> list(HttpServletRequest req,@RequestParam(defaultValue="0") @Min(0) int page,
        @RequestParam(defaultValue="100") @Min(1) @Max(200) int size,@RequestParam(defaultValue="") @Size(max=100) String search) {
        return service.list(kind(req),page,size,search);
    }
    @GetMapping({"/clients/{id}","/drivers/{id}","/depots/{id}","/vehicles/{id}"})
    @PreAuthorize("hasAnyRole('ADMIN','DISPATCHER')")
    public Map<String,Object> get(HttpServletRequest req,@PathVariable long id) { return service.get(kind(req),id); }
    @PostMapping({"/clients","/drivers","/depots","/vehicles"})
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','DISPATCHER')")
    public Map<String,Object> create(HttpServletRequest req,Authentication a,@Valid @RequestBody CatalogRequest r) {
        write(kind(req),a); return service.save(kind(req),null,r);
    }
    @PutMapping({"/clients/{id}","/drivers/{id}","/depots/{id}","/vehicles/{id}"})
    @PreAuthorize("hasAnyRole('ADMIN','DISPATCHER')")
    public Map<String,Object> update(HttpServletRequest req,Authentication a,@PathVariable long id,@Valid @RequestBody CatalogRequest r) {
        write(kind(req),a); return service.save(kind(req),id,r);
    }
    @DeleteMapping("/clients/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','DISPATCHER')")
    public void delete(@PathVariable long id) { service.disableClient(id); }
    @PutMapping("/drivers/{id}/position") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void position(@PathVariable long id,@Valid @RequestBody GeoPointDto p) { ownership.driver(id); service.position(id,p); }
}

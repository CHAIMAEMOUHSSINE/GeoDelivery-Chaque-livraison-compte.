package com.geodelivery.order;

import com.geodelivery.order.OrderService.OrderRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/orders")
@PreAuthorize("hasAnyRole('ADMIN','DISPATCHER')")
public class OrderController {
    private final OrderService service;
    public OrderController(OrderService service) { this.service=service; }
    public record StatusRequest(@NotBlank String status) {}
    @GetMapping public List<Map<String,Object>> list(@RequestParam(defaultValue="0") @Min(0) int page,
        @RequestParam(defaultValue="100") @Min(1) @Max(200) int size,
        @RequestParam(defaultValue="ALL") @Pattern(regexp="ALL|PENDING|ASSIGNED|IN_DELIVERY|DELIVERED|CANCELLED") String status) {
        return service.list(page,size,status);
    }
    @GetMapping("/{id}") public Map<String,Object> get(@PathVariable long id) { return service.get(id); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public Map<String,Object> create(@Valid @RequestBody OrderRequest r) { return service.save(null,r); }
    @PutMapping("/{id}") public Map<String,Object> update(@PathVariable long id,@Valid @RequestBody OrderRequest r) { return service.save(id,r); }
    @PatchMapping("/{id}/status") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void status(@PathVariable long id,@Valid @RequestBody StatusRequest r) { service.status(id,r.status()); }
}

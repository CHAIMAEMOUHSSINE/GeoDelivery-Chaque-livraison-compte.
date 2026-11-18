package com.geodelivery.delivery;

import java.util.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import com.geodelivery.order.OrderController.StatusRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/deliveries")
public class DeliveryController {
    private final DeliveryService service;
    public DeliveryController(DeliveryService service) { this.service=service; }
    @GetMapping public List<Map<String,Object>> list(@RequestParam(defaultValue="0") @Min(0) int page,
        @RequestParam(defaultValue="100") @Min(1) @Max(200) int size) { return service.list(page,size); }
    @PatchMapping("/{id}/status") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void status(@PathVariable long id,@Valid @RequestBody StatusRequest r) { service.status(id,r.status()); }
}

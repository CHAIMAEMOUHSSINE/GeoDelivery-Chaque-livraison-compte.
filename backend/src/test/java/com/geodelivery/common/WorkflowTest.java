package com.geodelivery.common;

import com.geodelivery.spatial.GeoPointDto;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class WorkflowTest {
    @Test void validLifecycle() {
        assertDoesNotThrow(() -> {
            Workflow.order("PENDING","ASSIGNED"); Workflow.order("ASSIGNED","IN_DELIVERY"); Workflow.order("IN_DELIVERY","DELIVERED");
            Workflow.route("PLANNED","IN_PROGRESS"); Workflow.route("IN_PROGRESS","COMPLETED");
            Workflow.delivery("PENDING","IN_PROGRESS"); Workflow.delivery("IN_PROGRESS","DELIVERED");
        });
    }
    @Test void invalidTransitions() {
        assertThrows(BusinessException.class,() -> Workflow.order("DELIVERED","PENDING"));
        assertThrows(BusinessException.class,() -> Workflow.route("IN_PROGRESS","CANCELLED"));
        assertThrows(BusinessException.class,() -> Workflow.delivery("PENDING","DELIVERED"));
        assertThrows(BusinessException.class,() -> Workflow.order("PENDING","DELIVERED"));
    }
    @Test void gpsValidation() {
        assertThrows(IllegalArgumentException.class,() -> new GeoPointDto(91d,0d));
        assertThrows(IllegalArgumentException.class,() -> new GeoPointDto(0d,-181d));
        assertThrows(IllegalArgumentException.class,() -> new GeoPointDto(Double.NaN,0d));
        assertThrows(IllegalArgumentException.class,() -> new GeoPointDto(0d,Double.POSITIVE_INFINITY));
        assertDoesNotThrow(() -> new GeoPointDto(33.53,-7.63));
    }
}

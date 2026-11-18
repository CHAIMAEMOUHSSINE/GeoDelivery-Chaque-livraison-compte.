package com.geodelivery.auth;

import com.geodelivery.common.Db;
import java.util.Map;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component
public class Ownership {
    private final Db db;
    public Ownership(Db db) { this.db=db; }
    public boolean isDriver() { return "DRIVER".equals(jwt().getClaimAsString("role")); }
    private Jwt jwt() { return (Jwt)SecurityContextHolder.getContext().getAuthentication().getPrincipal(); }
    public long driverId() {
        var rows=db.list("SELECT id FROM DRIVER WHERE user_id=:id",Map.of("id",Long.parseLong(jwt().getSubject())));
        if (rows.isEmpty()) throw new AccessDeniedException("Profil livreur absent");
        return Db.id(rows.getFirst(),"id");
    }
    public void driver(long id) { if (isDriver() && driverId()!=id) throw new AccessDeniedException("Autre livreur"); }
    public void route(long id) {
        var route=db.one("SELECT driver_id FROM DELIVERY_ROUTE WHERE id=:id",Map.of("id",id));
        driver(Db.id(route,"driverId"));
    }
}

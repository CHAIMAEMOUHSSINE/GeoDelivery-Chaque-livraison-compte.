package com.geodelivery.order;

import java.math.BigDecimal;
import java.util.*;
import jakarta.validation.constraints.*;
import com.geodelivery.common.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {
    public record OrderRequest(@NotNull @Positive Long clientId,
        @NotBlank @Size(max=50) String reference,
        @NotNull @DecimalMin("0.01") @DecimalMax("1000000") BigDecimal weightKg,
        @NotNull @Pattern(regexp="LOW|NORMAL|HIGH") String priority) {}
    private final Db db; private final OrderRepository orders;
    private static final String SELECT="SELECT o.id,o.client_id,o.reference,o.weight_kg,o.priority,o.status,o.created_at,c.name client_name,c.address,c.position.SDO_POINT.Y latitude,c.position.SDO_POINT.X longitude FROM DELIVERY_ORDER o JOIN CLIENT c ON c.id=o.client_id";
    public OrderService(Db db,OrderRepository orders) { this.db=db; this.orders=orders; }
    public List<Map<String,Object>> list(int page,int size,String status) {
        return db.list(SELECT+" WHERE (:status='ALL' OR o.status=:status) ORDER BY o.id DESC OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY",
            Map.of("status",status,"offset",(long)page*size,"size",size));
    }
    public Map<String,Object> get(long id) { return db.one(SELECT+" WHERE o.id=:id",Map.of("id",id)); }
    @Transactional public Map<String,Object> save(Long id,OrderRequest r) {
        var client=db.one("SELECT active FROM CLIENT WHERE id=:id FOR UPDATE",Map.of("id",r.clientId()));
        if(Db.id(client,"active")!=1) throw BusinessException.conflict("Client désactivé");
        DeliveryOrder order=new DeliveryOrder();
        if(id!=null) {
            var old=db.one("SELECT status FROM DELIVERY_ORDER WHERE id=:id FOR UPDATE",Map.of("id",id));
            if(!"PENDING".equals(old.get("status"))) throw BusinessException.conflict("Seule une commande en attente est modifiable");
            order=orders.findById(id).orElseThrow(() -> BusinessException.missing("Commande introuvable"));
        }
        order.clientId=r.clientId(); order.reference=r.reference(); order.weightKg=r.weightKg(); order.priority=r.priority();
        order=orders.saveAndFlush(order);
        return get(order.id);
    }
    @Transactional public void status(long id,String to) {
        var old=db.one("SELECT status FROM DELIVERY_ORDER WHERE id=:id FOR UPDATE",Map.of("id",id));
        Workflow.order((String)old.get("status"),to);
        if(!"PENDING".equals(old.get("status")) || !"CANCELLED".equals(to))
            throw BusinessException.conflict("Utiliser les transitions de tournée/livraison pour une commande affectée");
        db.update("UPDATE DELIVERY_ORDER SET status=:status WHERE id=:id",Map.of("id",id,"status",to));
    }
}

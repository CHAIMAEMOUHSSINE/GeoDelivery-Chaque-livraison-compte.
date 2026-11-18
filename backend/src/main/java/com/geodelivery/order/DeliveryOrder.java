package com.geodelivery.order;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity @Table(name="DELIVERY_ORDER")
public class DeliveryOrder {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
    @Column(name="client_id",nullable=false) public Long clientId;
    @Column(nullable=false,unique=true) public String reference;
    @Column(name="weight_kg",nullable=false) public BigDecimal weightKg;
    @Column(nullable=false) public String priority;
    @Column(nullable=false) public String status="PENDING";
}

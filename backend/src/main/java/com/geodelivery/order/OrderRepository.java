package com.geodelivery.order;

import org.springframework.data.jpa.repository.JpaRepository;
public interface OrderRepository extends JpaRepository<DeliveryOrder,Long> {}

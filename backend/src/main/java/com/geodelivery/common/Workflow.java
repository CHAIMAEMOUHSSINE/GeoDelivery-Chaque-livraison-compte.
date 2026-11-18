package com.geodelivery.common;

import java.util.Map;
import java.util.Set;

public final class Workflow {
    private Workflow() {}
    private static final Map<String, Set<String>> ORDER = Map.of(
        "PENDING", Set.of("ASSIGNED","CANCELLED"),
        "ASSIGNED", Set.of("IN_DELIVERY","CANCELLED"),
        "IN_DELIVERY", Set.of("DELIVERED"), "DELIVERED", Set.of(), "CANCELLED", Set.of());
    private static final Map<String, Set<String>> ROUTE = Map.of(
        "PLANNED", Set.of("IN_PROGRESS","CANCELLED"), "IN_PROGRESS", Set.of("COMPLETED"),
        "COMPLETED", Set.of(), "CANCELLED", Set.of());
    private static final Map<String, Set<String>> DELIVERY = Map.of(
        "PENDING", Set.of("IN_PROGRESS"), "IN_PROGRESS", Set.of("DELIVERED","FAILED"),
        "DELIVERED", Set.of(), "FAILED", Set.of());
    public static void order(String from, String to) { check(ORDER, from, to); }
    public static void route(String from, String to) { check(ROUTE, from, to); }
    public static void delivery(String from, String to) { check(DELIVERY, from, to); }
    private static void check(Map<String, Set<String>> rules, String from, String to) {
        if (!rules.getOrDefault(from, Set.of()).contains(to))
            throw BusinessException.conflict("Transition interdite : " + from + " → " + to);
    }
}

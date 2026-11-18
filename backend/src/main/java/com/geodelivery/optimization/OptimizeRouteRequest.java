package com.geodelivery.optimization;

import java.util.List;
import jakarta.validation.constraints.*;

public record OptimizeRouteRequest(
    @NotNull @Positive Long driverId,@NotNull @Positive Long depotId,
    @NotEmpty @Size(max=60) List<@NotNull @Positive Long> orderIds,
    @NotNull Algorithm algorithm,@NotNull Boolean returnToDepot) {
    public enum Algorithm { NEAREST_NEIGHBOR,TWO_OPT }
}

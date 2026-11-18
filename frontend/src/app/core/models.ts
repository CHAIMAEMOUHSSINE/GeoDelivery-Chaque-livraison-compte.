export interface Row { id: number; [key: string]: any; }
export interface GeoPoint { latitude: number; longitude: number; }
export interface Stop extends GeoPoint {
  orderId: number; sequence: number; reference: string; clientName: string;
  address: string; segmentDistanceKm: number; deliveryId?: number; deliveryStatus?: string;
}
export interface Plan {
  algorithm: string; distanceMode: 'GEODESIC'; driverId: number; depotId: number;
  returnToDepot: boolean; depot: GeoPoint; initialDistanceKm: number;
  optimizedDistanceKm: number; improvementPercent: number | null;
  stopCount: number; computationTimeMs: number; totalWeightKg: number;
  capacityKg: number; orderedStops: Stop[]; returnDistanceKm: number;
}
export interface OptimizeRequest {
  driverId: number; depotId: number; orderIds: number[];
  algorithm: 'TWO_OPT' | 'NEAREST_NEIGHBOR'; returnToDepot: boolean;
}

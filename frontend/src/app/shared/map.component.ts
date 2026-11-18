import { Component, ElementRef, inject, input, effect, afterNextRender, OnDestroy } from '@angular/core';
import * as L from 'leaflet';
import { GeoPoint } from '../core/models';

export interface MapMarker extends GeoPoint { label: string; detail?: string; kind: 'depot' | 'driver' | 'client' | 'stop'; sequence?: number; }
@Component({
  selector: 'gd-map',
  template: `<div class="map-canvas" role="img" aria-label="Carte des positions et du tracé indicatif"></div>
    <div class="map-legend"><span><i class="dot depot"></i>Dépôt</span><span><i class="dot driver"></i>Livreur</span>
    <span><i class="dot client"></i>Client / arrêt</span><span class="muted">Segments droits · non routiers</span></div>`
})
export class MapComponent implements OnDestroy {
  markers = input<MapMarker[]>([]);
  path = input<GeoPoint[]>([]);
  private map?: L.Map;
  private layer?: L.LayerGroup;
  private element = inject<ElementRef<HTMLElement>>(ElementRef);
  constructor() {
    afterNextRender(() => {
      this.map = L.map(this.element.nativeElement.querySelector<HTMLElement>('.map-canvas')!).setView([33.57, -7.63], 12);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19, crossOrigin: true
      }).addTo(this.map);
      this.layer = L.layerGroup().addTo(this.map); this.draw();
    });
    effect(() => { this.markers(); this.path(); this.draw(); });
  }
  private draw() {
    if (!this.map || !this.layer) return;
    this.layer.clearLayers();
    const bounds: L.LatLngExpression[] = [];
    for (const m of this.markers()) {
      const point: L.LatLngExpression = [m.latitude, m.longitude]; bounds.push(point);
      const popup = document.createElement('div');
      const strong = document.createElement('strong'); strong.textContent = m.label;
      const text = document.createElement('p'); text.textContent = m.detail || '';
      popup.append(strong, text);
      const icon = L.divIcon({ className: `geo-marker ${m.kind}`, html: `<span>${m.sequence ?? (m.kind === 'depot' ? '⌂' : m.kind === 'driver' ? '↗' : '')}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] });
      L.marker(point, { icon }).bindPopup(popup).addTo(this.layer);
    }
    const line = this.path().map(p => [p.latitude, p.longitude] as L.LatLngTuple);
    if (line.length > 1) L.polyline(line, { color: '#246d55', weight: 4, dashArray: '9 7', opacity: .85 }).addTo(this.layer);
    if (bounds.length) this.map.fitBounds(L.latLngBounds(bounds), { padding: [35, 35], maxZoom: 14 });
    this.map.invalidateSize();
  }
  ngOnDestroy() { this.map?.remove(); }
}

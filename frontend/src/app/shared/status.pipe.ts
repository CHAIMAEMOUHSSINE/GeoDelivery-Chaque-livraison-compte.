import { Pipe, PipeTransform } from '@angular/core';
@Pipe({ name: 'statusLabel' })
export class StatusPipe implements PipeTransform {
  transform(value: string): string {
    return ({
      PENDING: 'En attente', ASSIGNED: 'Affectée', IN_DELIVERY: 'En livraison', DELIVERED: 'Livrée',
      CANCELLED: 'Annulée', AVAILABLE: 'Disponible', BUSY: 'En tournée', OFFLINE: 'Hors ligne',
      PLANNED: 'Planifiée', IN_PROGRESS: 'En cours', COMPLETED: 'Terminée', FAILED: 'Échec',
      LOW: 'Basse', NORMAL: 'Normale', HIGH: 'Haute'
    } as Record<string, string>)[value] || value;
  }
}

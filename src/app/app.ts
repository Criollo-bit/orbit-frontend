import { Component, OnInit, AfterViewInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms'; 

// Esto permite usar la librería de mapas sin instalarla con npm
declare const L: any;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule], 
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent implements OnInit, AfterViewInit {
  private http = inject(HttpClient);

  // --- ⚠️ IMPORTANTE: CAMBIA ESTO POR LA URL QUE TE DE RENDER ---
  // Ejemplo: 'https://orbit-backend-xis2.onrender.com'
  // Si estás probando en local, usa 'http://localhost:3001'
  private apiUrl = 'https://TU-URL-DE-RENDER-AQUI.onrender.com'; 

  shipments: any[] = [];
  selectedShipment: any = null;
  currentTime = new Date();
  searchTerm: string = '';
  showModal = false;
  newOrder = { origin: '', destination: '', type: 'land' };

  // Variables del Mapa
  private map: any;
  private markers: any[] = [];
  private currentRoute: any;

  ngOnInit() {
    this.loadData();
    setInterval(() => { this.currentTime = new Date(); }, 1000);
  }

  // Se ejecuta cuando la vista ya cargó (para poder pintar el mapa)
  ngAfterViewInit() {
    this.initMap();
  }

  loadData() {
    // Usamos la variable apiUrl en lugar de localhost
    this.http.get<any[]>(`${this.apiUrl}/api/shipments`)
      .subscribe(data => {
        this.shipments = data;
        // Esperamos un poco para poner los marcadores si el mapa no está listo
        setTimeout(() => this.updateMapMarkers(), 500);
      }, error => {
        console.error('Error conectando al backend:', error);
      });
  }

  // --- MAPA ---
  initMap() {
    // 1. Crear mapa centrado en el mundo
    this.map = L.map('map', { zoomControl: false }).setView([20, -40], 3);

    // 2. Usar un estilo de mapa OSCURO (Cyberpunk)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(this.map);
  }

  updateMapMarkers() {
    if (!this.map) return;
    
    // Limpiar marcadores viejos
    this.markers.forEach(m => this.map.removeLayer(m));
    this.markers = [];

    this.shipments.forEach(ship => {
      // Elegir color según estado
      let color = '#00f3ff'; // Azul
      if (ship.status === 'ENTREGADO') color = '#0aff60'; // Verde
      if (ship.status === 'RETRASADO') color = '#ff9e00'; // Naranja

      // Crear icono personalizado (Punto brillante CSS)
      const customIcon = L.divIcon({
        className: 'custom-pin',
        html: `<div style="background-color:${color}; width:12px; height:12px; border-radius:50%; box-shadow:0 0 10px ${color}; border:2px solid white;"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });

      // Poner marcador
      const marker = L.marker([ship.coords.lat, ship.coords.lng], { icon: customIcon })
        .addTo(this.map)
        .bindPopup(`<b>${ship.id}</b><br>${ship.origin} ➝ ${ship.destination}`);
      
      // Click en el marcador selecciona el pedido
      marker.on('click', () => this.selectShipment(ship));
      
      this.markers.push(marker);
    });
  }

  drawRoute(ship: any) {
    if (this.currentRoute) this.map.removeLayer(this.currentRoute);

    if (ship.route) {
      // Dibujar línea punteada entre origen y destino actual
      const points = [ship.route.start, ship.route.end];
      
      this.currentRoute = L.polyline(points, {
        color: 'var(--neon-blue)', 
        weight: 3, 
        opacity: 0.6, 
        dashArray: '10, 10' // Efecto punteado
      }).addTo(this.map);

      // Hacer zoom para que quepa toda la ruta
      this.map.fitBounds(this.currentRoute.getBounds(), { padding: [50, 50] });
    }
  }

  // --- LÓGICA GENERAL ---
  get filteredShipments() {
    if (!this.searchTerm.trim()) return this.shipments;
    return this.shipments.filter(s => s.id.toLowerCase().includes(this.searchTerm.toLowerCase()));
  }

  // Estadísticas calculadas al vuelo
  get stats() {
    return {
      total: this.shipments.length,
      transit: this.shipments.filter(s => s.status === 'EN TRANSITO').length,
      alert: this.shipments.filter(s => s.status === 'RETRASADO').length,
      done: this.shipments.filter(s => s.status === 'ENTREGADO').length
    };
  }

  selectShipment(ship: any) {
    this.selectedShipment = ship;
    this.drawRoute(ship);
  }

  closeDetails() {
    this.selectedShipment = null;
    if (this.currentRoute) this.map.removeLayer(this.currentRoute);
    this.map.setView([20, -40], 3); // Reset zoom
  }

  toggleModal() { this.showModal = !this.showModal; }
  
  createShipment() {
    const newId = 'PED-' + Math.floor(Math.random() * 9000 + 1000);
    const payload = {
      id: newId, status: 'EN TRANSITO',
      origin: this.newOrder.origin || 'Desconocido',
      destination: this.newOrder.destination || 'Desconocido',
      progress: 0, type: this.newOrder.type,
      fechaEntrega: 'Pendiente', descripcion: 'Nueva Carga'
    };
    
    // Usamos la variable apiUrl
    this.http.post(`${this.apiUrl}/api/shipments`, payload)
      .subscribe(() => {
        this.loadData();
        this.toggleModal();
        this.newOrder = { origin: '', destination: '', type: 'land' };
      }, error => {
        console.error('Error creando envío:', error);
      });
  }

  getStatusColor(status: string) {
    if(status === 'EN TRANSITO') return 'var(--neon-blue)';
    if(status === 'ENTREGADO') return 'var(--neon-green)';
    return 'var(--neon-orange)';
  }
}
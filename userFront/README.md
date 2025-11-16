# Bus Tracking System - Live Tracking Component

## BusDetails Component

A comprehensive React component for live bus tracking with real-time updates via Socket.IO and REST API fallbacks.

### Features

- **Real-time Updates**: Socket.IO connection with polling fallback
- **Mobile-First Design**: Optimized for mobile devices and low bandwidth
- **Offline Support**: Demo mode when backend is unavailable
- **Local Caching**: Route data and polylines cached in IndexedDB
- **Interactive Map**: Leaflet-based map with bus and stop markers
- **ETA Display**: Live estimated arrival times for all stops
- **Connection Status**: Visual indicators for online/offline status

### Usage

```tsx
import BusDetails from './components/BusDetails';

<BusDetails
  busId="bWewn4q-boUVm"
  routeName="Vashi2Airoli"
  busNumber="WB 12 B 1243"
  initialStops={[
    { stopId: "s1", name: "Vashi Bus Depot", etaMinutes: 0 },
    { stopId: "s2", name: "Sanpada Railway Station", etaMinutes: 5 }
  ]}
/>
```

### Configuration

Set environment variables:
- `REACT_APP_API_BASE`: Backend API URL (default: http://localhost:4000)
- `REACT_APP_SOCKET_URL`: Socket.IO server URL (default: http://localhost:4000)

### Backend Integration

The component expects these API endpoints:

1. **Live Bus Data**: `GET /api/bus/:busId/live`
2. **Route Data**: `GET /api/admin/routes?routeName=:routeName`
3. **Route with Polyline**: `GET /api/admin/routes-with-polyline?routeName=:routeName`
4. **Socket.IO Events**: `bus:update` events on route-specific rooms

### Low-Bandwidth Optimizations

- Lazy map loading with user consent
- Local caching of route data and polylines
- Throttled UI updates
- Minimal payload sizes
- Socket.IO preferred over polling
- Compressed map tiles and small icons

### Demo Mode

When backend is unavailable, the component automatically switches to demo mode with simulated data updates.

### Dependencies

- `axios`: HTTP client
- `socket.io-client`: WebSocket connection
- `localforage`: IndexedDB caching
- `react-leaflet`: Map component
- `@mapbox/polyline`: Polyline decoding

### Mobile Features

- Touch-friendly interface
- Responsive design
- Reduced motion support
- Offline indicators
- Battery-conscious updates
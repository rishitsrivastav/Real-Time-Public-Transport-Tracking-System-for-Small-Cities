import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bus, MapPin, Clock, ChevronDown, ChevronUp, Navigation } from 'lucide-react';

interface Stop {
  name: string;
  lat: number;
  lng: number;
}

interface Route {
  _id: string;
  routeName: string;
  stops: Stop[];
}

interface BusData {
  _id: string;
  busId: string;
  busNumber: string;
  capacity: number;
  driverId: string;
  routeId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  route: Route;
}

interface BusCardProps {
  bus: BusData;
}

const BusCard: React.FC<BusCardProps> = ({ bus }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleViewRoute = () => {
    navigate(`/bus/${bus.busId}`);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden transform hover:-translate-y-1">
      {/* Card Header */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <Bus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 leading-tight">
                {bus.route.stops.length > 0 ? 
                  `${bus.route.stops[0].name} - ${bus.route.stops[bus.route.stops.length - 1].name}` 
                  : 'No stops available'
                }
              </h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(bus.status)}`}>
                {bus.status.charAt(0).toUpperCase() + bus.status.slice(1)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Capacity</p>
            <p className="font-semibold text-gray-900">{bus.capacity} seats</p>
          </div>
        </div>

        {/* Route Information */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center space-x-2">
            <Navigation className="w-4 h-4 text-emerald-600" />
            <span className="font-medium text-gray-900">Route:</span>
            <span className="text-gray-700">{bus.route.routeName}</span>
          </div>
          <div className="ml-6">
            <span className="text-sm text-gray-600">{bus.busNumber}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="font-medium text-gray-900">Starts at:</span>
            <span className="text-gray-700">7:30 AM</span>
          </div>
        </div>

        {/* Stops Preview */}
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <MapPin className="w-4 h-4 text-rose-600" />
            <span className="font-medium text-gray-900">Stops:</span>
          </div>
          
          {!isExpanded && (
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {bus.route.stops.slice(0, 3).map((stop, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700 whitespace-nowrap border"
                >
                  {stop.name}
                </div>
              ))}
              {bus.route.stops.length > 3 && (
                <div className="flex-shrink-0 px-3 py-1 bg-blue-100 rounded-full text-sm text-blue-700">
                  +{bus.route.stops.length - 3} more
                </div>
              )}
            </div>
          )}
        </div>

        {/* Expand/Collapse Button */}
        <div className="space-y-2">
          <button
            onClick={handleViewRoute}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105"
          >
            <MapPin className="w-4 h-4" />
            <span className="font-medium">Track Bus</span>
          </button>
          
          <button
            onClick={toggleExpanded}
            className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-colors duration-200"
          >
            <span className="font-medium">
              {isExpanded ? 'Hide Details' : 'View All Stops'}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50 p-6">
          <h4 className="font-semibold text-gray-900 mb-3">All Stops on Route</h4>
          <div className="space-y-2">
            {bus.route.stops.map((stop, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm"
              >
                <div className="flex-shrink-0 w-7 h-7 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-xs font-semibold text-blue-600">{index + 1}</span>
                </div>
                <span className="text-gray-700">{stop.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BusCard;
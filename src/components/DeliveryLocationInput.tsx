import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  MapPin, Search, Loader2, Check, X, 
  Building, Maximize2,
  ZoomIn, ZoomOut,
  LocateFixed, Route, Globe2, Map, Crosshair
} from 'lucide-react';

interface AddressPrediction {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
  source?: 'nominatim' | 'photon';
  coordinates?: { lat: number; lng: number };
  address_components?: {
    street_number: string;
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

interface AddressDetails {
  formatted_address: string;
  lat: number;
  lng: number;
  street_number: string;
  street: string;
  city: string;
  state: string;
  state_short: string;
  country: string;
  country_short: string;
  postal_code: string;
}

interface DeliveryLocationInputProps {
  onAddressSelect: (address: AddressDetails) => void;
  initialValue?: string;
  placeholder?: string;
  label?: string;
  required?: boolean;
  showMap?: boolean;
  className?: string;
}

// --- Nominatim (OpenStreetMap) Geocoding Helpers ---
// These are free, no API key needed, and work reliably

async function nominatimSearch(query: string): Promise<AddressPrediction[]> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6&addressdetails=1`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.map((item: any) => ({
      place_id: String(item.place_id),
      description: item.display_name,
      main_text: item.name || item.display_name?.split(',')[0] || '',
      secondary_text: item.display_name?.split(',').slice(1).join(',').trim() || '',
      source: 'nominatim' as const,
      coordinates: { lat: parseFloat(item.lat), lng: parseFloat(item.lon) },
      address_components: {
        street_number: item.address?.house_number || '',
        street: item.address?.road || item.address?.pedestrian || '',
        city: item.address?.city || item.address?.town || item.address?.village || item.address?.municipality || '',
        state: item.address?.state || item.address?.region || '',
        postal_code: item.address?.postcode || '',
        country: item.address?.country || ''
      }
    }));
  } catch (err) {
    console.warn('Nominatim search error:', err);
    return [];
  }
}

async function nominatimReverse(lat: number, lng: number): Promise<AddressDetails | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data || data.error) return null;

    const addr = data.address || {};
    return {
      formatted_address: data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      lat,
      lng,
      street_number: addr.house_number || '',
      street: addr.road || addr.pedestrian || '',
      city: addr.city || addr.town || addr.village || addr.municipality || '',
      state: addr.state || addr.region || '',
      state_short: addr.state || addr.region || '',
      country: addr.country || '',
      country_short: addr.country_code?.toUpperCase() || '',
      postal_code: addr.postcode || ''
    };
  } catch (err) {
    console.warn('Nominatim reverse geocode error:', err);
    return null;
  }
}

// --- Photon (Komoot) Search Helpers ---
async function photonSearch(query: string): Promise<AddressPrediction[]> {
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) return [];
    const data = await response.json();
    if (!data?.features) return [];
    return data.features.map((feature: any) => {
      const props = feature.properties || {};
      const coords = feature.geometry?.coordinates || [0, 0];
      const parts = [props.name, props.street, props.city, props.state, props.country].filter(Boolean);
      return {
        place_id: `photon_${props.osm_id || Math.random()}`,
        description: parts.join(', '),
        main_text: props.name || props.street || '',
        secondary_text: [props.city, props.state, props.country].filter(Boolean).join(', '),
        source: 'photon' as const,
        coordinates: { lat: coords[1], lng: coords[0] },
        address_components: {
          street_number: props.housenumber || '',
          street: props.street || '',
          city: props.city || props.town || props.village || '',
          state: props.state || '',
          postal_code: props.postcode || '',
          country: props.country || ''
        }
      };
    });
  } catch (err) {
    console.warn('Photon search error:', err);
    return [];
  }
}

export default function DeliveryLocationInput({
  onAddressSelect,
  initialValue = '',
  placeholder = 'Enter delivery address...',
  label = 'Delivery Address',
  required = false,
  showMap = true,
  className = ''
}: DeliveryLocationInputProps) {
  const [inputValue, setInputValue] = useState(initialValue);
  const [predictions, setPredictions] = useState<AddressPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<AddressDetails | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isFullscreenMap, setIsFullscreenMap] = useState(false);
  const [mapZoom, setMapZoom] = useState(15);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [mapLayer, setMapLayer] = useState<'roadmap' | 'satellite' | 'terrain' | 'hybrid'>('roadmap');
  const [isLocating, setIsLocating] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced autocomplete search using free geocoding APIs
  const searchAddresses = useCallback(async (query: string) => {
    if (query.length < 3) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);
    try {
      // Try Photon first (faster), fall back to Nominatim
      let results = await photonSearch(query);
      if (results.length === 0) {
        results = await nominatimSearch(query);
      }
      if (mountedRef.current) {
        setPredictions(results);
        setShowDropdown(results.length > 0);
      }
    } catch (err) {
      console.warn('Address search error:', err);
      if (mountedRef.current) {
        setPredictions([]);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Handle input change with debounce
  const handleInputChange = (value: string) => {
    setInputValue(value);
    setSelectedAddress(null);
    setValidationError(null);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchAddresses(value);
    }, 350);
  };

  // Handle prediction selection
  const handleSelectPrediction = async (prediction: AddressPrediction) => {
    setShowDropdown(false);
    setInputValue(prediction.description);

    try {
      if (prediction.coordinates && prediction.address_components) {
        const addressDetails: AddressDetails = {
          formatted_address: prediction.description,
          lat: prediction.coordinates.lat,
          lng: prediction.coordinates.lng,
          street_number: prediction.address_components.street_number || '',
          street: prediction.address_components.street || '',
          city: prediction.address_components.city || '',
          state: prediction.address_components.state || '',
          state_short: prediction.address_components.state || '',
          country: prediction.address_components.country || '',
          country_short: prediction.address_components.country || '',
          postal_code: prediction.address_components.postal_code || ''
        };

        if (mountedRef.current) {
          setSelectedAddress(addressDetails);
          setMapCenter({ lat: addressDetails.lat, lng: addressDetails.lng });
          onAddressSelect(addressDetails);
        }
        return;
      }

      // Fallback: geocode the description text
      await geocodeAndSelect(prediction.description);
    } catch (err) {
      console.warn('Prediction selection error:', err);
      // Still try to geocode as fallback
      try {
        await geocodeAndSelect(prediction.description);
      } catch {
        if (mountedRef.current) {
          setValidationError('Could not validate this address. Please try again.');
        }
      }
    }
  };

  // Geocode an address using Nominatim
  const geocodeAndSelect = async (address: string) => {
    setIsValidating(true);
    try {
      const results = await nominatimSearch(address);
      if (results.length > 0 && results[0].coordinates) {
        const result = results[0];
        const addressDetails: AddressDetails = {
          formatted_address: result.description,
          lat: result.coordinates!.lat,
          lng: result.coordinates!.lng,
          street_number: result.address_components?.street_number || '',
          street: result.address_components?.street || '',
          city: result.address_components?.city || '',
          state: result.address_components?.state || '',
          state_short: result.address_components?.state || '',
          country: result.address_components?.country || '',
          country_short: result.address_components?.country || '',
          postal_code: result.address_components?.postal_code || ''
        };

        if (mountedRef.current) {
          setSelectedAddress(addressDetails);
          setMapCenter({ lat: addressDetails.lat, lng: addressDetails.lng });
          setInputValue(result.description);
          onAddressSelect(addressDetails);
        }
      } else {
        if (mountedRef.current) {
          setValidationError('Could not validate this address. Please try a more specific address.');
        }
      }
    } catch (err) {
      console.warn('Geocoding error:', err);
      if (mountedRef.current) {
        setValidationError('Failed to validate address. Please check your connection and try again.');
      }
    } finally {
      if (mountedRef.current) {
        setIsValidating(false);
      }
    }
  };

  // Reverse geocode from coordinates using Nominatim
  const reverseGeocode = async (lat: number, lng: number) => {
    setIsValidating(true);
    setValidationError(null);
    try {
      const addressDetails = await nominatimReverse(lat, lng);
      
      if (addressDetails && mountedRef.current) {
        setInputValue(addressDetails.formatted_address);
        setSelectedAddress(addressDetails);
        setMapCenter({ lat, lng });
        onAddressSelect(addressDetails);
      } else if (mountedRef.current) {
        // Even if reverse geocode fails, show coordinates
        const fallbackAddress: AddressDetails = {
          formatted_address: `Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          lat,
          lng,
          street_number: '',
          street: '',
          city: '',
          state: '',
          state_short: '',
          country: '',
          country_short: '',
          postal_code: ''
        };
        setInputValue(fallbackAddress.formatted_address);
        setSelectedAddress(fallbackAddress);
        setMapCenter({ lat, lng });
        onAddressSelect(fallbackAddress);
        setValidationError('Could not determine full address. Location coordinates saved.');
      }
    } catch (err) {
      console.warn('Reverse geocode error:', err);
      if (mountedRef.current) {
        // Fallback to just coordinates
        const fallbackAddress: AddressDetails = {
          formatted_address: `Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          lat,
          lng,
          street_number: '',
          street: '',
          city: '',
          state: '',
          state_short: '',
          country: '',
          country_short: '',
          postal_code: ''
        };
        setInputValue(fallbackAddress.formatted_address);
        setSelectedAddress(fallbackAddress);
        setMapCenter({ lat, lng });
        onAddressSelect(fallbackAddress);
        setValidationError('Could not determine full address. Location coordinates saved.');
      }
    } finally {
      if (mountedRef.current) {
        setIsValidating(false);
        setIsLocating(false);
      }
    }
  };

  // Validate manually entered address
  const handleValidateAddress = async () => {
    if (!inputValue.trim()) return;
    setValidationError(null);
    await geocodeAndSelect(inputValue);
  };

  // Use current location with high accuracy
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setValidationError('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    setIsValidating(true);
    setValidationError(null);

    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!mountedRef.current) return;
          // Successfully got position, now reverse geocode
          reverseGeocode(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          if (!mountedRef.current) return;
          setIsLocating(false);
          setIsValidating(false);
          switch (error.code) {
            case error.PERMISSION_DENIED:
              setValidationError('Location permission denied. Please enable location access in your browser settings.');
              break;
            case error.POSITION_UNAVAILABLE:
              setValidationError('Location information is unavailable. Please enter your address manually.');
              break;
            case error.TIMEOUT:
              setValidationError('Location request timed out. Please try again or enter your address manually.');
              break;
            default:
              setValidationError('Failed to get your location. Please enter your address manually.');
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
      );
    } catch (err) {
      console.warn('Geolocation error:', err);
      if (mountedRef.current) {
        setIsLocating(false);
        setIsValidating(false);
        setValidationError('Failed to access location services. Please enter your address manually.');
      }
    }
  };

  // Clear selection
  const handleClear = () => {
    setInputValue('');
    setSelectedAddress(null);
    setPredictions([]);
    setValidationError(null);
    setMapCenter(null);
    inputRef.current?.focus();
  };

  // Get source badge color
  const getSourceBadge = (source?: string) => {
    switch (source) {
      case 'photon':
        return <Badge variant="outline" className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30">OpenStreetMap</Badge>;
      case 'nominatim':
        return <Badge variant="outline" className="text-xs bg-green-500/20 text-green-400 border-green-500/30">OpenStreetMap</Badge>;
      default:
        return null;
    }
  };

  // Get map embed URL - using OpenStreetMap embed (no API key, no cross-origin issues)
  const getMapEmbedUrl = (lat: number, lng: number, zoom: number = 15) => {
    // Use OpenStreetMap embed which is free and doesn't cause cross-origin errors
    const bbox = getBbox(lat, lng, zoom);
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  };

  // Calculate bounding box for OpenStreetMap embed
  const getBbox = (lat: number, lng: number, zoom: number) => {
    const offset = 360 / Math.pow(2, zoom);
    return `${lng - offset},${lat - offset / 2},${lng + offset},${lat + offset / 2}`;
  };

  // Interactive Map Component using OpenStreetMap (no API key, no CORS issues)
  const MapEmbed = ({ fullscreen = false }: { fullscreen?: boolean }) => {
    const coords = selectedAddress || mapCenter;
    if (!coords) return null;

    const mapHeight = fullscreen ? 'h-[70vh]' : 'h-64';

    return (
      <div className={`relative ${mapHeight} rounded-lg overflow-hidden border border-slate-600 bg-slate-800`}>
        {/* Map Controls */}
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-2">
          {!fullscreen && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setIsFullscreenMap(true)}
              className="bg-white/90 hover:bg-white text-slate-800 shadow-lg"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setMapZoom(Math.min(mapZoom + 1, 18))}
            className="bg-white/90 hover:bg-white text-slate-800 shadow-lg"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setMapZoom(Math.max(mapZoom - 1, 3))}
            className="bg-white/90 hover:bg-white text-slate-800 shadow-lg"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>

        {/* Map Type Selector */}
        <div className="absolute top-2 left-2 z-10 flex gap-1">
          {(['roadmap', 'satellite'] as const).map((type) => (
            <Button
              key={type}
              type="button"
              size="sm"
              variant={mapLayer === type ? 'default' : 'secondary'}
              onClick={() => setMapLayer(type)}
              className={`text-xs px-2 py-1 h-7 ${mapLayer === type ? 'bg-[#D4AF37] text-slate-900' : 'bg-white/90 hover:bg-white text-slate-800'}`}
            >
              {type === 'roadmap' ? 'Map' : 'Satellite'}
            </Button>
          ))}
        </div>

        {/* OpenStreetMap Embed - No cross-origin issues */}
        <iframe
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={getMapEmbedUrl(coords.lat, coords.lng, mapZoom)}
          className="w-full h-full"
          title="Delivery location map"
          sandbox="allow-scripts allow-same-origin"
        />

        {/* Coordinates Display */}
        <div className="absolute bottom-2 left-2 z-10 bg-black/80 text-white px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2">
          <Globe2 className="h-3 w-3 text-[#D4AF37]" />
          {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
        </div>

        {/* View on Google Maps Link */}
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-2 right-2 z-10 bg-white hover:bg-gray-100 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-lg transition-colors"
        >
          <Map className="h-3.5 w-3.5" />
          Open in Google Maps
        </a>
      </div>
    );
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {label && (
        <Label className="text-sm font-medium text-white flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#D4AF37]" />
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}

      <div className="relative">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => predictions.length > 0 && setShowDropdown(true)}
            placeholder={placeholder}
            className={`pl-10 pr-24 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 ${selectedAddress ? 'border-green-500 bg-green-500/10' : ''} ${validationError ? 'border-red-500' : ''}`}
          />
          
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            {isLoading || isValidating ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#D4AF37]" />
            ) : selectedAddress ? (
              <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                <Check className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            ) : inputValue.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-6 w-6 p-0 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>

        {/* Predictions Dropdown */}
        {showDropdown && predictions.length > 0 && (
          <div 
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-64 overflow-y-auto"
          >
            {predictions.map((prediction, index) => (
              <button
                key={`${prediction.place_id}-${index}`}
                type="button"
                onClick={() => handleSelectPrediction(prediction)}
                className="w-full px-4 py-3 text-left hover:bg-slate-700 flex items-start gap-3 border-b border-slate-700 last:border-b-0 transition-colors"
              >
                <MapPin className="h-4 w-4 text-[#D4AF37] mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm truncate">{prediction.main_text}</p>
                  <p className="text-xs text-slate-400 truncate">{prediction.secondary_text}</p>
                </div>
                {prediction.source && getSourceBadge(prediction.source)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUseCurrentLocation}
          disabled={isValidating || isLocating}
          className="text-xs bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
        >
          {isLocating ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <LocateFixed className="h-3 w-3 mr-1" />
          )}
          Use My Location
        </Button>
        
        {inputValue && !selectedAddress && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleValidateAddress}
            disabled={isValidating}
            className="text-xs bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
          >
            <Search className="h-3 w-3 mr-1" />
            Validate Address
          </Button>
        )}

        {showMap && selectedAddress && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreenMap(true)}
              className="text-xs bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
            >
              <Maximize2 className="h-3 w-3 mr-1" />
              Expand Map
            </Button>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedAddress.lat},${selectedAddress.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md font-medium transition-colors"
            >
              <Route className="h-3 w-3 mr-1" />
              Get Directions
            </a>
          </>
        )}
      </div>

      {/* Validation Error */}
      {validationError && (
        <p className="text-sm text-red-400 flex items-center gap-1">
          <X className="h-4 w-4" />
          {validationError}
        </p>
      )}

      {/* Selected Address Details */}
      {selectedAddress && (
        <Card className="bg-slate-800/50 border-slate-600">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="h-5 w-5 text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white text-sm">{selectedAddress.formatted_address}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedAddress.city && (
                    <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-300">
                      <Building className="h-3 w-3 mr-1" />
                      {selectedAddress.city}
                    </Badge>
                  )}
                  {selectedAddress.state_short && (
                    <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-300">
                      {selectedAddress.state_short}
                    </Badge>
                  )}
                  {selectedAddress.postal_code && (
                    <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-300">
                      {selectedAddress.postal_code}
                    </Badge>
                  )}
                  {selectedAddress.country && (
                    <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-300">
                      {selectedAddress.country}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interactive Map */}
      {showMap && selectedAddress && (
        <MapEmbed />
      )}

      {/* Fullscreen Map Dialog */}
      <Dialog open={isFullscreenMap} onOpenChange={setIsFullscreenMap}>
        <DialogContent className="max-w-5xl bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Map className="h-5 w-5 text-[#D4AF37]" />
              Delivery Location
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedAddress && (
              <div className="bg-slate-800 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#D4AF37]/20 rounded-full flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-[#D4AF37]" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{selectedAddress.formatted_address}</p>
                    <p className="text-slate-400 text-sm flex items-center gap-2">
                      <Globe2 className="h-3 w-3" />
                      {selectedAddress.lat.toFixed(6)}, {selectedAddress.lng.toFixed(6)}
                    </p>
                  </div>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedAddress.lat},${selectedAddress.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Route className="h-4 w-4 mr-2" />
                  Get Directions
                </a>
              </div>
            )}
            <MapEmbed fullscreen />
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseCurrentLocation}
                  disabled={isValidating || isLocating}
                  className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
                >
                  {isLocating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Crosshair className="h-4 w-4 mr-2" />
                  )}
                  Recenter to My Location
                </Button>
              </div>
              <Button
                onClick={() => setIsFullscreenMap(false)}
                className="bg-[#D4AF37] text-slate-900 font-bold hover:bg-[#B8941F]"
              >
                Confirm Location
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

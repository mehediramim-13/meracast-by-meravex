export interface Place {
  id: string;
  name: string;
  country: string;
  countryCode?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  population?: number;
}

export interface SavedPlace extends Place {
  addedAt: number;
}

export interface GeocodeResult extends Place {
  elevation?: number;
  featureCode?: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

import * as Locations from '../models/locationModel.js';
import { HttpError } from '../middleware/errorHandler.js';

export const EARTH_RADIUS_KM = 6371;
export const RADIUS_LIMITS = { min: 1, max: 25, default: 5 };

const toRad = (deg) => (deg * Math.PI) / 180;

/** Great-circle distance in km (Haversine). Mirrors the SQL in flatmateModel.js — keep them in sync. */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Lat/lng box that contains every point within `radiusKm` of the origin (cheap pre-filter before Haversine). */
export function boundingBox(lat, lng, radiusKm) {
  const dLat = radiusKm / 111.045;
  const dLng = radiusKm / (111.045 * Math.cos(toRad(lat)));
  return { minLat: lat - dLat, maxLat: lat + dLat, minLng: lng - dLng, maxLng: lng + dLng };
}

/**
 * Where distances are measured from:
 *  - areaId given → that neighbourhood's centre
 *  - else cityId given → the city centre
 *  - else the viewer's own neighbourhood, or their city centre
 */
export async function resolveOrigin({ areaId, cityId }, viewerProfile) {
  if (areaId) {
    const area = await Locations.findAreaWithCoords(areaId);
    if (!area) throw new HttpError(400, 'VALIDATION_ERROR', 'Unknown neighbourhood');
    if (cityId && area.cityId !== cityId) throw new HttpError(400, 'VALIDATION_ERROR', 'That neighbourhood is not in the selected city');
    return { type: 'area', id: area.id, name: area.name, cityId: area.cityId, cityName: area.cityName, lat: area.lat, lng: area.lng };
  }
  if (cityId) {
    const city = await Locations.findCityWithCoords(cityId);
    if (!city) throw new HttpError(400, 'VALIDATION_ERROR', 'Unknown city');
    return { type: 'city', id: city.id, name: city.name, cityId: city.id, cityName: city.name, lat: city.lat, lng: city.lng };
  }
  if (viewerProfile?.area) return resolveOrigin({ areaId: viewerProfile.area.id }, null);
  if (viewerProfile?.city) return resolveOrigin({ cityId: viewerProfile.city.id }, null);
  throw new HttpError(400, 'LOCATION_REQUIRED', 'Choose a city or neighbourhood to search from');
}

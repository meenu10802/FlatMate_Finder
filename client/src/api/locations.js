import { useQuery } from '@tanstack/react-query';
import { api } from './client.js';

export const fetchCities = () => api.get('/locations/cities').then((r) => r.data.cities);
export const fetchAreas = (cityId) => api.get(`/locations/cities/${cityId}/areas`).then((r) => r.data.areas);

const HOUR = 60 * 60 * 1000;

export const useCities = () => useQuery({ queryKey: ['cities'], queryFn: fetchCities, staleTime: HOUR });

export const useAreas = (cityId) =>
  useQuery({ queryKey: ['areas', cityId], queryFn: () => fetchAreas(cityId), enabled: Boolean(cityId), staleTime: HOUR });

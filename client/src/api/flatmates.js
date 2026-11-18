import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from './client.js';

/** params: { cityId?, areaId?, radiusKm?, page? } — omitted values fall back to the viewer's profile on the server. */
export const fetchFlatmates = (params) => api.get('/flatmates', { params }).then((r) => r.data);

export const useFlatmates = (params, { enabled = true } = {}) =>
  useQuery({
    queryKey: ['flatmates', params],
    queryFn: () => fetchFlatmates(params),
    placeholderData: keepPreviousData, // keep cards on screen while the radius changes
    enabled,
  });

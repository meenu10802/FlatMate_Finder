import * as Profiles from '../models/profileModel.js';
import * as Locations from '../models/locationModel.js';
import { HttpError } from '../middleware/errorHandler.js';

const fieldError = (field, message) =>
  new HttpError(400, 'VALIDATION_ERROR', 'Invalid request', { formErrors: [], fieldErrors: { [field]: [message] } });

export async function getOwn(userId) {
  const profile = await Profiles.findByUserId(userId);
  if (!profile) throw new HttpError(404, 'PROFILE_NOT_FOUND', 'You have not created a profile yet');
  return profile;
}

export async function getPublic(userId) {
  const profile = await Profiles.findByUserId(userId, { activeOnly: true });
  if (!profile) throw new HttpError(404, 'NOT_FOUND', 'Profile not found');
  return profile;
}

export async function save(userId, data) {
  if (!(await Locations.findCity(data.cityId))) throw fieldError('cityId', 'Choose a city from the list');
  if (data.areaId) {
    const area = await Locations.findArea(data.areaId);
    if (!area || area.cityId !== data.cityId) throw fieldError('areaId', 'That neighbourhood is not in the selected city');
  }
  return Profiles.upsert(userId, data);
}

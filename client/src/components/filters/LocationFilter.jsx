import { LocateFixed } from 'lucide-react';
import { useAreas, useCities } from '../../api/locations.js';
import { RADIUS } from '../../lib/constants.js';
import Pill from '../ui/Pill.jsx';
import Slider from '../ui/Slider.jsx';
import Eyebrow from '../ui/Eyebrow.jsx';

/**
 * City → neighbourhood → radius. Distances on results are measured from the selected
 * neighbourhood's centre, or the city centre when "City centre" is selected.
 * value: { cityId, areaId, radiusKm }
 */
export default function LocationFilter({ value, onChange }) {
  const cities = useCities();
  const areas = useAreas(value.cityId);
  const city = cities.data?.find((c) => c.id === value.cityId);

  return (
    <div className="space-y-7">
      <div>
        <Eyebrow>City</Eyebrow>
        <div className="mt-3 flex flex-wrap gap-2">
          {cities.data?.map((c) => (
            <Pill key={c.id} active={value.cityId === c.id}
              onClick={() => value.cityId !== c.id && onChange({ cityId: c.id, areaId: null })}>
              {c.name}
            </Pill>
          ))}
        </div>
      </div>

      {value.cityId && (
        <div>
          <Eyebrow>Measure distance from</Eyebrow>
          <div className="mt-3 flex flex-wrap gap-2">
            <Pill active={!value.areaId} onClick={() => onChange({ areaId: null })}>
              <LocateFixed size={14} /> {city?.name ?? 'City'} centre
            </Pill>
            {areas.data?.map((a) => (
              <Pill key={a.id} active={value.areaId === a.id} onClick={() => onChange({ areaId: a.id })}>
                {a.name}
              </Pill>
            ))}
          </div>
        </div>
      )}

      <Slider
        label="Within"
        min={RADIUS.min}
        max={RADIUS.max}
        value={value.radiusKm}
        onChange={(v) => onChange({ radiusKm: v })}
        format={(v) => `${v} km`}
      />
    </div>
  );
}

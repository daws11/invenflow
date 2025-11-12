import { useLocationStore } from '../../store/locationStore';
import { InlineEditCell } from '../InlineEditCell';
import { MapPinIcon } from '@heroicons/react/24/outline';

interface LocationFieldProps {
  value: string | null;
  onSave: (value: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function LocationField({ value, onSave, disabled = false, className = '' }: LocationFieldProps) {
  const { locations } = useLocationStore();
  
  const locationOptions = locations.map(loc => ({ 
    value: loc.id, 
    label: `${loc.name} (${loc.code}) - ${loc.area}` 
  }));

  const selectedLocation = value ? locations.find(loc => loc.id === value) : null;

  return (
    <InlineEditCell
      value={value || ''}
      onSave={onSave}
      type="select"
      options={locationOptions}
      placeholder="Select location"
      disabled={disabled}
      className={className}
      displayValue={selectedLocation ? (
        <div className="flex items-center text-sm text-gray-600">
          <MapPinIcon className="w-4 h-4 mr-1" />
          {selectedLocation.name} ({selectedLocation.code}) - {selectedLocation.area}
        </div>
      ) : undefined}
    />
  );
}

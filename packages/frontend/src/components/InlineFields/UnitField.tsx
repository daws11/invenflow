import { DEFAULT_UNITS } from '@invenflow/shared';
import { InlineEditCell } from '../InlineEditCell';

interface UnitFieldProps {
  value: string | null;
  onSave: (value: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function UnitField({ value, onSave, disabled = false, className = '' }: UnitFieldProps) {
  const unitOptions = DEFAULT_UNITS.filter(unit => unit !== 'Custom').map(unit => ({ 
    value: unit, 
    label: unit 
  }));

  return (
    <InlineEditCell
      value={value || ''}
      onSave={onSave}
      type="select"
      options={unitOptions}
      allowCustom={true}
      customPlaceholder="Enter custom unit"
      placeholder="Select unit"
      disabled={disabled}
      className={className}
      maxLength={20}
    />
  );
}

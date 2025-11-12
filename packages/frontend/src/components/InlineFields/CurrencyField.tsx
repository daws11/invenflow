import { InlineEditCell } from '../InlineEditCell';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { formatCurrency } from '../../utils/formatters';

interface CurrencyFieldProps {
  value: number | null;
  onSave: (value: number) => Promise<void>;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function CurrencyField({ 
  value, 
  onSave, 
  disabled = false, 
  className = '',
  placeholder = '0.00'
}: CurrencyFieldProps) {
  return (
    <InlineEditCell
      value={value || ''}
      onSave={onSave}
      type="number"
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      displayValue={value ? (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
          <CurrencyDollarIcon className="h-4 w-4 mr-1" />
          {formatCurrency(value)}
        </span>
      ) : undefined}
      validation={(inputValue) => {
        if (inputValue && (isNaN(Number(inputValue)) || Number(inputValue) <= 0)) {
          return 'Price must be a positive number';
        }
        return null;
      }}
    />
  );
}

import { DEFAULT_CATEGORIES } from '@invenflow/shared';
import { InlineEditCell } from '../InlineEditCell';
import { TagIcon } from '@heroicons/react/24/outline';

interface CategoryFieldProps {
  value: string | null;
  onSave: (value: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function CategoryField({ value, onSave, disabled = false, className = '' }: CategoryFieldProps) {
  const categoryOptions = DEFAULT_CATEGORIES.map(cat => ({ value: cat, label: cat }));

  const getCategoryColor = (category: string | null) => {
    const colors: { [key: string]: string } = {
      'electronics': 'bg-purple-100 text-purple-800 border-purple-200',
      'furniture': 'bg-amber-100 text-amber-800 border-amber-200',
      'office supplies': 'bg-blue-100 text-blue-800 border-blue-200',
      'raw materials': 'bg-stone-100 text-stone-800 border-stone-200',
      'tools & equipment': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'packaging': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'safety equipment': 'bg-red-100 text-red-800 border-red-200',
      'cleaning supplies': 'bg-green-100 text-green-800 border-green-200',
      'software': 'bg-violet-100 text-violet-800 border-violet-200',
      'services': 'bg-pink-100 text-pink-800 border-pink-200',
      'other': 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[category?.toLowerCase() || ''] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <InlineEditCell
      value={value || ''}
      onSave={async (value: string | number) => await onSave(String(value))}
      type="select"
      options={categoryOptions}
      placeholder="Select category"
      disabled={disabled}
      className={className}
      displayValue={value ? (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getCategoryColor(value)}`}>
          <TagIcon className="h-4 w-4 mr-1" />
          {value}
        </span>
      ) : undefined}
    />
  );
}

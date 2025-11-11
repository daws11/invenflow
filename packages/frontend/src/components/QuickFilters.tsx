import React, { useMemo } from 'react';
import { 
  ClockIcon, 
  ExclamationTriangleIcon, 
  CubeIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { Product } from '@invenflow/shared';
import { useViewPreferencesStore } from '../store/viewPreferencesStore';

interface QuickFiltersProps {
  products: Product[];
  className?: string;
}

interface QuickFilter {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  action: () => void;
  isActive: boolean;
  count?: number;
  color: string;
}

const QuickFilters = React.memo(function QuickFilters({ products, className }: QuickFiltersProps) {
  const {
    priorityFilter, setPriorityFilter,
    categoryFilter, setCategoryFilter,
    createdPreset, setCreatedPreset,
    stockLevelMin, stockLevelMax, setStockLevelRange,
    resetFilters,
    hasActiveFilters,
  } = useViewPreferencesStore();

  // Calculate counts for different filter types (used in both filters and suggestions)
  const counts = useMemo(() => {
    const urgentCount = products.filter(p => p.priority?.toLowerCase() === 'urgent').length;
    const highPriorityCount = products.filter(p => p.priority?.toLowerCase() === 'high').length;
    const recentCount = products.filter(p => {
      const createdAt = new Date(p.createdAt as unknown as string);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return createdAt >= sevenDaysAgo;
    }).length;
    const lowStockCount = products.filter(p => 
      p.stockLevel !== null && p.stockLevel !== undefined && p.stockLevel <= 10
    ).length;
    const electronicsCount = products.filter(p => 
      p.category?.toLowerCase().includes('electronic') || 
      p.category?.toLowerCase().includes('tech')
    ).length;
    return { urgentCount, highPriorityCount, recentCount, lowStockCount, electronicsCount };
  }, [products]);

  const quickFilters: QuickFilter[] = useMemo(() => {
    const { urgentCount, highPriorityCount, recentCount, lowStockCount, electronicsCount } = counts;

    return [
      {
        id: 'urgent',
        label: 'Urgent Items',
        icon: ExclamationTriangleIcon,
        description: 'Show only urgent priority items',
        action: () => {
          if (priorityFilter.includes('Urgent')) {
            setPriorityFilter(priorityFilter.filter(p => p !== 'Urgent'));
          } else {
            setPriorityFilter([...priorityFilter, 'Urgent']);
          }
        },
        isActive: priorityFilter.includes('Urgent'),
        count: urgentCount,
        color: 'red',
      },
      {
        id: 'high-priority',
        label: 'High Priority',
        icon: ExclamationTriangleIcon,
        description: 'Show high priority items',
        action: () => {
          if (priorityFilter.includes('High')) {
            setPriorityFilter(priorityFilter.filter(p => p !== 'High'));
          } else {
            setPriorityFilter([...priorityFilter, 'High']);
          }
        },
        isActive: priorityFilter.includes('High'),
        count: highPriorityCount,
        color: 'orange',
      },
      {
        id: 'recent',
        label: 'Recent (7d)',
        icon: ClockIcon,
        description: 'Show items created in last 7 days',
        action: () => {
          setCreatedPreset(createdPreset === '7d' ? null : '7d');
        },
        isActive: createdPreset === '7d',
        count: recentCount,
        color: 'blue',
      },
      {
        id: 'low-stock',
        label: 'Low Stock',
        icon: CubeIcon,
        description: 'Show items with stock ≤ 10',
        action: () => {
          if (stockLevelMin === null && stockLevelMax === 10) {
            setStockLevelRange(null, null);
          } else {
            setStockLevelRange(null, 10);
          }
        },
        isActive: stockLevelMin === null && stockLevelMax === 10,
        count: lowStockCount,
        color: 'amber',
      },
      {
        id: 'electronics',
        label: 'Electronics',
        icon: SparklesIcon,
        description: 'Show electronics/tech items',
        action: () => {
          const electronicsCategories = ['Electronics', 'Technology', 'Tech'];
          const hasElectronics = electronicsCategories.some(cat => categoryFilter.includes(cat));
          
          if (hasElectronics) {
            setCategoryFilter(categoryFilter.filter(cat => !electronicsCategories.includes(cat)));
          } else {
            const availableElectronics = electronicsCategories.filter(cat => 
              products.some(p => p.category === cat)
            );
            setCategoryFilter([...categoryFilter, ...availableElectronics]);
          }
        },
        isActive: ['Electronics', 'Technology', 'Tech'].some(cat => categoryFilter.includes(cat)),
        count: electronicsCount,
        color: 'purple',
      },
    ];
  }, [counts, priorityFilter, setPriorityFilter, createdPreset, setCreatedPreset, stockLevelMin, stockLevelMax, setStockLevelRange, categoryFilter, setCategoryFilter]);

  const getColorClasses = (color: string, isActive: boolean) => {
    const colors = {
      red: isActive 
        ? 'bg-red-100 text-red-800 border-red-200 ring-1 ring-red-500' 
        : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
      orange: isActive 
        ? 'bg-orange-100 text-orange-800 border-orange-200 ring-1 ring-orange-500' 
        : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
      blue: isActive 
        ? 'bg-blue-100 text-blue-800 border-blue-200 ring-1 ring-blue-500' 
        : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
      amber: isActive 
        ? 'bg-amber-100 text-amber-800 border-amber-200 ring-1 ring-amber-500' 
        : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
      purple: isActive 
        ? 'bg-purple-100 text-purple-800 border-purple-200 ring-1 ring-purple-500' 
        : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  // Filter out quick filters with zero count (unless they're active)
  const visibleFilters = quickFilters.filter(filter => filter.count! > 0 || filter.isActive);

  if (visibleFilters.length === 0) {
    return null;
  }

  return (
    <div className={`${className || ''}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700 flex items-center">
          <SparklesIcon className="w-4 h-4 mr-1" />
          Quick Filters
        </h4>
        {hasActiveFilters() && (
          <button
            onClick={resetFilters}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {visibleFilters.map((filter) => {
          const Icon = filter.icon;
          return (
            <button
              key={filter.id}
              onClick={filter.action}
              className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium border transition-all ${getColorClasses(filter.color, filter.isActive)}`}
              title={filter.description}
            >
              <Icon className="w-4 h-4 mr-2" />
              <span>{filter.label}</span>
              {filter.count !== undefined && filter.count > 0 && (
                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                  filter.isActive 
                    ? 'bg-white/20' 
                    : 'bg-black/10'
                }`}>
                  {filter.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Smart Suggestions */}
      {!hasActiveFilters() && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-2 font-medium">💡 Smart Suggestions:</p>
          <div className="space-y-1 text-xs text-gray-500">
            {counts.urgentCount > 0 && (
              <p>• You have {counts.urgentCount} urgent item{counts.urgentCount !== 1 ? 's' : ''} that need attention</p>
            )}
            {counts.lowStockCount > 0 && (
              <p>• {counts.lowStockCount} item{counts.lowStockCount !== 1 ? 's' : ''} running low on stock</p>
            )}
            {counts.recentCount > 0 && (
              <p>• {counts.recentCount} item{counts.recentCount !== 1 ? 's' : ''} added in the last week</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default QuickFilters;

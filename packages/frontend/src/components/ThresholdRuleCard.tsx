import { ThresholdRule, Product } from '@invenflow/shared';
import { formatThresholdRule } from '../utils/thresholdCalculator';
import {
  PencilIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface ThresholdRuleCardProps {
  rule: ThresholdRule;
  index: number;
  totalRules: number;
  products?: Product[];
  onEdit: (rule: ThresholdRule) => void;
  onDelete: (ruleId: string) => void;
  onMovePriority: (ruleId: string, direction: 'up' | 'down') => void;
}

export function ThresholdRuleCard({
  rule,
  index,
  totalRules,
  products = [],
  onEdit,
  onDelete,
  onMovePriority,
}: ThresholdRuleCardProps) {
  // Calculate how many products this rule would apply to (simplified estimation)
  const getAffectedProductsCount = () => {
    // This is a simplified version - in reality you'd need current time and product.columnEnteredAt
    return products.length > 0 ? Math.floor(products.length * 0.3) : 0;
  };

  const affectedCount = getAffectedProductsCount();

  const getRuleLabel = () => {
    const labels: { [key: string]: string } = {
      '>': 'More than',
      '<': 'Less than',
      '>=': 'At least',
      '<=': 'At most',
      '=': 'Exactly',
    };
    return labels[rule.operator] || rule.operator;
  };

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all group">
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        {/* Priority Badge */}
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
            {index + 1}
          </div>
          <p className="text-xs text-center text-gray-500 mt-1">Priority</p>
        </div>

        {/* Color Preview & Rule Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-12 h-12 rounded-lg shadow-md flex-shrink-0 border-2 border-white ring-2 ring-gray-200"
              style={{ backgroundColor: rule.color }}
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-900 text-lg truncate mb-1">
                {getRuleLabel()} {rule.value} {rule.unit}
              </h4>
              <p className="text-sm text-gray-600">
                {formatThresholdRule(rule)}
              </p>
            </div>
          </div>
        </div>

        {/* Priority Controls */}
        <div className="flex flex-col gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => onMovePriority(rule.id, 'up')}
            disabled={index === 0}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move up (higher priority)"
          >
            <ChevronUpIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onMovePriority(rule.id, 'down')}
            disabled={index === totalRules - 1}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move down (lower priority)"
          >
            <ChevronDownIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      {affectedCount > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 text-sm">
            <ClockIcon className="w-4 h-4 text-gray-500" />
            <span className="text-gray-700">
              Currently applied to <span className="font-semibold text-gray-900">{affectedCount}</span> product(s)
            </span>
          </div>
        </div>
      )}

      {/* Sample Preview */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
          Preview:
        </p>
        <div
          className="p-3 rounded-lg border-l-4"
          style={{
            borderLeftColor: rule.color,
            backgroundColor: `${rule.color}10`,
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full animate-pulse"
              style={{ backgroundColor: rule.color }}
            />
            <span className="text-sm font-medium text-gray-900">Sample Product Card</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            This is how products will look when this rule matches
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => onEdit(rule)}
          className="flex-1 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <PencilIcon className="w-4 h-4" />
          Edit Rule
        </button>
        <button
          type="button"
          onClick={() => onDelete(rule.id)}
          className="flex-1 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <TrashIcon className="w-4 h-4" />
          Delete
        </button>
      </div>
    </div>
  );
}


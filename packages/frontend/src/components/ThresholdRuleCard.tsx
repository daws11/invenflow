import { ThresholdRule, Product } from '@invenflow/shared';
import { formatThresholdRule } from '../utils/thresholdCalculator';
import {
  PencilIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
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
  products: _products = [],
  onEdit,
  onDelete,
  onMovePriority,
}: ThresholdRuleCardProps) {
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
    <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        {/* Priority Badge */}
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow">
            {index + 1}
          </div>
        </div>

        {/* Color & Rule Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-10 h-10 rounded-lg shadow-sm border-2 border-white ring-1 ring-gray-200"
              style={{ backgroundColor: rule.color }}
            />
            <div className="flex-1">
              <h4 className="font-bold text-gray-900 text-base">
                {getRuleLabel()} {rule.value} {rule.unit}
              </h4>
              <p className="text-xs text-gray-600">
                {formatThresholdRule(rule)}
              </p>
            </div>
          </div>
        </div>

        {/* Priority Controls */}
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => onMovePriority(rule.id, 'up')}
            disabled={index === 0}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move up"
          >
            <ChevronUpIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onMovePriority(rule.id, 'down')}
            disabled={index === totalRules - 1}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move down"
          >
            <ChevronDownIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview */}
      <div
        className="p-3 rounded-lg border-l-4 mb-4"
        style={{
          borderLeftColor: rule.color,
          backgroundColor: `${rule.color}15`,
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full animate-pulse"
            style={{ backgroundColor: rule.color }}
          />
          <span className="text-sm font-medium text-gray-900">Preview</span>
        </div>
        <p className="text-xs text-gray-600 mt-1">
          Products matching this rule will be highlighted
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-gray-200">
        <button
          type="button"
          onClick={() => onEdit(rule)}
          className="flex-1 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center gap-1.5"
        >
          <PencilIcon className="w-4 h-4" />
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(rule.id)}
          className="flex-1 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center justify-center gap-1.5"
        >
          <TrashIcon className="w-4 h-4" />
          Delete
        </button>
      </div>
    </div>
  );
}

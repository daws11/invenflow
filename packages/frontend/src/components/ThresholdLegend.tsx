import { ThresholdRule } from '@invenflow/shared';
import { formatThresholdRule } from '../utils/thresholdCalculator';
import { ClockIcon } from '@heroicons/react/24/outline';

interface ThresholdLegendProps {
  thresholdRules: ThresholdRule[] | null | undefined;
}

export function ThresholdLegend({ thresholdRules }: ThresholdLegendProps) {
  const rules = thresholdRules || [];

  if (rules.length === 0) {
    return null;
  }

  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <ClockIcon className="w-5 h-5 text-gray-600" />
        <h3 className="text-sm font-semibold text-gray-900">
          Threshold Alert Legend
        </h3>
      </div>
      
      <div className="space-y-2">
        {sortedRules.map((rule, index) => (
          <div
            key={rule.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {/* Priority Badge */}
            <div className="flex-shrink-0">
              <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                {index + 1}
              </span>
            </div>

            {/* Color Indicator */}
            <div
              className="w-8 h-8 rounded border-2 flex-shrink-0 shadow-sm"
              style={{ 
                backgroundColor: rule.color,
                borderColor: rule.color,
              }}
              title={rule.color}
            />

            {/* Rule Description */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {formatThresholdRule(rule)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Priority {rule.priority} • Applied when condition matches
              </p>
            </div>

            {/* Visual Sample */}
            <div 
              className="hidden md:block flex-shrink-0 px-3 py-1.5 rounded text-xs font-medium border-l-4"
              style={{
                borderLeftColor: rule.color,
                backgroundColor: `${rule.color}10`,
                color: rule.color,
              }}
            >
              Sample
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500 flex items-start gap-1">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            Product cards will automatically change colors based on how long they stay in their current column.
            Rules are evaluated in priority order from top to bottom.
          </span>
        </p>
      </div>
    </div>
  );
}


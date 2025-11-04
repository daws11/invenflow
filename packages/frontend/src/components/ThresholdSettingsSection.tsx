import { useState, useEffect } from 'react';
import { ThresholdRule } from '@invenflow/shared';
import { nanoid } from 'nanoid';
import { ThresholdRuleBuilder } from './ThresholdRuleBuilder';
import { ThresholdTemplates } from './ThresholdTemplates';
import { ThresholdOnboarding } from './ThresholdOnboarding';
import { ThresholdRuleCard } from './ThresholdRuleCard';
import {
  PlusIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface ThresholdSettingsSectionProps {
  thresholdRules: ThresholdRule[] | null | undefined;
  onChange: (rules: ThresholdRule[]) => void;
  kanbanType?: 'order' | 'receive';
  products?: any[];
}

export function ThresholdSettingsSection({ 
  thresholdRules, 
  onChange, 
  kanbanType: _kanbanType = 'order',
  products = []
}: ThresholdSettingsSectionProps) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingRule, setEditingRule] = useState<ThresholdRule | null>(null);

  const rules = thresholdRules || [];

  // Check if user needs onboarding
  useEffect(() => {
    const hasCompleted = localStorage.getItem('threshold_onboarding_complete');
    if (!hasCompleted && rules.length === 0) {
      setShowOnboarding(true);
    }
  }, []);

  const handleSaveRule = (ruleData: Omit<ThresholdRule, 'id' | 'priority'>) => {
    if (editingRule) {
      // Update existing rule
      const updatedRules = rules.map(r => 
        r.id === editingRule.id 
          ? { ...r, ...ruleData }
          : r
      );
      onChange(updatedRules);
    } else {
      // Add new rule
      const rule: ThresholdRule = {
        id: nanoid(),
        ...ruleData,
        priority: rules.length + 1,
      };
      onChange([...rules, rule]);
    }
    
    setShowBuilder(false);
    setEditingRule(null);
  };

  const handleSelectTemplate = (templateRules: Omit<ThresholdRule, 'id' | 'priority'>[]) => {
    const newRules: ThresholdRule[] = templateRules.map((rule, index) => ({
      id: nanoid(),
      ...rule,
      priority: index + 1,
    }));
    onChange(newRules);
    setShowTemplates(false);
  };

  const handleEditRule = (rule: ThresholdRule) => {
    setEditingRule(rule);
    setShowBuilder(true);
  };

  const handleDeleteRule = (ruleId: string) => {
    const updatedRules = rules
      .filter(r => r.id !== ruleId)
      .map((r, index) => ({ ...r, priority: index + 1 })); // Re-index priorities
    onChange(updatedRules);
  };

  const handleMovePriority = (ruleId: string, direction: 'up' | 'down') => {
    const currentIndex = rules.findIndex(r => r.id === ruleId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= rules.length) return;

    const newRules = [...rules];
    const [movedRule] = newRules.splice(currentIndex, 1);
    newRules.splice(newIndex, 0, movedRule);

    // Re-index priorities
    const reindexedRules = newRules.map((r, index) => ({ ...r, priority: index + 1 }));
    onChange(reindexedRules);
  };

  return (
    <div className="space-y-6">
      {/* Onboarding Modal */}
      {showOnboarding && (
        <ThresholdOnboarding
          onStart={() => {
            setShowOnboarding(false);
            setShowTemplates(true);
          }}
          onSkip={() => {
            setShowOnboarding(false);
            setShowBuilder(true);
          }}
        />
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <ThresholdTemplates
          onSelectTemplate={handleSelectTemplate}
          onSkip={() => {
            setShowTemplates(false);
            setShowBuilder(true);
          }}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {/* Rule Builder Modal */}
      {showBuilder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <ThresholdRuleBuilder
                onSave={handleSaveRule}
                onCancel={() => {
                  setShowBuilder(false);
                  setEditingRule(null);
                }}
                initialRule={editingRule}
                existingRulesCount={rules.length}
              />
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-blue-600" />
            Threshold Alert Rules
          </h4>
          <p className="text-sm text-gray-600 mt-1">
            Automatically highlight products based on time in column. Rules are checked in priority order.
          </p>
        </div>
        {!showBuilder && (
          <div className="flex gap-2">
            {rules.length === 0 && (
              <button
                type="button"
                onClick={() => setShowTemplates(true)}
                className="px-4 py-2 text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-2"
              >
                <SparklesIcon className="w-4 h-4" />
                Use Template
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowBuilder(true)}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center transition-colors shadow-lg shadow-blue-600/30"
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              Add Rule
            </button>
          </div>
        )}
      </div>

      {/* Rules List */}
      {rules.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules
            .sort((a, b) => a.priority - b.priority)
            .map((rule, index) => (
              <ThresholdRuleCard
                key={rule.id}
                rule={rule}
                index={index}
                totalRules={rules.length}
                products={products}
                onEdit={handleEditRule}
                onDelete={handleDeleteRule}
                onMovePriority={handleMovePriority}
              />
            ))}
        </div>
      ) : (
        <div className="text-center py-12 px-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
            <SparklesIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">
            No Threshold Rules Yet
          </h4>
          <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
            Create your first rule to automatically track and highlight products based on how long they stay in each column.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={() => setShowTemplates(true)}
              className="px-4 py-2 text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-2"
            >
              <SparklesIcon className="w-4 h-4" />
              Use Template
            </button>
            <button
              type="button"
              onClick={() => setShowBuilder(true)}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center transition-colors shadow-lg shadow-blue-600/30"
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              Create Custom Rule
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


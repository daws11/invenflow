import { XMarkIcon, PlayIcon } from '@heroicons/react/24/outline';

interface ThresholdOnboardingProps {
  onStart: () => void;
  onSkip: () => void;
}

export function ThresholdOnboarding({ onStart, onSkip }: ThresholdOnboardingProps) {
  const handleSkip = () => {
    localStorage.setItem('threshold_onboarding_complete', 'true');
    onSkip();
  };

  const handleStart = () => {
    localStorage.setItem('threshold_onboarding_complete', 'true');
    onStart();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-screen-sm sm:max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-5 sm:px-8 sm:pt-8 sm:pb-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-t-xl">
          <button
            type="button"
            onClick={handleSkip}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-3xl">🎯</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Threshold Alerts</h2>
              <p className="text-blue-600 font-medium">Track time automatically</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 sm:px-8 sm:py-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              What are Threshold Alerts?
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Threshold alerts help you track how long products stay in each column.
              Set color-coded alerts to identify fast-moving items or products that need attention.
            </p>
          </div>

          {/* Examples */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Example Use Cases:
            </h4>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-lg">🟢</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Green for Fast Processing</p>
                  <p className="text-sm text-gray-600">Products processed in less than 1 hour</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-lg">🟡</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Yellow for Delays</p>
                  <p className="text-sm text-gray-600">Products taking more than 1 day</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-lg">🔴</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Red for Urgent Attention</p>
                  <p className="text-sm text-gray-600">Products stuck for more than 3 days</p>
                </div>
              </div>
            </div>
          </div>

          {/* How it Works */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span>💡</span>
              <span>How It Works</span>
            </h4>
            <ol className="space-y-2 text-sm text-gray-600">
              <li className="flex gap-2">
                <span className="font-semibold text-gray-900">1.</span>
                <span>Create rules with conditions (e.g., "more than 2 hours")</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-gray-900">2.</span>
                <span>Choose a color for each rule</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-gray-900">3.</span>
                <span>Product cards automatically change colors based on time</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-gray-900">4.</span>
                <span>Focus on what needs attention most</span>
              </li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 sm:px-8 sm:py-6 bg-gray-50 rounded-b-xl border-t border-gray-200 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 sm:justify-between">
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Skip - I know how this works
          </button>
          <button
            type="button"
            onClick={handleStart}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-lg shadow-blue-600/30 w-full sm:w-auto"
          >
            <PlayIcon className="w-5 h-5" />
            Start Setup
          </button>
        </div>
      </div>
    </div>
  );
}


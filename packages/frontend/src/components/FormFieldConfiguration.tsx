import { FormFieldSettings, DEFAULT_FORM_FIELD_SETTINGS } from '@invenflow/shared';

interface FormFieldConfigurationProps {
  formFieldSettings: FormFieldSettings | null;
  onChange: (settings: FormFieldSettings) => void;
  disabled?: boolean;
}

interface FieldConfig {
  key: keyof FormFieldSettings;
  label: string;
  description: string;
  required?: boolean;
}

const FIELD_CONFIGS: FieldConfig[] = [
  {
    key: 'requesterName',
    label: 'Requester Name',
    description: 'Name of the person making the request',
  },
  {
    key: 'department',
    label: 'Department',
    description: 'Department of the requester',
  },
  {
    key: 'location',
    label: 'Location',
    description: 'Physical location or area',
  },
  {
    key: 'itemUrl',
    label: 'Item URL',
    description: 'Link to product information or purchase page',
  },
  {
    key: 'quantity',
    label: 'Quantity',
    description: 'Number of items requested',
  },
  {
    key: 'priority',
    label: 'Priority',
    description: 'Request priority level',
  },
  {
    key: 'details',
    label: 'Details',
    description: 'Additional product description or specifications',
  },
  {
    key: 'notes',
    label: 'Notes',
    description: 'Additional comments or special instructions',
  },
];

export function FormFieldConfiguration({ 
  formFieldSettings, 
  onChange, 
  disabled = false 
}: FormFieldConfigurationProps) {
  const currentSettings = formFieldSettings || DEFAULT_FORM_FIELD_SETTINGS;

  const handleFieldToggle = (fieldKey: keyof FormFieldSettings, enabled: boolean) => {
    const newSettings = {
      ...currentSettings,
      [fieldKey]: enabled,
    };
    onChange(newSettings);
  };

  const handleSelectAll = () => {
    const allEnabled = (Object.keys(DEFAULT_FORM_FIELD_SETTINGS) as Array<keyof FormFieldSettings>).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as FormFieldSettings);
    onChange(allEnabled);
  };

  const handleDeselectAll = () => {
    const allDisabled = (Object.keys(DEFAULT_FORM_FIELD_SETTINGS) as Array<keyof FormFieldSettings>).reduce((acc, key) => {
      acc[key] = false;
      return acc;
    }, {} as FormFieldSettings);
    onChange(allDisabled);
  };

  const enabledCount = Object.values(currentSettings).filter(Boolean).length;
  const totalCount = FIELD_CONFIGS.length;

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-2">Form Field Configuration</h4>
        <p className="text-sm text-gray-600 mb-4">
          Choose which fields are available in the public form. Product name is always required and cannot be disabled.
        </p>
        
        {/* Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {enabledCount} of {totalCount} optional fields enabled
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                disabled={disabled || enabledCount === totalCount}
                className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enable All
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                disabled={disabled || enabledCount === 0}
                className="text-xs px-2 py-1 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Disable All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Always Required Field */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={true}
                disabled={true}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 opacity-50 cursor-not-allowed"
              />
              <div>
                <label className="text-sm font-medium text-gray-900">
                  Product Name
                </label>
                <p className="text-xs text-gray-600">
                  Name of the product or item being requested (always required)
                </p>
              </div>
            </div>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Required
          </span>
        </div>
      </div>

      {/* Configurable Fields */}
      <div className="space-y-3">
        {FIELD_CONFIGS.map((field) => {
          const isEnabled = currentSettings[field.key];
          
          return (
            <div
              key={field.key}
              className={`border rounded-lg p-4 transition-colors ${
                isEnabled 
                  ? 'border-blue-200 bg-blue-50' 
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id={`field-${String(field.key)}`}
                      checked={isEnabled}
                      onChange={(e) => handleFieldToggle(field.key, e.target.checked)}
                      disabled={disabled}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <div>
                      <label 
                        htmlFor={`field-${String(field.key)}`}
                        className={`text-sm font-medium cursor-pointer ${
                          disabled ? 'cursor-not-allowed' : ''
                        } ${
                          isEnabled ? 'text-blue-900' : 'text-gray-900'
                        }`}
                      >
                        {field.label}
                      </label>
                      <p className={`text-xs ${
                        isEnabled ? 'text-blue-700' : 'text-gray-600'
                      }`}>
                        {field.description}
                      </p>
                    </div>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  isEnabled 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {isEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Help Text */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> Disabled fields will not appear in the public form. 
              Users will not be able to provide information for disabled fields when submitting requests.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

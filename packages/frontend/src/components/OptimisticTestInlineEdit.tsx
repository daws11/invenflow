import React, { useState } from 'react';
import { BasicInlineEdit } from './BasicInlineEdit';

export function OptimisticTestInlineEdit() {
  const [textValue, setTextValue] = useState('Click to edit - instant update!');
  const [selectValue, setSelectValue] = useState('option1');
  const [numberValue, setNumberValue] = useState(100);

  // Simulate slow API call
  const simulateSlowSave = async (value: string | number, delay = 1000) => {
    console.log('Starting save for:', value);
    await new Promise(resolve => setTimeout(resolve, delay));
    console.log('Save completed for:', value);
    return value;
  };

  const handleSaveText = async (value: string | number) => {
    await simulateSlowSave(value, 1500); // 1.5 second delay
    setTextValue(value.toString());
  };

  const handleSaveSelect = async (value: string | number) => {
    await simulateSlowSave(value, 800); // 0.8 second delay
    setSelectValue(value.toString());
  };

  const handleSaveNumber = async (value: string | number) => {
    await simulateSlowSave(value, 1200); // 1.2 second delay
    setNumberValue(Number(value));
  };

  // Simulate error sometimes
  const handleSaveWithError = async (value: string | number) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (Math.random() > 0.7) { // 30% chance of error
      throw new Error('Random API error for testing');
    }
    setTextValue(value.toString());
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Optimistic Update Test</h1>
        <p className="text-gray-600">
          Changes appear instantly! No loading spinners. API calls happen in background.
        </p>
      </div>
      
      <div className="space-y-6">
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">✨ Instant Text Update</h3>
          <p className="text-sm text-blue-700 mb-3">
            Edit this text - you'll see changes immediately even though the API takes 1.5 seconds
          </p>
          <BasicInlineEdit
            value={textValue}
            onSave={handleSaveText}
            placeholder="Enter some text"
            className="bg-white"
          />
        </div>

        <div className="p-4 bg-green-50 rounded-lg">
          <h3 className="font-medium text-green-900 mb-2">⚡ Instant Dropdown Update</h3>
          <p className="text-sm text-green-700 mb-3">
            Select an option - changes appear instantly even with 0.8s API delay
          </p>
          <BasicInlineEdit
            value={selectValue}
            onSave={handleSaveSelect}
            type="select"
            options={[
              { value: 'option1', label: 'Fast Response' },
              { value: 'option2', label: 'Instant UI' },
              { value: 'option3', label: 'No Loading' },
              { value: 'option4', label: 'Optimistic Update' },
            ]}
            className="bg-white"
          />
        </div>

        <div className="p-4 bg-purple-50 rounded-lg">
          <h3 className="font-medium text-purple-900 mb-2">🔢 Instant Number Update</h3>
          <p className="text-sm text-purple-700 mb-3">
            Change this number - UI updates instantly despite 1.2s API call
          </p>
          <BasicInlineEdit
            value={numberValue}
            onSave={handleSaveNumber}
            type="number"
            placeholder="Enter a number"
            className="bg-white"
          />
        </div>

        <div className="p-4 bg-red-50 rounded-lg">
          <h3 className="font-medium text-red-900 mb-2">❌ Error Handling Test</h3>
          <p className="text-sm text-red-700 mb-3">
            30% chance of error - optimistic update reverts on failure
          </p>
          <BasicInlineEdit
            value="Try editing me - might fail!"
            onSave={handleSaveWithError}
            placeholder="Enter text (might error)"
            className="bg-white"
          />
        </div>
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">Current State:</h3>
        <pre className="text-sm text-gray-600">
{JSON.stringify({
  text: textValue,
  select: selectValue,
  number: numberValue
}, null, 2)}
        </pre>
      </div>

      <div className="text-sm text-gray-500 space-y-1">
        <p>• Changes appear instantly (optimistic updates)</p>
        <p>• No loading spinners or delays</p>
        <p>• API calls happen in background</p>
        <p>• Errors revert the optimistic update</p>
        <p>• Check browser console to see API timing</p>
      </div>
    </div>
  );
}

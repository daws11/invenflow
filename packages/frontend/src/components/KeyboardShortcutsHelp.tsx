import React, { useState } from 'react';
import { QuestionMarkCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface KeyboardShortcut {
  key: string;
  description: string;
}

interface KeyboardShortcutsHelpProps {
  shortcuts: KeyboardShortcut[];
  className?: string;
}

export default function KeyboardShortcutsHelp({ shortcuts, className }: KeyboardShortcutsHelpProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatKey = (key: string) => {
    return key.split(' + ').map((part, index, array) => (
      <React.Fragment key={part}>
        <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">
          {part}
        </kbd>
        {index < array.length - 1 && <span className="mx-1 text-gray-500">+</span>}
      </React.Fragment>
    ));
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors ${className || ''}`}
        title="Keyboard shortcuts"
      >
        <QuestionMarkCircleIcon className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-96">
              <div className="space-y-3">
                {shortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{shortcut.description}</span>
                    <div className="flex items-center ml-4">
                      {formatKey(shortcut.key)}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  💡 Tip: Most shortcuts work when not typing in input fields. Use Cmd on Mac or Ctrl on Windows/Linux.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

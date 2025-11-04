import { useEffect, useState, useRef } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useToastStore } from '../../store/toastStore';

export interface ToastProps {
  toast: {
    id: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    duration?: number;
    persistent?: boolean;
    title?: string;
    action?: {
      label: string;
      onClick: () => void;
    };
    progress?: number;
  };
}

export default function ToastComponent({ toast }: ToastProps) {
  const { removeToast, pauseToast, resumeToast, pausedToasts } = useToastStore();
  const [isVisible, setIsVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(toast.duration || 3000);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isPaused = pausedToasts.has(toast.id);

  useEffect(() => {
    // Entry animation
    const showTimer = setTimeout(() => setIsVisible(true), 10);

    // Auto-dismiss timer
    if (!toast.persistent && toast.duration && toast.duration > 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = setInterval(() => {
        if (!isPaused && !isHovered) {
          setTimeLeft((prev) => {
            if (prev <= 100) {
              handleClose();
              return 0;
            }
            return prev - 100;
          });
        }
      }, 100);
    }

    return () => {
      clearTimeout(showTimer);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [toast.persistent, toast.duration, isPaused, isHovered]);

  useEffect(() => {
    // Progress indicator updates
    if (toast.progress !== undefined) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }

      if (toast.progress < 100 && !isPaused) {
        progressIntervalRef.current = setInterval(() => {
          // Progress would be updated by parent component
        }, 100);
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [toast.progress, isPaused]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => removeToast(toast.id), 300);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    pauseToast(toast.id);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    resumeToast(toast.id);
  };

  const getToastStyles = () => {
    const baseStyles = 'flex items-start p-4 rounded-lg shadow-lg min-w-[320px] max-w-md border';
    const typeStyles = {
      success: 'bg-green-50 border-green-200 text-green-900',
      error: 'bg-red-50 border-red-200 text-red-900',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
      info: 'bg-blue-50 border-blue-200 text-blue-900',
    };

    return `${baseStyles} ${typeStyles[toast.type]}`;
  };

  const getIcon = () => {
    const iconClass = 'w-5 h-5 flex-shrink-0';
    const typeIcons = {
      success: <CheckCircle className={`${iconClass} text-green-600`} />,
      error: <AlertCircle className={`${iconClass} text-red-600`} />,
      warning: <AlertTriangle className={`${iconClass} text-yellow-600`} />,
      info: <Info className={`${iconClass} text-blue-600`} />,
    };

    return typeIcons[toast.type];
  };

  const progressPercentage = toast.duration
    ? ((toast.duration - timeLeft) / toast.duration) * 100
    : (toast.progress || 0);

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'}
      `}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={getToastStyles()}>
        {/* Icon */}
        <div className="flex-shrink-0 mr-3">
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {toast.title && (
            <h4 className="text-sm font-semibold mb-1">{toast.title}</h4>
          )}

          <p className="text-sm leading-5 mb-2">{toast.message}</p>

          {/* Action Button */}
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="text-sm font-medium underline hover:no-underline focus:outline-none focus:underline"
            >
              {toast.action.label}
            </button>
          )}

          {/* Progress Bar */}
          {(toast.progress !== undefined || (!toast.persistent && toast.duration)) && (
            <div className="mt-2 bg-gray-200 rounded-full h-1 overflow-hidden">
              <div
                className={`
                  h-full transition-all duration-100 ease-linear
                  ${toast.type === 'success' ? 'bg-green-600' : ''}
                  ${toast.type === 'error' ? 'bg-red-600' : ''}
                  ${toast.type === 'warning' ? 'bg-yellow-600' : ''}
                  ${toast.type === 'info' ? 'bg-blue-600' : ''}
                `}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="ml-3 flex-shrink-0 p-1 rounded-md hover:bg-black hover:bg-opacity-5 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Remaining Time Indicator */}
      {!toast.persistent && toast.duration && toast.duration > 0 && timeLeft > 0 && (
        <div className="absolute bottom-0 left-0 h-1 bg-current opacity-20 transition-all duration-100"
          style={{ width: `${(timeLeft / toast.duration) * 100}%` }}
        />
      )}
    </div>
  );
}

// Enhanced ToastContainer with queue management
export const ToastContainer: React.FC = () => {
  const { toasts } = useToastStore();

  return (
    <div className="fixed top-0 right-0 z-50 p-4 space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastComponent toast={toast} />
        </div>
      ))}
    </div>
  );
};
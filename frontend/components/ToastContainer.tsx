import React, {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import { createPortal } from "react-dom";
import { v4 as uuidv4 } from "uuid";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  duration?: number; // milliseconds, 0 for infinite
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastContainerRef {
  addToast: (toast: Omit<Toast, "id">) => void;
}

interface ToastMessageProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const ToastMessage: React.FC<ToastMessageProps> = ({ toast, onDismiss }) => {
  const { message, type, duration, action } = toast;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (duration && duration > 0) {
      timeoutRef.current = setTimeout(() => {
        onDismiss(toast.id);
      }, duration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [duration, toast.id, onDismiss]);

  const bgColor = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500",
    warning: "bg-yellow-500",
  }[type];

  const icon = {
    success: (
      <svg
        className="h-5 w-5 text-green-100"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    ),
    error: (
      <svg
        className="h-5 w-5 text-red-100"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
    ),
    info: (
      <svg
        className="h-5 w-5 text-blue-100"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 2a1 1 0 100 2h2a1 1 0 100-2h-2z"
          clipRule="evenodd"
        />
      </svg>
    ),
    warning: (
      <svg
        className="h-5 w-5 text-yellow-100"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.487 0L14.883 12.001c.764 1.36.272 3.001-1.216 3.001H6.333c-1.488 0-1.98-1.64-1.216-3.001L8.257 3.099zM10 8a1 1 0 011 1v3a1 1 0 11-2 0V9a1 1 0 011-1zm0 8a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
    ),
  }[type];

  return (
    <div
      className={`relative flex items-center justify-between w-full max-w-sm p-4 text-white rounded-lg shadow-lg mb-4 ${bgColor} transition-all duration-300 ease-out transform translate-x-0 opacity-100 pointer-events-auto`} // <-- Add this!
      role="alert"
    >
      <div className="flex items-center">
        <div className="flex-shrink-0 mr-3">{icon}</div>
        <p className="text-sm font-medium">{message}</p>
      </div>
      <div className="flex items-center ml-4">
        {action && (
          <button
            onClick={() => {
              action.onClick();
              onDismiss(toast.id);
            }}
            className="text-sm font-semibold text-white hover:underline mr-2 focus:outline-none"
          >
            {action.label}
          </button>
        )}
        <button
          onClick={() => onDismiss(toast.id)}
          className="ml-auto -mx-1.5 -my-1.5 bg-transparent text-white hover:text-gray-100 rounded-lg p-1.5 hover:bg-opacity-20 inline-flex items-center justify-center h-8 w-8 focus:outline-none"
          aria-label="Close"
        >
          <span className="sr-only">Close</span>
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

const ToastContainer = forwardRef<ToastContainerRef>((props, ref) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const portalRoot = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let element = document.getElementById("toast-root");
    if (!element) {
      element = document.createElement("div");
      element.setAttribute("id", "toast-root");
      document.body.appendChild(element);
    }
    portalRoot.current = element;

    return () => {
      if (element && document.body.contains(element)) {
        document.body.removeChild(element);
      }
    };
  }, []);

  useImperativeHandle(ref, () => ({
    addToast: (newToast) => {
      setToasts((prevToasts) => [
        ...prevToasts,
        { id: uuidv4(), duration: 3000, ...newToast },
      ]);
    },
  }));

  const handleDismiss = (id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  if (!portalRoot.current) {
    return null;
  }

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end pointer-events-none">
      {toasts.map((toast) => (
        <ToastMessage key={toast.id} toast={toast} onDismiss={handleDismiss} />
      ))}
    </div>,
    portalRoot.current,
  );
});

ToastContainer.displayName = "ToastContainer";

export default ToastContainer;

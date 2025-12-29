import { useContext, createContext, MutableRefObject } from "react";
import { ToastContainerRef, Toast } from "@/components/ToastContainer";

export const ToastContext =
  createContext<MutableRefObject<ToastContainerRef | null> | null>(null);

export const useToast = () => {
  const toastRef = useContext(ToastContext);

  const addToast = (toast: Omit<Toast, "id">) => {
    if (toastRef && toastRef.current) {
      toastRef.current.addToast(toast);
    } else {
      console.warn(
        "ToastProvider not found. Ensure ToastContainer is rendered at the root of your application.",
      );
    }
  };

  return { addToast };
};

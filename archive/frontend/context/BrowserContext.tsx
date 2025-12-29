import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type BrowserContextType = {
  isMobile: boolean;
};

const BrowserContext = createContext<BrowserContextType | undefined>(undefined);

export const BrowserProvider = ({ children }: { children: ReactNode }) => {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // Check for testing override in URL params (only in development)
    const isDevelopment =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.includes("dev") ||
      process.env.NODE_ENV === "development";

    if (isDevelopment) {
      const urlParams = new URLSearchParams(window.location.search);
      const forceMobile = urlParams.get("mobile");

      if (forceMobile === "true") {
        setIsMobile(true);
        return;
      } else if (forceMobile === "false") {
        setIsMobile(false);
        return;
      }
    }

    // Default behavior: detect based on user agent
    setIsMobile(/Mobi|Android/i.test(navigator.userAgent));
  }, []);

  return (
    <BrowserContext.Provider value={{ isMobile }}>
      {children}
    </BrowserContext.Provider>
  );
};

export const useBrowserContext = (): BrowserContextType => {
  const context = useContext(BrowserContext);
  if (!context) {
    throw new Error("useBrowserContext must be used within a BrowserProvider");
  }
  return context;
};

export const useIsMobile = (): boolean => {
  const context = useContext(BrowserContext);
  if (!context) {
    throw new Error("getIsMobile must be used within a BrowserProvider");
  }
  return context.isMobile;
};

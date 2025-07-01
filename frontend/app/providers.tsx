"use client";

import { useRef } from "react";
import { ThemeProvider } from "next-themes";
import { UserProvider } from "@/context/UserContext";
import { GameProvider } from "@/context/GameContext";
import { BrowserProvider } from "@/context/BrowserContext";
import ToastContainer, { ToastContainerRef } from "@/components/ToastContainer";
import { ToastContext } from "@/context/ToastContext";

export function Providers({ children }: { children: React.ReactNode }) {
  const toastRef = useRef<ToastContainerRef>(null);

  return (
    <ThemeProvider defaultTheme="system" enableSystem={true}>
      <BrowserProvider>
        <UserProvider>
          <GameProvider>
            <ToastContext.Provider value={toastRef}>
              {children}
              <ToastContainer ref={toastRef} />
            </ToastContext.Provider>
          </GameProvider>
        </UserProvider>
      </BrowserProvider>
    </ThemeProvider>
  );
}

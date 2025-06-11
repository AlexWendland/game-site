"use client";

import { HeroUIProvider } from "@heroui/system";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { UserProvider } from "@/context/UserContext";
import { GameProvider } from "@/context/GameContext";
import { BrowserProvider } from "@/context/BrowserContext";
import ToastContainer, { ToastContainerRef } from "@/components/ToastContainer";
import { ToastContext } from "@/context/ToastContext";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const toastRef = useRef<ToastContainerRef>(null);

  return (
    <HeroUIProvider navigate={router.push}>
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
    </HeroUIProvider>
  );
}

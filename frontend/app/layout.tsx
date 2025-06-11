import "@/styles/globals.css";
import { Metadata } from "next";
import clsx from "clsx";

import { siteConfig } from "@/config/site";
import { fontSans } from "@/config/fonts";
import { Providers } from "./providers";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={fontSans.className}>
      <head />
      <body
        className={clsx(
          "m-0 p-0 min-h-screen bg-gray-50 dark:bg-gray-900 font-sans antialiased",
          fontSans.variable,
        )}
      >
        <Providers>
          <NavBar />
          <div className="relative flex flex-col pt-12">
            <main className="container mx-auto max-w-9xl pt-8 flex-grow">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}

"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !theme) {
      const systemTheme =
        resolvedTheme ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light");

      setTheme(systemTheme);
    }
  }, [mounted, theme, resolvedTheme, setTheme]);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  if (!mounted) {
    return null;
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        // Sun icon for light mode
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 56 56"
          stroke="currentColor"
        >
          <path d="M 28.0001 10 C 29.5001 10 30.7423 8.7578 30.7423 7.2344 C 30.7423 5.7344 29.5001 4.4922 28.0001 4.4922 C 26.4767 4.4922 25.2579 5.7344 25.2579 7.2344 C 25.2579 8.7578 26.4767 10 28.0001 10 Z M 40.7501 15.2734 C 41.8048 16.3281 43.5392 16.3281 44.6173 15.2734 C 45.6954 14.1953 45.6954 12.4609 44.6173 11.3828 C 43.5392 10.3047 41.8048 10.3047 40.7501 11.3828 C 39.6720 12.4609 39.6720 14.1953 40.7501 15.2734 Z M 11.3595 15.2968 C 12.4142 16.3516 14.1485 16.3516 15.2267 15.2968 C 16.3282 14.1953 16.3282 12.4844 15.2267 11.4063 C 14.1485 10.3281 12.4142 10.3281 11.3595 11.4063 C 10.2814 12.4844 10.2814 14.1953 11.3595 15.2968 Z M 28.0001 40 C 34.5158 40 39.9298 34.5859 39.9298 28.0469 C 39.9298 21.5312 34.5158 16.1172 28.0001 16.1172 C 21.4610 16.1172 16.0470 21.5312 16.0470 28.0469 C 16.0470 34.5859 21.4610 40 28.0001 40 Z M 28.0001 36.4375 C 23.4063 36.4375 19.6095 32.6406 19.6095 28.0469 C 19.6095 23.5 23.4063 19.6797 28.0001 19.6797 C 32.5704 19.6797 36.3673 23.4766 36.3673 28.0469 C 36.3673 32.6406 32.5704 36.4375 28.0001 36.4375 Z M 7.2345 30.7890 C 8.7345 30.7890 9.9767 29.5469 9.9767 28.0234 C 9.9767 26.5234 8.7345 25.2812 7.2345 25.2812 C 5.7110 25.2812 4.4923 26.5234 4.4923 28.0234 C 4.4923 29.5469 5.7110 30.7890 7.2345 30.7890 Z M 48.7659 30.9531 C 50.2659 30.9531 51.5077 29.7109 51.5077 28.1875 C 51.5077 26.6875 50.2659 25.4453 48.7659 25.4453 C 47.2423 25.4453 46.0236 26.6875 46.0236 28.1875 C 46.0236 29.7109 47.2423 30.9531 48.7659 30.9531 Z M 11.3829 44.6406 C 12.4376 45.7187 14.1720 45.7187 15.2501 44.6406 C 16.3282 43.5625 16.3282 41.8281 15.2501 40.7500 C 14.1720 39.6953 12.4376 39.6953 11.3829 40.7500 C 10.2814 41.8281 10.2814 43.5625 11.3829 44.6406 Z M 40.6095 44.7578 C 41.6876 45.8359 43.3985 45.8359 44.5001 44.7578 C 45.5548 43.7031 45.5548 41.9687 44.5001 40.8906 C 43.3985 39.8125 41.6876 39.8125 40.6095 40.8906 C 39.5314 41.9687 39.5314 43.7031 40.6095 44.7578 Z M 28.0001 51.5078 C 29.5001 51.5078 30.7423 50.2890 30.7423 48.7656 C 30.7423 47.2656 29.5001 46.0234 28.0001 46.0234 C 26.4767 46.0234 25.2579 47.2656 25.2579 48.7656 C 25.2579 50.2890 26.4767 51.5078 28.0001 51.5078 Z" />{" "}
        </svg>
      ) : (
        // Moon icon for dark mode
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}
    </button>
  );
}

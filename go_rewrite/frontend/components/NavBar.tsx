"use client";

import { ThemeToggle } from "./ThemeToggle";
import { ChevronDown, Edit, Logo } from "./common/Icons";

import { makeNewTicTacToeGameAPI } from "@/lib/apiCalls";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useGameContext } from "@/context/GameContext";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export function NavBar() {
  // Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toggleDropdown = () => setIsDropdownOpen((prev) => !prev);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Detect scroll direction
  const [isNavBarVisible, setIsNavBarVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollingDown =
        currentScrollY > lastScrollY.current && currentScrollY > 50;
      const scrollingUp = currentScrollY < lastScrollY.current;

      if (scrollingDown) setIsNavBarVisible(false);
      if (scrollingUp) setIsNavBarVisible(true);

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Game state
  const { getUsername, logout, getToken } = useAuth();
  const { gameCode, gameState } = useGameContext();
  const router = useRouter();
  const username = getUsername();

  // Start new game functions
  const startNewTicTacToe = async () => {
    const token = getToken();
    if (!token) {
      throw new Error("Not authenticated");
    }
    const gameID: string = await makeNewTicTacToeGameAPI(token);
    router.push(`/tictactoe?gameID=${gameID}`);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transform transition-transform duration-300 ${
        isNavBarVisible ? "translate-y-0" : "-translate-y-full"
      } bg-gray-100 dark:bg-gray-800 px-4 py-2`}
    >
      <div className="flex items-center justify-between w-max-[800px] mx-auto">
        <div>
          <Link href="/" className="flex items-center">
            <div className="text-orange-600">
              <Logo />
            </div>
            <div className="hidden sm:block font-bold text-2xl text-orange-600 pl-2">
              Alex's Games
            </div>
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden md:block relative" ref={dropdownRef}>
            <button
              onClick={toggleDropdown}
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600  rounded-full flex items-center transition-colors duration-200"
            >
              Start a new game{" "}
              <ChevronDown fill="currentColor" size={16} className="pl-1" />
            </button>
            <div
              className={`absolute left-1/2 transform -translate-x-1/2 mt-2 w-64 bg-gray-200 dark:bg-gray-700 shadow-lg rounded transition-all duration-200 ease-out origin-top ${
                isDropdownOpen
                  ? "scale-100 opacity-100"
                  : "scale-95 opacity-0 pointer-events-none"
              }`}
            >
              <button
                className="px-4 py-2 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-between rounded-md w-full content-center h-20"
                onClick={startNewTicTacToe}
              >
                <img className="w-16" src="/tictactoe.png" />
                Tic tac toe
              </button>
            </div>
          </div>
          <div className="text-orange-600 text-xl font-extrabold px-4 hidden lg:block">
            {gameCode}
          </div>
          <div className="hidden lg:block">{gameState}</div>
        </div>

        {/* Right Button */}
        <div className="flex items-center space-x-4">
          <button
            onClick={logout}
            className="flex items-center space-x-2"
          >
            <div className="truncate text-xl">{username}</div>
            <Edit width={14} />
          </button>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}

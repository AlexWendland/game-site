"use client";

import { ThemeToggle } from "./ThemeToggle";

import {
  makeNewTicTacToeGameAPI,
  makeNewUltimateGameAPI,
} from "@/lib/apiCalls";
import { useRouter } from "next/navigation";
import { useUserContext } from "@/context/UserContext";
import { useGameContext } from "@/context/GameContext";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type SVGProps = React.SVGProps<SVGSVGElement> & {
  fill?: string;
  size?: number;
  height?: number;
  width?: number;
};

export const ChevronDown: React.FC<SVGProps> = ({
  fill = "currentColor",
  size,
  height,
  width,
  ...props
}) => {
  return (
    <svg
      fill="none"
      height={size || height || 24}
      width={size || width || 24}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="m19.92 8.95-6.52 6.52c-.77.77-2.03.77-2.8 0L4.08 8.95"
        stroke={fill}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeMiterlimit={10}
        strokeWidth={1.5}
      />
    </svg>
  );
};

export const Edit: React.FC<SVGProps> = ({
  fill = "currentColor",
  size,
  height,
  width,
  ...props
}) => {
  return (
    <svg
      fill="none"
      height={size || height || 24}
      width={size || width || 24}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M4 14a1 1 0 0 1 .3-.7l11-11a1 1 0 0 1 1.4 0l3 3a1 1 0 0 1 0 1.4l-11 11a1 1 0 0 1-.7.3H5a1 1 0 0 1-1-1v-3z"
        stroke={fill}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeMiterlimit={10}
        strokeWidth={1.5}
      />
    </svg>
  );
};
export const Logo: React.FC<SVGProps> = ({
  fill = "currentColor",
  size,
  height,
  width,
  ...props
}) => {
  return (
    <svg
      version="1.1"
      height={size || height || 24}
      width={size || width || 24}
      viewBox="0 0 184.89041 179.67349"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs id="defs1" />
      <g id="g1" transform="translate(-214.02408,-20.592995)">
        <path
          stroke={fill}
          fill={fill}
          d="m 215.9145,198.26649 c -3.94604,-3.94603 -1.67334,-16.11455 6.43323,-34.44494 2.19842,-4.97101 2.20868,-5.15479 0.42318,-7.57484 -2.5409,-3.44388 -1.43273,-6.52318 3.38045,-9.39342 3.53074,-2.10548 4.56974,-3.7035 8.93005,-13.73475 7.8383,-18.03265 23.48208,-48.800581 28.14343,-55.352051 5.34304,-7.50957 8.05365,-8.98362 13.34004,-7.25442 4.78573,1.56543 4.94365,2.03197 10.4099,30.754421 5.82761,30.62116 15.64072,73.12313 19.02269,82.38997 1.75186,4.80021 2.64919,8.82899 2.28747,10.27019 -0.78984,3.14699 -4.98547,6.33984 -8.33099,6.33984 -5.98886,0 -8.87619,-6.33154 -14.20101,-31.14091 l -3.22306,-15.0169 -9.55769,0.67824 c -17.29497,1.22731 -31.27983,3.22096 -32.11904,4.57883 -0.44191,0.71503 -2.88857,7.39771 -5.43701,14.8504 -7.18324,21.00669 -7.41114,21.57607 -9.55872,23.88123 -2.55423,2.74164 -7.28985,2.82218 -9.94292,0.16911 z m 44.5,-56.49274 c 4.4,-0.31872 10.5307,-0.82583 13.62378,-1.12691 l 5.62379,-0.54743 -3.77132,-18.16646 c -2.07422,-9.99155 -4.30059,-20.76002 -4.94748,-23.929931 -0.64689,-3.16991 -1.60579,-5.49794 -2.1309,-5.17341 -1.67074,1.03257 -9.47129,17.458421 -15.16666,31.936881 -7.71215,19.60541 -7.53578,18.82119 -4.08076,18.1447 1.56725,-0.30687 6.44955,-0.81871 10.84955,-1.13744 z m 76.94039,12.61269 c -17.68684,-4.56373 -30.44039,-22.40242 -30.44039,-42.57768 0,-37.518291 18.87367,-73.825355 45.23737,-87.022588 11.27594,-5.64455 20.97667,-5.595674 35.45756,0.178648 8.46,3.373464 11.30507,6.166654 11.30507,11.098931 0,4.380084 -2.31535,7.202736 -5.90823,7.202736 -1.23791,0 -6.32604,-2.025 -11.30695,-4.5 -4.98091,-2.475 -10.45764,-4.495604 -12.17051,-4.490231 -4.03266,0.01265 -12.8976,4.162017 -18.23372,8.534564 -18.0773,14.812989 -31.38108,52.378519 -25.98527,73.37389 3.63402,14.14014 12.74221,23.24845 23.24813,23.24845 9.21817,0 19.19335,-9.11801 26.7196,-24.42356 2.49984,-5.08371 4.83959,-10.48061 5.19946,-11.99311 0.63798,-2.68138 0.54555,-2.74951 -3.7041,-2.73048 -7.00233,0.0314 -24.94573,2.72769 -30.13276,4.528 -5.96436,2.07011 -9.11313,1.34544 -10.68943,-2.46009 -0.97544,-2.354914 -0.95095,-3.480761 0.12341,-5.672781 3.35684,-6.849 12.57098,-9.1749 39.94697,-10.08374 18.37319,-0.60996 18.6349,-0.58941 20.86258,1.63827 1.78672,1.78672 2.13804,2.98269 1.689,5.74981 -0.31184,1.92161 -1.26974,4.00845 -2.12868,4.63742 -0.88465,0.647797 -2.00701,3.910801 -2.58884,7.526441 -2.07272,12.88045 -10.01375,27.21441 -20.5233,37.04558 -9.2703,8.6719 -14.96153,11.34355 -24.91736,11.69698 -4.4,0.1562 -9.37683,-0.0713 -11.05961,-0.50546 z"
          id="path1"
        />
      </g>
    </svg>
  );
};

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
  const { username, clearUsername } = useUserContext();
  const { gameCode, gameState } = useGameContext();
  const router = useRouter();

  // Start new game functions
  const startNewTicTacToe = async () => {
    const gameID: string = await makeNewTicTacToeGameAPI();
    router.push(`/tictactoe/${gameID}`);
  };

  const startNewUltimateGame = async () => {
    const gameID: string = await makeNewUltimateGameAPI();
    router.push(`/ultimate/${gameID}`);
  };

  const startNewTopologicalGame = async () => {
    router.push(`/topological`);
  };

  const startNewWizardGame = async () => {
    router.push(`/wizard`);
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
            <div className="text-brand">
              <Logo />
            </div>
            <div className="hidden sm:block font-bold text-2xl text-brand pl-2">
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
              <button
                className="px-4 py-2 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-between rounded-md w-full content-center h-20"
                onClick={startNewUltimateGame}
              >
                <img className="w-16" src="/ultimate.png" />
                Ultimate Tic Tac Toe
              </button>
              <button
                className="px-4 py-2 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-between rounded-md w-full content-center h-20"
                onClick={startNewTopologicalGame}
              >
                <img className="w-16" src="/topological.svg" />
                Topological Connect 4
              </button>
              <button
                className="px-4 py-2 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-between rounded-md w-full content-center h-20"
                onClick={startNewWizardGame}
              >
                <img className="w-16" src="/wizard.svg" />
                Wizard
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
            onClick={clearUsername}
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

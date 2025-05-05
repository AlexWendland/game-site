"use client";

import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Link,
  Button,
  DropdownItem,
  DropdownTrigger,
  Dropdown,
  DropdownMenu,
} from "@heroui/react";

import { makeNewTicTacToeGameAPI } from "@/lib/apiCalls";
import { useRouter } from "next/navigation";
import { useUserContext } from "@/context/UserContext";
import { useGameContext } from "@/context/GameContext";

type ChevronDownProps = React.SVGProps<SVGSVGElement> & {
  fill?: string;
  size?: number;
  height?: number;
  width?: number;
};

export const ChevronDown: React.FC<ChevronDownProps> = ({
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

export function NavBar() {
  const icons = {
    chevron: <ChevronDown fill="currentColor" size={16} />,
  };
  const { username, setUsername, clearUsername } = useUserContext();
  const {
    gameCode,
    setGameCode,
    gameLink,
    setGameLink,
    gameState,
    setGameState,
    clearGame,
  } = useGameContext();
  console.log("NavBar userName", username);
  const router = useRouter();

  const startNewTicTacToe = async () => {
    const gameID: string = await makeNewTicTacToeGameAPI();
    router.push(`/tictactoe/${gameID}`);
  };

  return (
    <Navbar>
      <NavbarBrand>
        <Link color="primary" href="/">
          Alex's Games
        </Link>
      </NavbarBrand>
      <NavbarContent className="hidden sm:flex gap-4" justify="center">
        <Dropdown>
          <NavbarItem>
            <DropdownTrigger>
              <Button
                disableRipple
                className="p-0 bg-transparent data-[hover=true]:bg-transparent"
                endContent={icons.chevron}
                radius="sm"
                variant="light"
              >
                Start a new game
              </Button>
            </DropdownTrigger>
          </NavbarItem>
          <DropdownMenu
            aria-label="Start new game"
            itemClasses={{
              base: "gap-4",
            }}
          >
            <DropdownItem
              key="Tic Tac Toe"
              description="The classic 0 and X game."
              onPress={startNewTicTacToe}
            >
              Tic Tac Toe
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
        <NavbarItem isActive>{gameCode}</NavbarItem>
        <NavbarItem>{gameState}</NavbarItem>
      </NavbarContent>
      <NavbarContent justify="end">
        <NavbarItem>{username}</NavbarItem>
        <NavbarItem>
          <Button color="primary" onPress={clearUsername}>
            Switch User Name
          </Button>
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  );
}

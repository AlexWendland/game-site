import { ReactNode } from "react";

export function getPlayerIcon(player: number): ReactNode {
  switch (player) {
    case 0:
      return (
        <img src="/alpha.svg" className="w-full h-full object-contain p-1" />
      );
    case 1:
      return (
        <img src="/beta.svg" className="w-full h-full object-contain p-1" />
      );
    case 2:
      return (
        <img src="/gamma.svg" className="w-full h-full object-contain p-1" />
      );
    case 3:
      return (
        <img src="/delta.svg" className="w-full h-full object-contain p-1" />
      );
    case 4:
      return (
        <img src="/epsilon.svg" className="w-full h-full object-contain p-1" />
      );
    case 5:
      return (
        <img src="/zeta.svg" className="w-full h-full object-contain p-1" />
      );
    case 6:
      return (
        <img src="/eta.svg" className="w-full h-full object-contain p-1" />
      );
    case 7:
      return (
        <img src="/theta.svg" className="w-full h-full object-contain p-1" />
      );
    default:
      return (
        <img src="/question.svg" className="w-full h-full object-contain p-1" />
      );
  }
}

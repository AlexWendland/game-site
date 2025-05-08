import React from "react";

interface FlipCardProps {
  flipped: boolean;
  front: React.ReactNode;
  back: React.ReactNode;
}

export default function FlipCard({ flipped, front, back }: FlipCardProps) {
  return (
    <div className="w-48 h-48 relative" style={{ perspective: "1000px" }}>
      <div
        className="w-full h-full absolute transition-transform duration-700"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        <div
          className="w-full h-full absolute"
          style={{ backfaceVisibility: "hidden" }}
        >
          {front}
        </div>
        <div
          className="w-full h-full absolute"
          style={{
            transform: "rotateY(180deg)",
            backfaceVisibility: "hidden",
          }}
        >
          {back}
        </div>
      </div>
    </div>
  );
}

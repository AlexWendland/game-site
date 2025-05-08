"use client";

import { UltimateBoard } from "@/components/ultimate/UltimateBoard";
import { UltimatePlayerBoard } from "@/components/ultimate/UltimatePlayerBoard";
import { Button, Pagination } from "@heroui/react";

export function UltimateGame() {
  return (
    <div>
      <div className="grid grid-cols-4 gap-4 width-full">
        <div className="col-span-1"></div>
        <div className="col-span-2 grid grid-cols-1">
          <UltimateBoard />
          <br />
          <Pagination
            variant="bordered"
            className="flex justify-center"
            page={1}
            total={1}
            color="secondary"
            onChange={(page) => {}}
            showControls
          />
        </div>
        <div className="col-span-1">
          <UltimatePlayerBoard />
        </div>
      </div>
    </div>
  );
}

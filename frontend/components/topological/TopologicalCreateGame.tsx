"use client";

import { makeNewTopologicalGameAPI } from "@/lib/apiCalls";
import { Geometry, GravitySetting } from "@/types/apiTypes";
import { RadioGroup, Radio } from "@/components/common/RadioGroup";
import { Slider } from "@/components/common/Slider";
import { useRouter } from "next/navigation";

export default function TopologicalCreateGame() {
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const players = Number(formData.get("players"));
    const boardSize = Number(formData.get("boardSize"));
    const geometry = formData.get("geometry") as Geometry;
    const gravity = formData.get("gravity") as GravitySetting;

    const gameID: string = await makeNewTopologicalGameAPI(
      players,
      boardSize,
      gravity,
      geometry,
    );
    router.push(`/topological?gameID=${gameID}`);
  }

  return (
    <form
      className="grid grid-cols-1 justify-items-center gap-4 w-full h-full p-2"
      onSubmit={handleSubmit}
    >
      <div className="grid grid-cols-1 gap-16">
        <h1 className="text-xl">Create new Topological Connect Four game!</h1>
        <Slider
          defaultValue={4}
          label="Number of players"
          maxValue={8}
          minValue={2}
          name="players"
        />
        <Slider
          defaultValue={8}
          label="Board size"
          maxValue={8}
          minValue={4}
          name="boardSize"
        />
        <RadioGroup label="Geometry" defaultValue="torus" name="geometry">
          <Radio value="no_geometry" description="Classic connect four">
            No geometry
          </Radio>
          <Radio value="torus" description="Best first time choice!">
            Torus: Play on a doughnut!
          </Radio>
          <Radio value="band">Band: The board loops left to right</Radio>
          <Radio value="mobius">
            Möbius strip: Play on a band with a twist!
          </Radio>
          <Radio value="klein">Klein Bottle: Can you think in 4D?</Radio>
          <Radio
            value="sphere"
            description="Extra rule, a winning line needs to use 4 distinct squares."
          >
            Sphere: This one will leave you spinning
          </Radio>
          <Radio
            value="rp2"
            description="Extra rule, a winning line needs to use 4 distinct squares."
          >
            Real projective plane in 2 dimensions: ... or whatever
          </Radio>
        </RadioGroup>
        <RadioGroup label="Gravity" defaultValue="edge" name="gravity">
          <Radio value="bottom" description="Classic connect four">
            Gravity goes down
          </Radio>
          <Radio
            value="edge"
            description="Make the most of geometry with this choice!"
          >
            Around the outside
          </Radio>
          <Radio value="none">Play anywhere!</Radio>
        </RadioGroup>
      </div>
      <button
        type="submit"
        className="bg-orange-300 dark:bg-orange-500 p-4 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-600 hover:scale-105 transition-all"
      >
        Create new game
      </button>
    </form>
  );
}

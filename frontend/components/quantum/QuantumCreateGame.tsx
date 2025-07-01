"use client";

import { makeNewQuantumGameAPI } from "@/lib/apiCalls";
import { RadioGroup, Radio } from "@/components/common/RadioGroup";
import { Slider } from "@/components/common/Slider";
import { useRouter } from "next/navigation";
import { QuantumHintLevel } from "@/types/apiTypes";

export default function QuantumCreateGame() {
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const players = Number(formData.get("players"));
    const maxHintLevel = (Number(formData.get("maxHintLevel")) ||
      0) as QuantumHintLevel;

    const gameID: string = await makeNewQuantumGameAPI(players, maxHintLevel);
    router.push(`/quantum/${gameID}`);
  }

  return (
    <form
      className="grid grid-cols-1 justify-items-center gap-4 w-full h-full p-2"
      onSubmit={handleSubmit}
    >
      <div className="grid grid-cols-1 gap-16">
        <h1 className="text-xl">Create new Quantum Go Fish game!</h1>
        <Slider
          defaultValue={5}
          label="Number of players"
          maxValue={8}
          minValue={3}
          name="players"
        />
        <RadioGroup label="Max Hint Level" defaultValue="2" name="maxHintLevel">
          <Radio
            value="0"
            description="There are no hints, everyone needs to use their memory."
          >
            No hints
          </Radio>
          <Radio value="1" description="It will track publicly known facts.">
            Tracking
          </Radio>
          <Radio
            value="2"
            description="It tracks all deductions for you, so you can focus on strategy."
          >
            Full hints
          </Radio>
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

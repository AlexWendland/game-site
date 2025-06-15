import { useId, useState } from "react";

interface SliderProps {
  label: string;
  name: string;
  minValue: number;
  maxValue: number;
  defaultValue: number;
}

export function Slider({
  label,
  name,
  minValue,
  maxValue,
  defaultValue,
}: SliderProps) {
  const [value, setValue] = useState(defaultValue);
  const id = useId();
  const steps = Array.from(
    { length: maxValue - minValue + 1 },
    (_, i) => minValue + i,
  );

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <span className="font-bold">{value}</span>
      </div>
      <div className="relative">
        <input
          id={id}
          type="range"
          name={name}
          min={minValue}
          max={maxValue}
          step={1}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer slider-thumb"
        />
        <div className="flex justify-between w-full mt-2 text-xs">
          {steps.map((stepValue) => (
            <span key={stepValue} className="relative flex justify-center w-0">
              <span className="absolute">{stepValue}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

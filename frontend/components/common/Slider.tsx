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
          className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none 
                     [&::-webkit-slider-thumb]:w-5 
                     [&::-webkit-slider-thumb]:h-5 
                     [&::-webkit-slider-thumb]:rounded-full 
                     [&::-webkit-slider-thumb]:bg-blue-500 
                     [&::-webkit-slider-thumb]:hover:bg-blue-600 
                     [&::-webkit-slider-thumb]:active:bg-blue-700
                     [&::-webkit-slider-thumb]:transition-all
                     [&::-webkit-slider-thumb]:shadow-lg
                     [&::-moz-range-thumb]:w-5 
                     [&::-moz-range-thumb]:h-5 
                     [&::-moz-range-thumb]:rounded-full 
                     [&::-moz-range-thumb]:bg-blue-500 
                     [&::-moz-range-thumb]:border-0 
                     [&::-moz-range-thumb]:hover:bg-blue-600 
                     [&::-moz-range-thumb]:active:bg-blue-700
                     [&::-moz-range-thumb]:transition-colors
                     [&::-moz-range-thumb]:shadow-lg
                     [&::-moz-range-thumb]:cursor-pointer"
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

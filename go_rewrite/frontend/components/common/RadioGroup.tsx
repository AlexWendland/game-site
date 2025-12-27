"use client";

import React, { useState, createContext, useContext, useId } from "react";

interface RadioGroupContextProps {
  name: string;
  selectedValue: string;
  onChange: (value: string) => void;
}
const RadioGroupContext = createContext<RadioGroupContextProps | null>(null);

interface RadioGroupProps {
  label: string;
  name: string;
  defaultValue: string;
  children: React.ReactNode;
}

export function RadioGroup({
  label,
  name,
  defaultValue,
  children,
}: RadioGroupProps) {
  const [selectedValue, setSelectedValue] = useState(defaultValue);

  return (
    <RadioGroupContext.Provider
      value={{ name, selectedValue, onChange: setSelectedValue }}
    >
      <fieldset className="w-full">
        <legend className="mb-2">{label}</legend>
        <div className="space-y-3">{children}</div>
        {/* Hidden input to carry the value for FormData */}
        <input type="hidden" name={name} value={selectedValue} />
      </fieldset>
    </RadioGroupContext.Provider>
  );
}

interface RadioProps {
  value: string;
  description?: string;
  children: React.ReactNode;
}

export function Radio({ value, description, children }: RadioProps) {
  const context = useContext(RadioGroupContext);
  const id = useId();

  if (!context) {
    throw new Error(
      "Radio component must be used within a RadioGroup component",
    );
  }

  const { name, selectedValue, onChange } = context;
  const isChecked = selectedValue === value;

  return (
    <label
      htmlFor={id}
      className={`flex flex-col p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
        isChecked
          ? "bg-blue-100 border-blue-300 ring-2 ring-blue-300 dark:bg-blue-800 dark:border-blue-700 hover:scale-105"
          : "border-gray-200 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-800 hover:scale-105"
      }`}
    >
      <div className="flex items-center">
        <input
          type="radio"
          id={id}
          name={name}
          value={value}
          checked={isChecked}
          onChange={() => onChange(value)}
          className="w-4 h-4 border-gray-300 focus:ring-indigo-500"
        />
        <span className="ml-3 text-base font-medium text-gray-900 dark:text-gray-100">
          {children}
        </span>
      </div>
      {description && (
        <p className="mt-1 ml-7 text-sm text-gray-500 dark:text-gray-300">
          {description}
        </p>
      )}
    </label>
  );
}

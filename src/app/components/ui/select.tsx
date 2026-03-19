import * as React from "react";

import { cn } from "./utils";

type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = React.ComponentProps<"select"> & {
  label?: string;
  options?: SelectOption[];
};

function Select({ className, label, id, options, children, ...props }: SelectProps) {
  const select = (
    <select
      id={id}
      data-slot="select"
      className={cn(
        "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {options
        ? options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))
        : children}
    </select>
  );

  if (!label) {
    return select;
  }

  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium text-gray-700">{label}</span>
      {select}
    </label>
  );
}

export { Select };

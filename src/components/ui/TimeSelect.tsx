"use client";

type TimeSelectProps = {
  value: string;
  onChange: (value: string) => void;
  defaultPeriod?: "AM" | "PM";
  ariaLabel?: string;
  disabled?: boolean;
};

export default function TimeSelect({
  value,
  onChange,
  ariaLabel = "Time",
  disabled = false,
}: TimeSelectProps) {
  return (
    <input
      type="time"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
      disabled={disabled}
      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
    />
  );
}

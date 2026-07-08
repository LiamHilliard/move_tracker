"use client";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function thisMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Month + year dropdowns for a "YYYY-MM" value. Native `<input type="month">`
 * has patchy support (desktop Firefox/Safari), so plain selects it is.
 */
export function MonthPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1959 }, (_, i) => currentYear - i);
  const month = Number(value.slice(5, 7));
  const year = Number(value.slice(0, 4));
  const selectClass =
    "rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 [color-scheme:dark]";

  return (
    <div className="flex gap-2">
      <select
        aria-label="Month"
        value={month}
        onChange={(e) => onChange(`${year}-${e.target.value.padStart(2, "0")}`)}
        className={`${selectClass} flex-1`}
      >
        {MONTHS.map((name, i) => (
          <option key={name} value={i + 1}>
            {name}
          </option>
        ))}
      </select>
      <select
        aria-label="Year"
        value={year}
        onChange={(e) => onChange(`${e.target.value}-${String(month).padStart(2, "0")}`)}
        className={selectClass}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}

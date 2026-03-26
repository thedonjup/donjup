"use client";

export function PricePresets() {
  const presets = [
    { label: "3억 이하", min: "", max: "30000" },
    { label: "3~6억", min: "30000", max: "60000" },
    { label: "6~10억", min: "60000", max: "100000" },
    { label: "10억+", min: "100000", max: "" },
  ];

  return (
    <div className="mt-1 flex gap-1">
      {presets.map((preset) => (
        <button
          key={preset.label}
          type="button"
          onClick={(e) => {
            const form = (e.target as HTMLElement).closest("form");
            if (form) {
              const minInput = form.querySelector<HTMLInputElement>('input[name="priceMin"]');
              const maxInput = form.querySelector<HTMLInputElement>('input[name="priceMax"]');
              if (minInput) minInput.value = preset.min;
              if (maxInput) maxInput.value = preset.max;
            }
          }}
          className="rounded-full px-2 py-0.5 text-[10px] font-medium t-elevated t-text-tertiary hover:t-text-secondary transition"
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}

export function SizePresets() {
  const presets = [
    { label: "59m2(18평)", min: "59", max: "59.99" },
    { label: "84m2(25평)", min: "84", max: "84.99" },
    { label: "114m2(34평)", min: "114", max: "114.99" },
    { label: "135m2+(40평+)", min: "135", max: "" },
  ];

  return (
    <div className="mt-1 flex gap-1">
      {presets.map((preset) => (
        <button
          key={preset.label}
          type="button"
          onClick={(e) => {
            const form = (e.target as HTMLElement).closest("form");
            if (form) {
              const minInput = form.querySelector<HTMLInputElement>('input[name="sizeMin"]');
              const maxInput = form.querySelector<HTMLInputElement>('input[name="sizeMax"]');
              if (minInput) minInput.value = preset.min;
              if (maxInput) maxInput.value = preset.max;
            }
          }}
          className="rounded-full px-2 py-0.5 text-[10px] font-medium t-elevated t-text-tertiary hover:t-text-secondary transition"
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}

export function YearPresets() {
  const presets = [
    { label: "2020+", value: "2020" },
    { label: "2010+", value: "2010" },
    { label: "2000+", value: "2000" },
    { label: "1990+", value: "1990" },
  ];

  return (
    <div className="mt-1 flex gap-1">
      {presets.map((preset) => (
        <button
          key={preset.label}
          type="button"
          onClick={(e) => {
            const form = (e.target as HTMLElement).closest("form");
            if (form) {
              const input = form.querySelector<HTMLInputElement>('input[name="builtYearMin"]');
              if (input) input.value = preset.value;
            }
          }}
          className="rounded-full px-2 py-0.5 text-[10px] font-medium t-elevated t-text-tertiary hover:t-text-secondary transition"
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}

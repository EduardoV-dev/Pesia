import { type WeightUnit } from "@/lib/weight-units"

export type UnitPickerProps = {
  readonly legend: string
  readonly defaultUnit: WeightUnit
}

const UNIT_OPTIONS: ReadonlyArray<{ readonly value: WeightUnit; readonly label: string }> = [
  { value: "kg", label: "Kilogramos (kg)" },
  { value: "lb", label: "Libras (lb)" },
]

export function UnitPicker({ legend, defaultUnit }: UnitPickerProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {UNIT_OPTIONS.map((option) => (
          <label
            key={option.value}
            className="cursor-pointer rounded-full bg-surface-muted px-4 py-2 text-sm font-semibold has-checked:bg-accent has-checked:text-accent-ink"
          >
            <input
              type="radio"
              name="unit"
              value={option.value}
              defaultChecked={option.value === defaultUnit}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
      <p className="text-xs text-ink-muted">
        Podés cambiarla más adelante. Los datos se guardan siempre en kilogramos.
      </p>
    </fieldset>
  )
}

import type { IngredientAmount } from "@/types/order";

export const INGREDIENT_AMOUNT_OPTIONS: IngredientAmount[] = ["none", "normal", "extra"];

/**
 * Amount mapping:
 * | Label  | UI / raw | Dispensers | Sauces |
 * | none   | 0        | 0          | 0      |
 * | normal | 1        | 2          | 50     |
 * | extra  | 2        | 3          | 75     |
 *
 * UI/raw is what we send into `normalize_ingredient_command_level`.
 * Dispensers (station 1) and Sauces (station 2) are stored after DB normalize.
 */
export const NONE_COMMAND_LEVEL = 0;
export const NORMAL_COMMAND_LEVEL = 1;
export const EXTRA_COMMAND_LEVEL = 2;

/** Stored veggie levels after DB normalize (station 1 / dispensers). */
export const VEGGIE_NORMAL_STORED_LEVEL = 2;
export const VEGGIE_EXTRA_STORED_LEVEL = 3;

/** Stored sauce levels after DB normalize (station 2). */
export const SAUCE_NORMAL_STORED_LEVEL = 50;
export const SAUCE_EXTRA_STORED_LEVEL = 75;

const INGREDIENT_NAME_ALIASES: Record<string, string> = {
  Ketchup: "Garlic Aioli",
};

export type CommandCatalogRow = {
  ingredient_name: string;
  command_code: string;
};

export function isSauceCommandCode(commandCode: string): boolean {
  return commandCode.startsWith("2_");
}

function normalizeIngredientName(name: string): string {
  return INGREDIENT_NAME_ALIASES[name] ?? name;
}

/** Map UI amount → raw level for the create/update RPC (DB normalizes storage). */
export function ingredientAmountToCommandLevel(amount: IngredientAmount): number {
  switch (amount) {
    case "none":
      return NONE_COMMAND_LEVEL;
    case "normal":
      return NORMAL_COMMAND_LEVEL;
    case "extra":
      return EXTRA_COMMAND_LEVEL;
  }
}

/** Map stored `order_command.command_level` → UI amount. */
export function commandLevelToIngredientAmount(
  level: number | null | undefined,
  options?: { isSauce?: boolean },
): IngredientAmount {
  if (level == null || level <= NONE_COMMAND_LEVEL) {
    return "none";
  }

  if (options?.isSauce) {
    if (level >= SAUCE_EXTRA_STORED_LEVEL) {
      return "extra";
    }
    if (level >= SAUCE_NORMAL_STORED_LEVEL) {
      return "normal";
    }
    // 25 = less → treat as normal in the three-way UI
    return "normal";
  }

  if (level >= VEGGIE_EXTRA_STORED_LEVEL) {
    return "extra";
  }
  if (level >= VEGGIE_NORMAL_STORED_LEVEL) {
    return "normal";
  }
  // 1 = less → treat as normal in the three-way UI
  return "normal";
}

export function createDefaultIngredientAmounts(
  catalog: readonly string[],
  amount: IngredientAmount = "normal",
): Record<string, IngredientAmount> {
  return Object.fromEntries(catalog.map((ingredient) => [ingredient, amount]));
}

export function formatIngredientDisplay(name: string, amount: IngredientAmount): string {
  if (amount === "extra") {
    return `${name} (extra)`;
  }

  return name;
}

export function ingredientAmountsToDisplayList(
  amounts: Partial<Record<string, IngredientAmount>>,
  catalog?: readonly string[],
): string[] {
  const names = catalog ?? Object.keys(amounts);

  return names
    .filter((name) => (amounts[name] ?? "none") !== "none")
    .map((name) => formatIngredientDisplay(name, amounts[name] ?? "normal"));
}

export function parseIngredientDisplayList(
  names: readonly string[],
  catalog: readonly string[],
): Record<string, IngredientAmount> {
  const amounts = createDefaultIngredientAmounts(catalog, "none");

  for (const rawName of names) {
    const name = normalizeIngredientName(rawName);
    const extraMatch = name.match(/^(.+) \(extra\)$/);
    if (extraMatch) {
      const baseName = normalizeIngredientName(extraMatch[1]);
      if (baseName in amounts) {
        amounts[baseName] = "extra";
      }
      continue;
    }

    if (name in amounts) {
      amounts[name] = "normal";
    }
  }

  return amounts;
}

export function ingredientAmountsToLevelsJson(
  catalog: readonly CommandCatalogRow[],
  amounts: Partial<Record<string, IngredientAmount>>,
): Record<string, number> {
  const normalizedAmounts = Object.fromEntries(
    Object.entries(amounts).map(([name, amount]) => [normalizeIngredientName(name), amount]),
  );

  return Object.fromEntries(
    catalog.map(({ ingredient_name }) => {
      const amount = normalizedAmounts[ingredient_name] ?? "none";
      return [ingredient_name, ingredientAmountToCommandLevel(amount)];
    }),
  );
}

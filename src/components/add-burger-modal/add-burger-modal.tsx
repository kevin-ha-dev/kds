"use client";

import { useEffect, useRef, useState } from "react";
import {
  createDefaultIngredientAmounts,
  INGREDIENT_AMOUNT_OPTIONS,
  ingredientAmountsToDisplayList,
  parseIngredientDisplayList,
} from "@/lib/ingredients";
import type { BurgerFormValues, IngredientAmount } from "@/types/order";

type AddBurgerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mode?: "create" | "edit";
  initialValues?: BurgerFormValues;
  onCreate?: (values: BurgerFormValues) => void | Promise<void>;
  onUpdate?: (values: BurgerFormValues) => void | Promise<void>;
};

const burgerTypes = [
  "Classic Burger",
  "Cheese Burger",
  "Double Burger",
  "Veggie Burger",
  "Bacon Burger",
] as const;

const ingredients = [
  "Lettuce",
  "Tomatoes",
  "Onions",
  "Pickles",
  "Gochujang",
  "Garlic Aioli",
] as const;

const amountLabels: Record<IngredientAmount, string> = {
  none: "None",
  normal: "Normal",
  extra: "Extra",
};

/**
 * Gap after which the next digit starts a new tray scan (replace), instead of
 * continuing the current buffer. Long enough for normal typing; scanners are much faster.
 */
const SCAN_BURST_GAP_MS = 500;

type IngredientAmountControlProps = {
  ingredient: string;
  amount: IngredientAmount;
  selected: boolean;
  onChange: (ingredient: string, amount: IngredientAmount) => void;
};

function IngredientAmountControl({
  ingredient,
  amount,
  selected,
  onChange,
}: IngredientAmountControlProps) {
  const inputId = `amount-${ingredient}-${amount}`;

  return (
    <label
      htmlFor={inputId}
      className={`flex h-7 cursor-pointer items-center justify-center rounded-sm px-1 transition-colors ${
        selected
          ? "bg-zinc-100 text-zinc-800"
          : "text-zinc-400 hover:text-zinc-600"
      }`}
    >
      <input
        id={inputId}
        type="radio"
        name={`amount-${ingredient}`}
        checked={selected}
        onChange={() => onChange(ingredient, amount)}
        className="sr-only"
      />
      <span className="text-[10px] font-medium tracking-wide">{amountLabels[amount]}</span>
    </label>
  );
}

export function AddBurgerModal({
  isOpen,
  onClose,
  mode = "create",
  initialValues,
  onCreate,
  onUpdate,
}: AddBurgerModalProps) {
  const [burgerType, setBurgerType] = useState<string>(burgerTypes[0]);
  const [ingredientAmounts, setIngredientAmounts] = useState<Record<string, IngredientAmount>>(
    () => createDefaultIngredientAmounts(ingredients),
  );
  const [trayNumberInput, setTrayNumberInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const openSessionRef = useRef<string | null>(null);
  const isSubmittingRef = useRef(false);
  const trayInputRef = useRef<HTMLInputElement>(null);
  const scanBufferRef = useRef("");
  const lastScanDigitAtRef = useRef(0);
  const scanBurstEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) {
      openSessionRef.current = null;
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const sessionKey = initialValues?.id ?? "create";
    if (openSessionRef.current === sessionKey) {
      return;
    }
    openSessionRef.current = sessionKey;
    isSubmittingRef.current = false;
    setIsSubmitting(false);

    if (initialValues) {
      setBurgerType(initialValues.item);
      setIngredientAmounts({
        ...createDefaultIngredientAmounts(ingredients, "none"),
        ...(initialValues.ingredientAmounts ??
          parseIngredientDisplayList(initialValues.ingredients, ingredients)),
      });
      setTrayNumberInput(String(initialValues.trayNumber));
      return;
    }

    setBurgerType(burgerTypes[0]);
    setIngredientAmounts(createDefaultIngredientAmounts(ingredients));
    setTrayNumberInput("");
  }, [initialValues, isOpen]);

  // Auto-focus tray # and capture USB scanner digits while the modal is open.
  // Digits are applied through our buffer (replace on each new burst) so a second
  // scan never appends onto the previous tray number via the native input.
  useEffect(() => {
    if (!isOpen) {
      scanBufferRef.current = "";
      lastScanDigitAtRef.current = 0;
      if (scanBurstEndTimerRef.current) {
        clearTimeout(scanBurstEndTimerRef.current);
        scanBurstEndTimerRef.current = null;
      }
      return;
    }

    const focusTrayInput = () => {
      const input = trayInputRef.current;
      if (!input) {
        return;
      }
      input.focus();
      input.select();
    };

    const focusTimer = setTimeout(focusTrayInput, 0);

    const scheduleBurstEnd = () => {
      if (scanBurstEndTimerRef.current) {
        clearTimeout(scanBurstEndTimerRef.current);
      }
      // After a pause, end the burst so the next scan starts a fresh replace.
      scanBurstEndTimerRef.current = setTimeout(() => {
        scanBufferRef.current = "";
        lastScanDigitAtRef.current = 0;
        scanBurstEndTimerRef.current = null;
        trayInputRef.current?.select();
      }, SCAN_BURST_GAP_MS);
    };

    const applyScanBuffer = (next: string) => {
      scanBufferRef.current = next;
      setTrayNumberInput(next);
      scheduleBurstEnd();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isSubmittingRef.current) {
        return;
      }

      const isDigit = event.key.length === 1 && event.key >= "0" && event.key <= "9";
      const isEnter = event.key === "Enter";

      if (isDigit) {
        // Always own digit input so the focused tray field cannot append natively.
        event.preventDefault();
        event.stopPropagation();

        const now = performance.now();
        const gap = now - lastScanDigitAtRef.current;
        lastScanDigitAtRef.current = now;

        const continuingBurst =
          scanBufferRef.current.length > 0 && gap < SCAN_BURST_GAP_MS;

        if (continuingBurst) {
          applyScanBuffer(scanBufferRef.current + event.key);
        } else {
          // New scan / new typed number — replace whatever was there.
          applyScanBuffer(event.key);
        }

        trayInputRef.current?.focus();
        return;
      }

      if (isEnter && scanBufferRef.current.length > 0) {
        event.preventDefault();
        event.stopPropagation();
        const scanned = scanBufferRef.current;
        scanBufferRef.current = "";
        lastScanDigitAtRef.current = 0;
        if (scanBurstEndTimerRef.current) {
          clearTimeout(scanBurstEndTimerRef.current);
          scanBurstEndTimerRef.current = null;
        }
        setTrayNumberInput(scanned);
        trayInputRef.current?.focus();
        trayInputRef.current?.select();
      }
    };

    // Capture phase so scanner keys win over focused controls / Create button.
    window.addEventListener("keydown", onKeyDown, true);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown, true);
      scanBufferRef.current = "";
      lastScanDigitAtRef.current = 0;
      if (scanBurstEndTimerRef.current) {
        clearTimeout(scanBurstEndTimerRef.current);
        scanBurstEndTimerRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const setIngredientAmount = (ingredient: string, amount: IngredientAmount) => {
    setIngredientAmounts((current) => ({
      ...current,
      [ingredient]: amount,
    }));
  };

  const parsedTrayNumber = Number.parseInt(trayNumberInput.trim(), 10);

  const handlePrimaryAction = async () => {
    if (isSubmittingRef.current) {
      return;
    }

    if (!Number.isFinite(parsedTrayNumber)) {
      console.error("Save burger failed", new Error("Enter a valid tray number."));
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const orderId = initialValues?.id ?? "";
      const displayIngredients = ingredientAmountsToDisplayList(ingredientAmounts, ingredients);

      const currentValues: BurgerFormValues = {
        id: orderId,
        trayNumber: parsedTrayNumber,
        item: burgerType,
        ingredients: displayIngredients,
        ingredientAmounts,
      };

      if (mode === "edit") {
        await onUpdate?.(currentValues);
      } else {
        await onCreate?.(currentValues);
      }
      onClose();
    } catch (error) {
      console.error("Save burger failed", error);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold text-zinc-900">
            {mode === "edit" ? "Edit Burger" : "Build Burger"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800"
            aria-label="Close add burger modal"
          >
            Close
          </button>
        </div>

        <div className="space-y-5">
          <section>
            <label
              htmlFor="burger-type"
              className="mb-2 block text-sm font-semibold text-zinc-800"
            >
              Burger Type
            </label>
            <select
              id="burger-type"
              value={burgerType}
              onChange={(event) => setBurgerType(event.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-500"
            >
              {burgerTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </section>

          <section>
            <p className="mb-2 text-sm font-semibold text-zinc-800">Ingredients</p>
            <div className="rounded-lg border border-zinc-200">
              <div className="divide-y divide-zinc-100">
                {ingredients.map((ingredient) => (
                  <div
                    key={ingredient}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2"
                  >
                    <span className="text-sm text-zinc-700">{ingredient}</span>
                    <div
                      className="grid w-40 grid-cols-3 gap-0.5"
                      role="radiogroup"
                      aria-label={`${ingredient} portion`}
                    >
                      {INGREDIENT_AMOUNT_OPTIONS.map((amount) => (
                        <IngredientAmountControl
                          key={`${ingredient}-${amount}`}
                          ingredient={ingredient}
                          amount={amount}
                          selected={(ingredientAmounts[ingredient] ?? "normal") === amount}
                          onChange={setIngredientAmount}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section>
            <label htmlFor="tray-number" className="mb-2 block text-sm font-semibold text-zinc-800">
              Tray #
            </label>
            <input
              ref={trayInputRef}
              id="tray-number"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={trayNumberInput}
              onChange={(event) => {
                const next = event.target.value.replace(/\D/g, "");
                scanBufferRef.current = "";
                lastScanDigitAtRef.current = 0;
                setTrayNumberInput(next);
              }}
              placeholder="Tray number"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-500"
            />
          </section>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={handlePrimaryAction}
            disabled={isSubmitting}
            className="rounded-full bg-black px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {isSubmitting ? "Saving..." : mode === "edit" ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

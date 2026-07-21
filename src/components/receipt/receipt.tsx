type ReceiptProps = {
  orderId: string;
  trayNumber: number;
  item: string;
  ingredients: readonly string[];
  onEdit?: (orderId: string) => void;
  onDelete?: (orderId: string) => void | Promise<void>;
};

export function Receipt({
  orderId,
  trayNumber,
  item,
  ingredients,
  onEdit,
  onDelete,
}: ReceiptProps) {
  return (
    <article className="grid min-h-70 h-full grid-rows-[auto_auto_1fr] gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="grid grid-cols-[1fr_auto] items-start gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Tray #{trayNumber}
        </p>
      </div>
      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
        <h2 className="text-xl font-semibold leading-tight text-zinc-900">{item}</h2>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => void onDelete?.(orderId)}
            className="inline-flex h-8 w-18 items-center justify-center rounded-md border border-red-300 text-[11px] font-semibold uppercase tracking-[0.14em] text-red-600 transition-colors hover:bg-red-50"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => onEdit?.(orderId)}
            className="inline-flex h-8 w-18 items-center justify-center rounded-md border border-zinc-300 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            Edit
          </button>
        </div>
      </div>
      <div className="border-t border-dotted border-zinc-300 pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Ingredients
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-5 text-zinc-700 marker:text-zinc-500">
          {ingredients.map((ingredient) => (
            <li key={ingredient}>{ingredient}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}

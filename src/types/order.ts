import type { CommandStatus } from "@/types/command";

export type IngredientAmount = "none" | "normal" | "extra";

export type OrderStatus = "pending" | "running" | "done" | "failed";

export type Order = {
  id: string;
  trayNumber: number;
  item: string;
  status: OrderStatus;
  ingredients: string[];
  ingredientAmounts?: Record<string, IngredientAmount>;
};

export type CompletedOrder = {
  id: string;
  trayNumber: number;
  item: string;
  ingredients: string[];
  commands: CompletedOrderCommand[];
  completedAt: string;
  status: "done" | "failed";
};

export type CompletedOrderCommand = {
  id: number;
  code: string;
  level: number | null;
  ingredient: string | null;
  status: CommandStatus;
  isDisabled: boolean;
};

export type ActiveOrdersResponse = {
  success?: boolean;
  error?: string;
  orders?: Order[];
};

export type CompletedOrdersResponse = {
  success?: boolean;
  error?: string;
  orders?: CompletedOrder[];
};

export type DeleteOrderResponse = {
  success?: boolean;
  error?: string;
};

export type CreateOrderRequestBody = {
  burgerType?: string;
  trayNumber?: number;
  ingredients?: string[];
  ingredientAmounts?: Partial<Record<string, IngredientAmount>>;
};

export type DeleteOrderRequestBody = {
  orderId?: string;
};

export type BurgerFormValues = {
  id: string;
  trayNumber: number;
  item: string;
  ingredients: string[];
  ingredientAmounts?: Record<string, IngredientAmount>;
};

export type UpdateOrderRequestBody = {
  orderId?: string;
  trayNumber?: number;
  burgerType?: string;
  ingredientAmounts?: Partial<Record<string, IngredientAmount>>;
};

export type CreateBurgerPayload = {
  burgerType: string;
  ingredients: string[];
  ingredientAmounts: Record<string, IngredientAmount>;
  trayNumber: number;
};

export type CreateOrderSuccessBody = {
  success: true;
  orderId: string;
  burgerType: string;
  trayNumber: number;
  ingredients: string[];
};

export type CreateOrderResponse = {
  success?: boolean;
  error?: string;
  orderId?: string | number;
  burgerType?: string;
  trayNumber?: number;
  ingredients?: string[];
  code?: string;
  details?: string;
  hint?: string;
  sentParams?: unknown;
};

export type DbOrder = {
  id: number;
  status: OrderStatus;
  burger_name: string | null;
  tray_number: number | null;
};

export type DbCompletedOrder = {
  id: number;
  status: "done" | "failed";
  burger_name: string | null;
  tray_number: number | null;
  updated_at: string;
};


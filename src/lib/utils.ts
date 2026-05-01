type ClassValue =
  | string
  | null
  | undefined
  | false
  | Record<string, boolean>
  | ClassValue[];

function flattenClasses(input: ClassValue): string[] {
  if (!input) {
    return [];
  }

  if (typeof input === "string") {
    return [input];
  }

  if (Array.isArray(input)) {
    return input.flatMap(flattenClasses);
  }

  return Object.entries(input)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([className]) => className);
}

export function cn(...classes: ClassValue[]) {
  return classes.flatMap(flattenClasses).join(" ");
}

export function combineUniqueArrays(array1: string[], array2: string[]): string[] {
  const combined = [...array1, ...array2];
  return [...new Set(combined)];
}

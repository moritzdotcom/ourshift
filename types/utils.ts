// src/types/utils.ts
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Macht alle Felder optional,
 * Date → Date | string,
 * Decimal → Decimal | number
 */
export type LoosePartial<T> = {
  [K in keyof T]?: T[K] extends Date
    ? Date | string
    : T[K] extends Decimal
    ? Decimal | number
    : T[K];
};

/**
 * Rekursive Variante für verschachtelte Strukturen
 */
export type DeepLoosePartial<T> = {
  [K in keyof T]?: T[K] extends (infer U)[]
    ? DeepLoosePartial<U>[]
    : T[K] extends Date
    ? Date | string
    : T[K] extends Decimal
    ? Decimal | number
    : T[K] extends object
    ? DeepLoosePartial<T[K]>
    : T[K];
};

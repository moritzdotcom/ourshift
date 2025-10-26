type WithKey<K extends string, V> = { [P in K]: V };

export type SuccessResponse<K extends string, V> = {
  ok: true;
  error: undefined;
} & WithKey<K, V>;

export type ErrorResponse<K extends string, V> = {
  ok: false;
  error: string;
} & WithKey<K, V>;

export type ApiResponse<K extends string, V> =
  | SuccessResponse<K, V>
  | ErrorResponse<K, V>;

export const successResp = <K extends string, V>(
  key: K,
  value: V
): SuccessResponse<K, V> =>
  ({ ok: true, error: undefined, [key]: value } as SuccessResponse<K, V>);

export const failureResp = <K extends string, V>(
  key: K,
  value: V,
  message: string
): ErrorResponse<K, V> =>
  ({ ok: false, error: message, [key]: value } as ErrorResponse<K, V>);

export const isOk = <K extends string, V>(
  r: ApiResponse<K, V>
): r is SuccessResponse<K, V> => r.ok;

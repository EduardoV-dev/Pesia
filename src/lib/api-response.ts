/**
 * The shared envelope for first-party JSON endpoints. Producers and consumers
 * must use these types instead of inventing endpoint-local shapes.
 */
export type ApiError = {
  code: string
  message: string
  field?: string
}

export type ApiResponse<T> =
  | { ok: true; data: T; error: []; message: string }
  | { ok: false; data: null; error: ApiError[]; message: string }

export const API_UNAUTHORIZED_MESSAGE = "Necesitás iniciar sesión."
export const API_INVALID_INPUT_MESSAGE = "Revisá los datos e intentá de nuevo."
export const API_INTERNAL_ERROR_MESSAGE =
  "No pudimos procesar el pedido. Probá de nuevo en un momento."

export function apiSuccess<T>(data: T, message: string): ApiResponse<T> {
  return { ok: true, data, error: [], message }
}

export function apiFailure<T = never>(
  errors: readonly ApiError[],
  message: string,
): ApiResponse<T> {
  return { ok: false, data: null, error: [...errors], message }
}

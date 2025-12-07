/**
 * Extract error message from various error formats
 * Handles standard Error objects and IAPKit-style error responses
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === 'object' &&
    'errors' in error &&
    Array.isArray((error as {errors: unknown[]}).errors)
  ) {
    const errors = (error as {errors: {message?: string}[]}).errors;
    return errors[0]?.message || JSON.stringify(errors[0]) || 'Unknown error';
  }

  return 'Unknown error';
}

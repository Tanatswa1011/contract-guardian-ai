type ErrorLike = {
  message?: unknown;
  error?: unknown;
  details?: unknown;
  hint?: unknown;
  code?: unknown;
};

function normalizeErrorPart(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (typeof error === 'string') {
    return normalizeErrorPart(error) ?? fallback;
  }

  if (error instanceof Error) {
    return normalizeErrorPart(error.message) ?? fallback;
  }

  if (error && typeof error === 'object') {
    const errorLike = error as ErrorLike;
    const candidates = [
      errorLike.message,
      errorLike.error,
      errorLike.details,
      errorLike.hint,
      errorLike.code,
    ];

    for (const candidate of candidates) {
      const normalized = normalizeErrorPart(candidate);
      if (normalized) {
        return normalized;
      }
    }
  }

  return fallback;
}

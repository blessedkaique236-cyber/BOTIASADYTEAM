import { describe, expect, it } from 'vitest';
import { AppError } from '../../src/shared/errors/app-error.js';

describe('AppError', () => {
  it('preserves the application error metadata', () => {
    const error = new AppError('Queue not found', {
      code: 'QUEUE_NOT_FOUND',
      statusCode: 404,
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('AppError');
    expect(error.message).toBe('Queue not found');
    expect(error.code).toBe('QUEUE_NOT_FOUND');
    expect(error.statusCode).toBe(404);
    expect(error.isOperational).toBe(true);
  });

  it('supports an underlying cause and non-operational errors', () => {
    const cause = new Error('database unavailable');
    const error = new AppError('Unexpected failure', {
      code: 'INTERNAL_ERROR',
      isOperational: false,
      cause,
    });

    expect(error.cause).toBe(cause);
    expect(error.isOperational).toBe(false);
    expect(error.statusCode).toBe(500);
  });
});

import type { Response } from 'express';

interface HttpError extends Error {
  statusCode: number;
  code?: string;
}

/**
 * Error Handling Module
 * This module provides utility functions for handling and managing errors in the application.
 */

/**
 * Handles API errors and sends an appropriate response.
 * This function logs the error and sends a JSON response with error details.
 *
 * @param {Response} res - The Express response object
 * @param {unknown} error - The error that occurred
 * @param {string} defaultMessage - A default message to use if the error is not an instance of Error
 */
export function handleApiError(res: Response, error: unknown, defaultMessage: string) {
  logError('API Error', { error, message: defaultMessage });

  const statusCode = isHttpError(error) ? error.statusCode : 500;
  const errorMessage = error instanceof Error ? error.message : defaultMessage;

  res.status(statusCode).json({
    success: false,
    error: defaultMessage,
    details: errorMessage,
    code: isHttpError(error) ? error.code : undefined,
  });
}

/**
 * Creates a custom error with a specific status code and optional error code.
 *
 * @param {string} message - The error message
 * @param {number} statusCode - The HTTP status code for the error
 * @param {string} [code] - Optional error code for client-side handling
 */
export function createHttpError(message: string, statusCode: number, code?: string): HttpError {
  const error = new Error(message) as HttpError;
  error.statusCode = statusCode;
  if (code) error.code = code;
  return error;
}

/**
 * Type guard for HTTP errors
 */
export function isHttpError(error: unknown): error is HttpError {
  return error instanceof Error && 'statusCode' in error;
}

/**
 * Logs an error with additional context information.
 * This function provides detailed error logging, including stack traces when available.
 *
 * @param {string} context - The context in which the error occurred.
 * @param {unknown} error - The error that occurred.
 */
export function logError(context: string, error: unknown) {
  console.error(`Error in ${context}:`, error);
  if (error instanceof Error) {
    console.error('Stack trace:', error.stack);
  }
}

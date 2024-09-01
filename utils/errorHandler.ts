import { NextApiResponse } from 'next';

/**
 * Handles API errors and sends an appropriate response.
 * 
 * @param {NextApiResponse} res - The response object to send the error.
 * @param {unknown} error - The error that occurred.
 * @param {string} defaultMessage - A default message to use if the error is not an instance of Error.
 */
export function handleApiError(res: NextApiResponse, error: unknown, defaultMessage: string) {
  console.error(defaultMessage, error);
  
  if (error instanceof Error) {
    res.status(500).json({ error: defaultMessage, details: error.message });
  } else {
    res.status(500).json({ error: defaultMessage, details: 'An unknown error occurred' });
  }
}

/**
 * Creates a custom error with a specific status code.
 * 
 * @param {string} message - The error message.
 * @param {number} statusCode - The HTTP status code for the error.
 * @returns {Error & { statusCode: number }} A custom error object with a status code.
 */
export function createHttpError(message: string, statusCode: number): Error & { statusCode: number } {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}

/**
 * Checks if an error has a status code property.
 * 
 * @param {unknown} error - The error to check.
 * @returns {boolean} True if the error has a statusCode property, false otherwise.
 */
export function isHttpError(error: unknown): error is Error & { statusCode: number } {
  return error instanceof Error && 'statusCode' in error;
}

/**
 * Logs an error with additional context information.
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
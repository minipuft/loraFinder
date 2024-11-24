/**
 * Error Handling Module
 * This module provides utility functions for handling and managing errors in the application.
 */
/**
 * Handles API errors and sends an appropriate response.
 * This function logs the error and sends a JSON response with error details.
 *
 * @param {Response} res - The response object to send the error.
 * @param {unknown} error - The error that occurred.
 * @param {string} message - A message to use if the error is not an instance of Error.
 */
export const handleApiError = (res, error, message) => {
    console.error(message, error);
    res.status(500).json({ error: message });
};
/**
 * Creates a custom error with a specific status code.
 * This function is useful for creating HTTP-specific errors.
 *
 * @param {string} message - The error message.
 * @param {number} statusCode - The HTTP status code for the error.
 * @returns {Error & { statusCode: number }} A custom error object with a status code.
 */
export function createHttpError(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}
/**
 * Checks if an error has a status code property.
 * This function is a type guard for HTTP errors.
 *
 * @param {unknown} error - The error to check.
 * @returns {boolean} True if the error has a statusCode property, false otherwise.
 */
export function isHttpError(error) {
    return error instanceof Error && 'statusCode' in error;
}
/**
 * Logs an error with additional context information.
 * This function provides detailed error logging, including stack traces when available.
 *
 * @param {string} context - The context in which the error occurred.
 * @param {unknown} error - The error that occurred.
 */
export function logError(context, error) {
    console.error(`Error in ${context}:`, error);
    if (error instanceof Error) {
        console.error('Stack trace:', error.stack);
    }
}
//# sourceMappingURL=errorHandler.js.map
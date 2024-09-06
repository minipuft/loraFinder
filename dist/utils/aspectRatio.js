/**
 * Calculate the aspect ratio of an image given its width and height
 * @param width - The width of the image
 * @param height - The height of the image
 * @returns A string representation of the aspect ratio in the format "width:height"
 */
export function getAspectRatio(width, height) {
    // Helper function to calculate the greatest common divisor (GCD) using Euclidean algorithm
    const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
    // Calculate the GCD of width and height
    const divisor = gcd(width, height);
    // Return the aspect ratio as a string, dividing both width and height by their GCD
    return `${width / divisor}:${height / divisor}`;
}
//# sourceMappingURL=aspectRatio.js.map
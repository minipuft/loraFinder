export function truncateImageTitle(title: string | undefined): string {
  if (!title) return 'Untitled';

  // Remove file extensions and common suffixes anywhere in the string
  const cleanTitle = title
    // Remove file extensions and version numbers
    .replace(/\.(preview|thumbnail|jpg|jpeg|png|gif|webp)/gi, '')
    .replace(/[-_.](v\d+|example|intro|concept)[-_.]?\d*/gi, '')
    // Remove technical suffixes and common patterns
    .replace(/[-_.]?(flux|lora|ai|toolkit|preview|example\d*|poster)[-_.]?/gi, ' ')
    // Remove numbered suffixes like .0, .1, .2
    .replace(/\.\d+$/, '')
    // Remove long number sequences and IDs
    .replace(/[-_.]?\d{6,}[-_.]?/g, '')
    // Remove underscore/dash/dot between numbers
    .replace(/(\d)[-_.](\d)/g, '$1$2')
    // Remove numbers at the end of titles (like "Character Style 1")
    .replace(/\s+\d+$/, '')
    // Clean up remaining underscores, dashes, dots and extra spaces
    .replace(/[-_.]+/g, ' ')
    .replace(/\s+/g, ' ');

  // Split into words and properly capitalize each word
  const formattedTitle = cleanTitle
    .split(' ')
    .map(word => {
      // Keep acronyms uppercase, capitalize first letter of other words
      return word.match(/^[A-Z]{2,}$/)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ')
    .trim();

  // Truncate if necessary
  const maxLength = 30;
  return formattedTitle.length > maxLength
    ? formattedTitle.substring(0, maxLength) + '...'
    : formattedTitle;
}

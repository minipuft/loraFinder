export function truncateImageTitle(title: string | undefined): string {
  if (!title) return "Untitled";

  // Remove file extension
  const withoutExtension = title.replace(/\.[^/.]+$/, "");

  // Remove common suffixes and numbers at the end
  const cleanTitle = withoutExtension
    .replace(/\.(preview|thumbnail)$/, "")
    .replace(/_thumb$/, "")
    .replace(/\s*\d+$/, ""); // Remove numbers at the end

  // Replace underscores and hyphens with spaces, then capitalize each word
  const formattedTitle = cleanTitle
    .replace(/[_-]/g, " ")
    .replace(
      /\w\S*/g,
      (word) => word.charAt(0).toUpperCase() + word.substr(1).toLowerCase()
    );

  // Trim any leading or trailing spaces
  const trimmedTitle = formattedTitle.trim();

  // Truncate to a maximum length (e.g., 30 characters)
  const maxLength = 30;
  return trimmedTitle.length > maxLength
    ? trimmedTitle.substring(0, maxLength) + "..."
    : trimmedTitle;
}

import React, { useState } from "react";
import { IconSearch } from "@tabler/icons-react";

// Define the props interface for the SearchBar component
interface SearchBarProps {
  onSearch: (query: string) => void;
}

// Define the SearchBar component
const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  // State to manage the search query
  const [query, setQuery] = useState("");

  // Handler for form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  // Render the SearchBar component
  return (
    <form onSubmit={handleSubmit} className="relative">
      {/* Search input field */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search Loras..."
        className="w-64 py-1 pl-8 pr-2 text-sm text-gray-200 bg-gray-700 rounded-md focus:outline-none focus:bg-gray-600 focus:ring-1 focus:ring-primary"
      />
      {/* Search button with icon */}
      <button type="submit" className="absolute left-0 top-0 mt-1 ml-2">
        <IconSearch size={16} className="text-gray-300" />
      </button>
    </form>
  );
};

// Export the SearchBar component
export default SearchBar;

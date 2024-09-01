import React, { useState } from 'react';
import { IconSearch } from '@tabler/icons-react';

/**
 * Props for the SearchBar component.
 * @interface SearchBarProps
 */
interface SearchBarProps {
  onSearch: (query: string) => void;
}

/**
 * SearchBar component that provides a search input field with an icon.
 * It handles user input and triggers the search functionality.
 *
 * @component
 * @param {SearchBarProps} props - The props for the SearchBar component.
 * @returns {JSX.Element} A search input field with a search icon.
 */
const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [query, setQuery] = useState('');

  /**
   * Handles the form submission event.
   * Prevents default form submission and triggers the search.
   * 
   * @param {React.FormEvent} e - The form submission event.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search Loras..."
        className="w-64 py-1 pl-8 pr-2 text-sm text-gray-700 bg-gray-200 rounded-md focus:outline-none focus:bg-white focus:ring-1 focus:ring-red-500"
      />
      <button type="submit" className="absolute left-0 top-0 mt-1 ml-2">
        <IconSearch size={16} className="text-gray-500" />
      </button>
    </form>
  );
};

export default SearchBar;
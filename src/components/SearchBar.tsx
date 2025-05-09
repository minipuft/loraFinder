import { motion } from 'framer-motion';
import { useState } from 'react';
import styles from '../styles/SearchBar.module.scss';

// Define the props interface for the SearchBar component
interface SearchBarProps {
  onSearch: (query: string) => void;
}

// Define the SearchBar component
const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  // State to manage the search query
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Handler for form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  // Render the SearchBar component
  return (
    <motion.form
      onSubmit={handleSubmit}
      className={styles.searchBarContainer}
      initial={{ width: '200px' }}
      animate={{ width: query || isFocused ? '300px' : '200px' }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <motion.div className={styles.searchBackground} />
      <motion.input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={styles.searchInput}
        placeholder="Search the future..."
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      />
    </motion.form>
  );
};

// Export the SearchBar component
export default SearchBar;

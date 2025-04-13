import { motion, useAnimation } from 'framer-motion';
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
  const controls = useAnimation();

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
      animate={{ width: query ? '300px' : '200px' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <motion.div
        className={styles.searchBackground}
        animate={{
          background: query
            ? 'linear-gradient(90deg, #4a00e0 0%, #8e2de2 100%)'
            : 'rgba(255, 255, 255, 0.1)',
        }}
      />
      <motion.input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        className={styles.searchInput}
        placeholder="Search the future..."
        whileFocus={{ scale: 1.05 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      />
    </motion.form>
  );
};

// Export the SearchBar component
export default SearchBar;

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion, useAnimation } from "framer-motion";
import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import styles from "../../client/styles/SearchBar.module.scss";
// Define the SearchBar component
const SearchBar = ({ onSearch }) => {
    // State to manage the search query
    const [query, setQuery] = useState('');
    const [debouncedQuery] = useDebounce(query, 300);
    const [suggestions, setSuggestions] = useState([]);
    const controls = useAnimation();
    // Handler for form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        onSearch(query);
    };
    // Fetch suggestions based on debouncedQuery
    useEffect(() => {
        if (debouncedQuery) {
            // Update suggestions state
        }
    }, [debouncedQuery]);
    // Render the SearchBar component
    return (_jsxs(motion.form, { onSubmit: handleSubmit, className: styles.searchBarContainer, initial: { width: '200px' }, animate: { width: query ? '300px' : '200px' }, transition: { type: 'spring', stiffness: 300, damping: 30 }, children: [_jsx(motion.div, { className: styles.searchBackground, animate: {
                    background: query
                        ? 'linear-gradient(90deg, #4a00e0 0%, #8e2de2 100%)'
                        : 'rgba(255, 255, 255, 0.1)',
                } }), _jsx(motion.input, { type: "text", value: query, onChange: (e) => setQuery(e.target.value), className: styles.searchInput, placeholder: "Search the future...", whileFocus: { scale: 1.05 }, transition: { type: 'spring', stiffness: 400, damping: 30 } }), suggestions.length > 0 && (_jsx(motion.ul, { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, className: styles.suggestions, children: suggestions.map((suggestion, index) => (_jsx(motion.li, { whileHover: { scale: 1.02, backgroundColor: 'rgba(255,255,255,0.1)' }, children: suggestion }, index))) }))] }));
};
// Export the SearchBar component
export default SearchBar;
//# sourceMappingURL=SearchBar.js.map
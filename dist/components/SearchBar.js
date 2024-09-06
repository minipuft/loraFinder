import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { IconSearch } from "@tabler/icons-react";
// Define the SearchBar component
const SearchBar = ({ onSearch }) => {
    // State to manage the search query
    const [query, setQuery] = useState("");
    // Handler for form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        onSearch(query);
    };
    // Render the SearchBar component
    return (_jsxs("form", { onSubmit: handleSubmit, className: "relative", children: [_jsx("input", { type: "text", value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Search Loras...", className: "w-64 py-1 pl-8 pr-2 text-sm text-gray-200 bg-gray-700 rounded-md focus:outline-none focus:bg-gray-600 focus:ring-1 focus:ring-primary" }), _jsx("button", { type: "submit", className: "absolute left-0 top-0 mt-1 ml-2", children: _jsx(IconSearch, { size: 16, className: "text-gray-300" }) })] }));
};
// Export the SearchBar component
export default SearchBar;
//# sourceMappingURL=SearchBar.js.map
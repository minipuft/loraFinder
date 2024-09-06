import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import CurrentDirectoryButton from './CurrentDirectoryButton.js';
import SearchBar from './SearchBar.js';
import ZoomSlider from './ZoomSlider.js';
import styles from '../styles/Navbar.module.scss';
// Define the Navbar component
const Navbar = ({ currentDirectory, onSearch, zoom, onZoomChange, isGrouped, onGroupToggle, }) => {
    // Render the Navbar component
    return (_jsxs("nav", { className: styles.navbar, children: [_jsxs("div", { className: styles.leftSection, children: [_jsx(CurrentDirectoryButton, { currentDirectory: currentDirectory }), _jsx(SearchBar, { onSearch: onSearch })] }), _jsxs("div", { className: styles.rightSection, children: [_jsx("button", { onClick: onGroupToggle, className: styles.viewToggleButton, children: isGrouped ? 'Ungroup' : 'Group' }), _jsx(ZoomSlider, { zoom: zoom, onZoomChange: onZoomChange })] })] }));
};
// Export the Navbar component
export default Navbar;
//# sourceMappingURL=Navbar.js.map
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Sidebar from "../../client/components/Sidebar";
import Navbar from "../../client/components/Navbar";
import ParticleBackground from "../../client/components/ParticleBackground";
import LottieBackground from "../../client/components/LottieBackground";
const Layout = ({ folders, selectedFolder, onFolderChange, currentDirectory, onSearch, zoom, onZoomChange, isGrouped, onGroupToggle, children, }) => {
    return (_jsxs("div", { className: "flex flex-col h-screen relative bg-transparent", children: [_jsx("div", { className: "gradient-overlay" }), _jsx(LottieBackground, {}), _jsx(ParticleBackground, {}), _jsx(Navbar, { currentDirectory: currentDirectory, onSearch: onSearch, zoom: zoom, onZoomChange: onZoomChange, isGrouped: isGrouped, onGroupToggle: onGroupToggle }), _jsxs("div", { className: "flex flex-1 overflow-hidden", children: [_jsx(Sidebar, { selectedFolder: selectedFolder, setSelectedFolder: onFolderChange }), _jsx("main", { className: "flex-1 overflow-auto p-4 relative bg-transparent", children: _jsx("div", { className: "relative z-10", children: children }) })] })] }));
};
export default Layout;
//# sourceMappingURL=Layout.js.map
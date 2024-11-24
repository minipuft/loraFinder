import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import styles from "../styles/Sidebar.module.scss";
import { motion } from "framer-motion";
import { useFoldersQuery } from "../hooks/useApiQueries";
// Define the Sidebar component
const Sidebar = ({ selectedFolder, setSelectedFolder, }) => {
    const { data: folders, isLoading, error } = useFoldersQuery();
    if (isLoading)
        return _jsx("div", { children: "Loading folders..." });
    if (error)
        return _jsx("div", { children: "Error loading folders" });
    if (!folders)
        return null;
    return (
    // Main sidebar container
    _jsx(motion.div, { initial: { x: -300 }, animate: { x: 0 }, transition: { type: "spring", stiffness: 120 }, className: styles.sidebar, children: _jsxs("div", { className: `${styles.sidebar} flex flex-col h-full`, children: [_jsx("div", { className: styles.logo, children: "Lora Finder" }), _jsx("ul", { className: `${styles.folderList} flex-grow overflow-y-auto`, children: folders.map((folder) => (_jsx("li", { className: styles.folderItem, children: _jsx("button", { onClick: () => setSelectedFolder(folder.name), className: `${styles.folderButton} ${selectedFolder === folder.name ? styles.selectedFolder : ""}`, children: folder.name }) }, folder.name))) }), _jsx("div", { className: "p-8 mt-auto", children: _jsx("button", { className: `${styles.uploadButton} w-full`, children: "Upload" }) })] }) }));
};
// Export the Sidebar component
export default Sidebar;
//# sourceMappingURL=Sidebar.js.map
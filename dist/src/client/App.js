import { jsx as _jsx } from "react/jsx-runtime";
import Home from "../client/pages/Home";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const queryClient = new QueryClient();
function App({ webGLSupported = false }) {
    return (_jsx(QueryClientProvider, { client: queryClient, children: _jsx("div", { className: "App", children: _jsx(Home, { webGLSupported: webGLSupported }) }) }));
}
export default App;
//# sourceMappingURL=App.js.map
import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import App from './App.js';
export function render() {
    const html = ReactDOMServer.renderToString(_jsx(React.StrictMode, { children: _jsx(App, {}) }));
    return { html };
}
//# sourceMappingURL=entry-server.js.map
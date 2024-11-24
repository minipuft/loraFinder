import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/client/main.tsx
/// <reference types="vite/client" />
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.scss';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const queryClient = new QueryClient();
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', { error, errorInfo });
    }
    render() {
        if (this.state.hasError) {
            return (_jsxs("div", { children: [_jsx("h1", { children: "Something went wrong." }), _jsxs("p", { children: ["Error: ", this.state.error?.message] }), _jsxs("p", { children: ["Stack: ", this.state.error?.stack] })] }));
        }
        return this.props.children;
    }
}
async function checkWebGLSupport() {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
}
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(_jsx(React.StrictMode, { children: _jsx(ErrorBoundary, { children: _jsx(QueryClientProvider, { client: queryClient, children: _jsx(Suspense, { fallback: _jsx("div", { children: "Loading..." }), children: _jsx(App, {}) }) }) }) }));
//# sourceMappingURL=main.js.map
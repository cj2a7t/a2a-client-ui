import { loader } from "@monaco-editor/react";

export const initMonacoTheme = async () => {
    const monaco = await loader.init();

    monaco.editor.defineTheme("customTheme", {
        base: "vs",
        inherit: true,
        rules: [
            // JSON syntax highlighting rules
            { token: 'string.key.json', foreground: '#0369a1' }, // Key names - Blue
            { token: 'string.value.json', foreground: '#059669' }, // String values - Green
            { token: 'number.json', foreground: '#dc2626' }, // Numbers - Red
            { token: 'keyword.json', foreground: '#7c3aed' }, // Keywords - Purple
        ],
        colors: {
            "editor.background": "#f8fafc", // Main background color
            "editor.foreground": "#1e293b", // Main text color
            "editor.lineHighlightBackground": "#f1f5f9", // Current line highlight
            "editor.selectionBackground": "#dbeafe", // Selection background
            "editor.inactiveSelectionBackground": "#e2e8f0", // Inactive selection background
            "editor.findMatchBackground": "#fef3c7", // Find match background
            "editor.findMatchHighlightBackground": "#fde68a", // Find match highlight background
            "editorCursor.foreground": "#3b82f6", // Cursor color
            "editorWhitespace.foreground": "#cbd5e1", // Whitespace character color
            "editorIndentGuide.background": "#e2e8f0", // Indent guide
            "editorIndentGuide.activeBackground": "#cbd5e1", // Active indent guide
            "sideBar.background": "#f1f5f9", // Sidebar background
            "sideBar.foreground": "#64748b", // Sidebar foreground
            "editorLineNumber.foreground": "#94a3b8", // Line number color
            "editorLineNumber.activeForeground": "#64748b", // Active line number color
            "scrollbarSlider.background": "#cbd5e1", // Scrollbar background
            "scrollbarSlider.hoverBackground": "#94a3b8", // Scrollbar hover background
        },
    });

    return monaco;
};

import katex from "katex";

export function renderMath(text: string): string {
    if (!text) return "";
    let result = text;

    // \[...\] display math
    result = result.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
        try {
            return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
        } catch {
            return `\\[${math}\\]`;
        }
    });

    // \(...\) inline math
    result = result.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => {
        try {
            return katex.renderToString(math.trim(), { throwOnError: false });
        } catch {
            return `\\(${math}\\)`;
        }
    });

    // $...$ inline math (skip empty matches)
    result = result.replace(/\$([^$\n]+)\$/g, (_, math) => {
        try {
            return katex.renderToString(math.trim(), { throwOnError: false });
        } catch {
            return `$${math}$`;
        }
    });

    // *text* → italic
    result = result.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");

    return result;
}

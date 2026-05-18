import katex from "katex";

function splitMarkdownRow(line: string): string[] {
    let trimmed = line.trim();
    if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
    if (trimmed.endsWith("|")) trimmed = trimmed.slice(0, -1);
    return trimmed.split("|").map((cell) => cell.trim());
}

function isSeparatorRow(line: string): boolean {
    const cells = splitMarkdownRow(line);
    if (cells.length === 0) return false;
    return cells.every((cell) => /^:?-{2,}:?$/.test(cell));
}

function isTableRow(line: string): boolean {
    const t = line.trim();
    return t.startsWith("|") && t.endsWith("|") && t.includes("|", 1);
}

function renderInline(text: string): string {
    let r = text;
    r = r.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => {
        try { return katex.renderToString(math.trim(), { throwOnError: false }); }
        catch { return `\\(${math}\\)`; }
    });
    r = r.replace(/\$([^$\n]+)\$/g, (_, math) => {
        try { return katex.renderToString(math.trim(), { throwOnError: false }); }
        catch { return `$${math}$`; }
    });
    r = r.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    r = r.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
    return r;
}

function renderMarkdownTable(rows: string[]): string {
    const headerCells = splitMarkdownRow(rows[0]).map(renderInline);
    const bodyRows = rows.slice(2).map((row) => splitMarkdownRow(row).map(renderInline));
    const header = `<thead><tr>${headerCells.map((c) => `<th class="border border-slate-300 px-3 py-1.5 text-left font-semibold">${c}</th>`).join("")}</tr></thead>`;
    const body = `<tbody>${bodyRows.map((cells) => `<tr>${cells.map((c) => `<td class="border border-slate-300 px-3 py-1.5">${c}</td>`).join("")}</tr>`).join("")}</tbody>`;
    return `<table class="my-3 border-collapse text-sm">${header}${body}</table>`;
}

export function renderContentBlocks(text: string): string {
    if (!text) return "";
    const lines = text.split(/\r?\n/);
    const out: string[] = [];
    let i = 0;
    while (i < lines.length) {
        // Detect a markdown table: header row + separator row.
        if (
            i + 1 < lines.length &&
            isTableRow(lines[i]) &&
            isSeparatorRow(lines[i + 1])
        ) {
            const tableRows: string[] = [lines[i], lines[i + 1]];
            let j = i + 2;
            while (j < lines.length && isTableRow(lines[j])) {
                tableRows.push(lines[j]);
                j++;
            }
            out.push(renderMarkdownTable(tableRows));
            i = j;
            continue;
        }
        if (lines[i].trim() === "") {
            i++;
            continue;
        }
        const start = i;
        while (i < lines.length && lines[i].trim() !== "" && !isTableRow(lines[i])) {
            i++;
        }
        const para = lines.slice(start, i).join(" ");
        out.push(`<p>${renderMath(para)}</p>`);
    }
    return out.join("");
}

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

    // $$...$$ display math (must come before inline $...$)
    result = result.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
        try {
            return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
        } catch {
            return `$$${math}$$`;
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

    // **text** → bold (must come before italic)
    result = result.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");

    // *text* → italic
    result = result.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");

    return result;
}

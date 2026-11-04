import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

// Shows an answer with real formulas: $x^2 + 1$ inline, $$ ... $$ on its own line.
// Also understands \( ... \) and \[ ... \], which Gemini sometimes writes instead of $.
function normalizeMath(text) {
  return text
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => `$$${m}$$`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, m) => `$${m}$`);
}

export default function MathText({ children }) {
  return (
    <div
      className="text-sm leading-6 [&_p]:my-1 [&_p]:whitespace-pre-line [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_.katex-display]:overflow-x-auto [&_.katex-display]:py-1"
    >
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false }]]}
>
        {normalizeMath(String(children ?? ""))}
      </ReactMarkdown>
    </div>
  );
}
interface Props {
  content: string;
  className?: string;
}

function convertMarkdown(text: string): string {
  const escaped = escapeHtml(text);

  return (
    escaped
      // Code blocks (```...```)
      .replace(/```(\w*)\n([\s\S]*?)```/g, (_: string, _lang: string, code: string) => {
        return `<pre class="bg-cream/60 rounded-lg p-3 my-2 text-xs leading-relaxed overflow-x-auto font-mono">${code}</pre>`;
      })
      // Inline code (`...`)
      .replace(/`([^`]+)`/g, '<code class="bg-cream/60 px-1 py-0.5 rounded text-xs font-mono">$1</code>')
      // Bold (**...**)
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // Italic (*...*)
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      // Headings
      .replace(/^### (.+)$/gm, '<h3 class="font-display font-semibold text-ink text-base mt-4 mb-1">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="font-display font-semibold text-ink text-lg mt-5 mb-2">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="font-display font-bold text-ink text-xl mt-5 mb-2">$1</h1>')
      // Horizontal rules
      .replace(/^---$/gm, '<hr class="my-4 border-cream" />')
      // Unordered lists
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-slate text-sm leading-relaxed">$1</li>')
      // Ordered lists
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-slate text-sm leading-relaxed">$1</li>')
      // Double newlines → paragraph break
      .replace(/\n\n/g, '</p><p class="text-sm text-slate leading-relaxed mb-2">')
      // Single newlines → line break
      .replace(/\n/g, "<br/>")
  );
}

export function MarkdownRenderer({ content, className = "" }: Props) {
  const html = convertMarkdown(content);

  return (
    <div
      className={`break-words [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_code]:break-all [&_a]:break-all ${className}`}
      dangerouslySetInnerHTML={{
        __html: `<p class="text-sm text-slate leading-relaxed mb-2">${html}</p>`,
      }}
    />
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

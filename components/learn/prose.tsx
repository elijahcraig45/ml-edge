import { cn } from "@/lib/utils";

/**
 * Renders build-time compiled markdown.
 *
 * `dangerouslySetInnerHTML` is safe here: the HTML is produced by our own
 * compiler from first-party content in this repo, never from user input.
 */
export function Prose({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={cn("lesson-prose", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

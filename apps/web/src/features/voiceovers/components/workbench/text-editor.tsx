interface TextEditorProps {
  text: string;
  onChange: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Text editor component for voiceover scripts.
 * Simple textarea with character count display.
 */
export function TextEditor({
  text,
  onChange,
  disabled,
  placeholder = 'Enter your voiceover text here...',
}: TextEditorProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0">
        <textarea
          className="w-full h-full resize-none rounded-lg border border-input bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
        />
      </div>
      <div className="text-xs text-muted-foreground mt-2 text-right">
        {text.length} characters
      </div>
    </div>
  );
}

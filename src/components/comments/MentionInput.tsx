import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { useMentionSearch } from '@/hooks/useSongDetails';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onSubmit?: () => void;
}

export default function MentionInput({ value, onChange, placeholder, className, onSubmit }: MentionInputProps) {
  const [mentionQuery, setMentionQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: suggestions = [] } = useMentionSearch(mentionQuery);

  const extractMentionQuery = useCallback((text: string, cursor: number) => {
    const beforeCursor = text.slice(0, cursor);
    const match = beforeCursor.match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setShowSuggestions(true);
    } else {
      setMentionQuery('');
      setShowSuggestions(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const cursor = e.target.selectionStart ?? 0;
    onChange(newValue);
    setCursorPosition(cursor);
    extractMentionQuery(newValue, cursor);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !showSuggestions) {
      onSubmit?.();
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSelectMention = (username: string) => {
    const beforeCursor = value.slice(0, cursorPosition);
    const afterCursor = value.slice(cursorPosition);
    const mentionStart = beforeCursor.lastIndexOf('@');
    const newValue = beforeCursor.slice(0, mentionStart) + `@${username} ` + afterCursor;
    onChange(newValue);
    setShowSuggestions(false);
    setMentionQuery('');
    
    // Focus back on input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  return (
    <div className="relative flex-1">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />

      {showSuggestions && suggestions.length > 0 && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowSuggestions(false)} />
          <div className="absolute bottom-full left-0 right-0 mb-1 z-40 bg-card border border-border rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-150">
            {suggestions.map((profile) => (
              <button
                key={profile.id}
                onClick={() => handleSelectMention(profile.username)}
                className="flex items-center gap-2 px-3 py-2 hover:bg-accent w-full text-left transition-colors"
              >
                <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary flex items-center justify-center">
                      <span className="text-[10px] font-bold text-primary-foreground">
                        {profile.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{profile.display_name || profile.username}</p>
                  <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

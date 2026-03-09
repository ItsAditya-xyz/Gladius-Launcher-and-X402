'use client';

import { useRef, useState } from 'react';
import { Button } from '../../components/ui/button';

const PROMPT =
  "Study clawkai.com/actions, (don't read sub pages for this prompt, but when you do make sure you read entire.md as some are large ones) see what actions it can teach you and follow up me up with it with short tldr";

export default function CopyPromptButton() {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef(null);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(PROMPT);
      return true;
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = PROMPT;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        return ok;
      } catch {
        return false;
      }
    }
  };

  const handleCopy = async () => {
    const ok = await copyText();
    if (ok) {
      setCopied(true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  };

  return (
    <Button
      size="sm"
      className="bg-white text-black hover:bg-white/90"
      onClick={handleCopy}
    >
      {copied ? 'Copied' : 'Copy prompt'}
    </Button>
  );
}

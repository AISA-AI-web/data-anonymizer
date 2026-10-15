import { useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { UploadIcon } from './Icons';

interface Props {
  accept: string;
  title: string;
  hint: string;
  onFile: (file: File) => void;
}

export function FileDrop({ accept, title, hint, onFile }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      input.current?.click();
    }
  };

  return (
    <div
      className={`dropzone${dragging ? ' dragging' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={onKeyDown}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <UploadIcon />
      <p style={{ margin: '0.5rem 0 0.25rem' }}>
        <strong>{title}</strong>
      </p>
      <p className="muted small" style={{ margin: 0 }}>
        {hint}
      </p>
      <input
        ref={input}
        type="file"
        accept={accept}
        className="visually-hidden"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

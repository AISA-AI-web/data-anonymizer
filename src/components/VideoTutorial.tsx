import { useEffect, useRef, useState } from 'react';
import { TUTORIAL_VIDEO } from '../lib/policy';

const PlayIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
  </svg>
);

/**
 * The tutorial is played from Google Drive. Nothing is requested from Google until the viewer presses play,
 * so opening the tool itself still makes no outside requests.
 */
export function VideoTutorial({ autoLoad = false }: { autoLoad?: boolean }) {
  const [loaded, setLoaded] = useState(autoLoad);
  return (
    <div className="video">
      <div className="video__frame">
        {loaded ? (
          <iframe
            src={TUTORIAL_VIDEO.embedUrl}
            title={TUTORIAL_VIDEO.title}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button className="video__cover" onClick={() => setLoaded(true)}>
            <span className="video__play">
              <PlayIcon />
            </span>
            <span className="video__title">{TUTORIAL_VIDEO.title}</span>
            <span className="video__note">Plays from Google Drive. Nothing loads until you press play.</span>
          </button>
        )}
      </div>
      <p className="small muted video__links">
        Video not playing?{' '}
        <a href={TUTORIAL_VIDEO.viewUrl} target="_blank" rel="noopener noreferrer">
          Open it in Google Drive
        </a>
        .
      </p>
    </div>
  );
}

/** Opens the tutorial in a dialog over the page, so work in progress is not lost. */
export function VideoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      className="video-dialog"
      aria-labelledby="video-dialog-title"
      onClose={onClose}
      onClick={(e) => {
        // A click on the backdrop lands on the <dialog> element itself.
        if (e.target === dialog.current) onClose();
      }}
    >
      <div className="video-dialog__head">
        <h2 id="video-dialog-title">Video tutorial</h2>
        <button className="btn btn--secondary btn--small" onClick={onClose}>
          Close
        </button>
      </div>
      {/* Unmounted when closed, which also stops playback. */}
      {open && <VideoTutorial autoLoad />}
    </dialog>
  );
}

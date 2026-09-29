import * as React from 'react';

interface EmbedFrameProps {
  src: string;
  title: string;
  loadingLabel: string;
  className?: string;
  allow?: string;
  allowFullScreen?: boolean;
}

export function EmbedFrame({
  src,
  title,
  loadingLabel,
  className = '',
  allow,
  allowFullScreen,
}: EmbedFrameProps) {
  const [ready, setReady] = React.useState(false);
  const revealTimer = React.useRef<number>();

  React.useEffect(() => {
    setReady(false);
    return () => {
      if (revealTimer.current) {
        window.clearTimeout(revealTimer.current);
      }
    };
  }, [src]);

  const reveal = () => {
    if (revealTimer.current) {
      window.clearTimeout(revealTimer.current);
    }
    revealTimer.current = window.setTimeout(() => setReady(true), 500);
  };

  return (
    <div className="component-demo__surface component-demo__surface--embed">
      <div className={`component-embed__loading${ready ? ' is-hidden' : ''}`} aria-hidden={ready}>
        <span className="component-embed__loading-mark" aria-hidden="true" />
        <span>{loadingLabel}</span>
      </div>
      <iframe
        className={`component-embed${className ? ` ${className}` : ''}${ready ? ' is-ready' : ''}`}
        src={src}
        title={title}
        loading="lazy"
        allow={allow}
        allowFullScreen={allowFullScreen}
        onLoad={reveal}
      />
    </div>
  );
}

import React, { useEffect, useRef } from 'react';
import { formatTime } from '../utils/time-service';
import { volumeToPlayback } from '../utils/layout-runtime';
import './LayoutStage.css';

function assetUrl(file) {
  if (!file) return '';
  if (file.startsWith('/') || file.startsWith('data:')) return file;
  return `assets/room/${file}`;
}

function fieldPosition(field) {
  const style = {
    position: 'absolute',
    color: field.color || undefined,
    fontSize: field.size || undefined,
    fontWeight: field.weight || undefined,
    lineHeight: field.lineHeight || undefined,
    textAlign: field.align || undefined,
  };
  if (field.font) style.fontFamily = field.font;
  if (field.width) style.width = field.width;
  if (field.height) style.height = field.height;

  if (field.left || field.top) {
    if (field.left) style.left = field.left;
    if (field.top) style.top = field.top;
  } else if (field.x || field.y) {
    style.left = field.x || '50%';
    style.top = field.y || '50%';
    style.transform = 'translate(-50%, -50%)';
  }
  return style;
}

function FieldText({ field, text }) {
  if (field.digitWidth && text) {
    return (
      <span className="pxc-digits">
        {Array.from(text).map((ch, index) => (
          <span
            key={`${ch}-${index}`}
            className={ch === ':' ? 'pxc-digit pxc-colon' : 'pxc-digit'}
            style={ch === ':' ? undefined : { width: field.digitWidth }}
          >
            {ch}
          </span>
        ))}
      </span>
    );
  }
  return text;
}

function LayoutVideo({ src, fallback, active, volume, muted, paused }) {
  const ref = useRef(null);
  const playback = volumeToPlayback(volume) || { elementVolume: 1, gain: 1 };

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    try {
      el.volume = playback.elementVolume;
    } catch (error) {
      // jsdom and some embedded players reject out-of-range writes.
    }
    el.muted = Boolean(muted);
    try {
      if (active && !paused) {
        const play = el.play();
        if (play && typeof play.catch === 'function') play.catch(() => {});
      } else {
        el.pause();
      }
    } catch (error) {
      // jsdom's media element throws "not implemented" for play and pause.
    }
    return undefined;
  }, [active, paused, muted, playback.elementVolume]);

  return (
    <video
      ref={ref}
      className="pxc-layout-video"
      data-playing={active && !paused ? 'true' : 'false'}
      data-muted={muted ? 'true' : 'false'}
      data-gain={playback.gain}
      data-volume={volume}
      loop
      playsInline
      preload="auto"
    >
      {src ? <source src={assetUrl(src)} /> : null}
      {fallback ? <source src={assetUrl(fallback)} /> : null}
    </video>
  );
}

export default function LayoutStage({
  layoutsConfig,
  active,
  seconds,
  hintText,
  overrides,
  imageOverride,
  volume,
  fieldOpacity,
  fieldFadeMs,
}) {
  if (!layoutsConfig) return null;
  const names = Object.keys(layoutsConfig.layouts);
  const scale = typeof window !== 'undefined' && window.innerHeight
    ? window.innerHeight / layoutsConfig.stageHeight
    : 1;

  return (
    <div className="pxc-stage-wrap" data-testid="layout-stage">
      <div
        className="pxc-stage"
        style={{
          width: layoutsConfig.stageWidth,
          height: layoutsConfig.stageHeight,
          transform: `scale(${scale})`,
        }}
      >
        {names.map((name) => {
          const layout = layoutsConfig.layouts[name];
          const isActive = name === active;
          const file = isActive && imageOverride ? imageOverride : layout.backgroundImage;
          const videoPaused = Boolean(isActive && imageOverride);
          const layoutVolume = isActive && volume != null ? volume : layout.volume;
          return (
            <div
              key={name}
              className="pxc-layout"
              data-layout={name}
              data-active={isActive ? 'true' : 'false'}
              style={{ opacity: isActive ? 1 : 0 }}
            >
              <img className="pxc-layout-image" alt="" src={assetUrl(file)} data-file={file} />
              {layout.backgroundVideo ? (
                <LayoutVideo
                  src={layout.backgroundVideo}
                  fallback={layout.backgroundVideoFallback}
                  active={isActive}
                  paused={videoPaused}
                  volume={layoutVolume}
                  muted={layout.muted}
                />
              ) : null}
              {isActive ? layout.fieldOrder.map((fieldName) => {
                const field = layout.fields[fieldName];
                let text = field.text || '';
                if (fieldName === 'time') text = formatTime(seconds || 0);
                else if (fieldName === 'hint') text = hintText || '';
                else if (isActive && overrides && Object.prototype.hasOwnProperty.call(overrides, fieldName)) {
                  text = overrides[fieldName];
                }
                const opacity = isActive && fieldOpacity && fieldOpacity[fieldName] != null
                  ? fieldOpacity[fieldName]
                  : 1;
                const fadeMs = isActive && fieldFadeMs && fieldFadeMs[fieldName] != null
                  ? fieldFadeMs[fieldName]
                  : 0;
                return (
                  <div
                    key={fieldName}
                    className="pxc-field"
                    data-field={fieldName}
                    style={{
                      ...fieldPosition(field),
                      opacity,
                      transition: `opacity ${fadeMs}ms ease-in-out`,
                    }}
                  >
                    <FieldText field={field} text={text} />
                  </div>
                );
              }) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

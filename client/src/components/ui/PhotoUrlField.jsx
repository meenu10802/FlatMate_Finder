import { useEffect, useState } from 'react';
import { BedDouble, ImageOff, UserRound } from 'lucide-react';
import Input from './Input.jsx';

const KINDS = {
  person: {
    label: 'Your photo',
    placeholder: 'https://… (a clear photo of your face)',
    hint: 'A photo of you, not your room — people want to see who they’ll live with.',
    Icon: UserRound,
    frame: 'h-24 w-24 rounded-full',
  },
  room: {
    label: 'Room photo',
    placeholder: 'https://… (the room you’re offering)',
    hint: 'A photo of the room or flat, not of yourself.',
    Icon: BedDouble,
    frame: 'aspect-[4/3] w-full max-w-[220px] rounded-2xl',
  },
};

const looksLikeUrl = (v) => /^https?:\/\/\S+$/i.test(v);

/** URL input with a live preview, so people can check they've linked the right kind of photo. */
export default function PhotoUrlField({ kind = 'person', value, onChange, error, optional = true }) {
  const k = KINDS[kind];
  const [status, setStatus] = useState('idle'); // idle | loading | ok | broken

  useEffect(() => {
    setStatus(value && looksLikeUrl(value) ? 'loading' : 'idle');
  }, [value]);

  return (
    <div className="grid items-start gap-5 sm:grid-cols-[1fr_auto]">
      <Input
        type="url"
        label={
          <span className="flex items-center gap-2">
            {k.label}
            {optional && <span className="text-xs font-medium text-neutral-600">Optional</span>}
          </span>
        }
        placeholder={k.placeholder}
        hint={status === 'broken' ? 'We couldn’t load an image from that link — check it points directly to a photo.' : k.hint}
        value={value}
        onChange={(e) => onChange(e.target.value.trim())}
        error={error}
      />
      <div
        className={`relative flex shrink-0 items-center justify-center overflow-hidden border-2 border-dashed border-sand-300 bg-sand-50 dark:border-neutral-700 dark:bg-neutral-950 ${k.frame} ${
          status === 'ok' ? 'border-solid border-black dark:border-white' : ''
        }`}
        role="img"
        aria-label={`${k.label} preview: ${status === 'ok' ? 'image loaded' : status === 'broken' ? 'image could not be loaded' : status === 'loading' ? 'loading' : 'no image yet'}`}
      >
        {value && looksLikeUrl(value) && status !== 'broken' && (
          <img
            src={value}
            alt=""
            referrerPolicy="no-referrer"
            onLoad={() => setStatus('ok')}
            onError={() => setStatus('broken')}
            className={`h-full w-full object-cover ${kind === 'person' ? 'grayscale' : ''} ${status === 'ok' ? '' : 'invisible'}`}
          />
        )}
        {status !== 'ok' && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-neutral-600">
            {status === 'broken' ? <ImageOff size={22} /> : <k.Icon size={24} />}
            {kind === 'room' && <span className="text-xs font-semibold">{status === 'broken' ? 'No image' : 'Preview'}</span>}
          </span>
        )}
      </div>
    </div>
  );
}

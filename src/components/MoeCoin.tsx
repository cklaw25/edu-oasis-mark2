// The MOE DONE coin: gold disc with two rings inside.
export default function MoeCoin({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-label="MOE DONE coin" role="img">
      <circle cx="16" cy="16" r="15" fill="#e0a526" stroke="#8a5a0b" strokeWidth="2" />
      <circle cx="16" cy="16" r="10.5" fill="#ffd166" stroke="#b8860b" strokeWidth="2" />
      <circle cx="16" cy="16" r="5" fill="#ffe7a3" stroke="#b8860b" strokeWidth="2" />
    </svg>
  );
}

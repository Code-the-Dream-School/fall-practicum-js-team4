// Material Symbols icon (font loaded in index.html). Decorative: hidden from
// screen readers, so give the surrounding control its own label.
export function Icon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      className={`material-symbols-outlined${className ? ` ${className}` : ''}`}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}

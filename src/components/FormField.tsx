export function TextField({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <input
        {...props}
        className="mt-1 w-full rounded-control border border-line bg-card px-3 py-2.5 text-base text-ink focus:border-primary focus:outline-none"
      />
    </label>
  );
}

export function SelectField({
  label,
  children,
  ...props
}: { label: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <select
        {...props}
        className="mt-1 w-full rounded-control border border-line bg-card px-3 py-2.5 text-base text-ink focus:border-primary focus:outline-none"
      >
        {children}
      </select>
    </label>
  );
}

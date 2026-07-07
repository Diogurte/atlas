type Props = {
  label: string;
  value: string;
  className?: string;
};

export function RepairInfo({ label, value, className = "" }: Props) {
  return (
    <div className={className}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-white">{value}</p>
    </div>
  );
}
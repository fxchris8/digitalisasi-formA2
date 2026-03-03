export function InfoRow({
  label,
  value,
  labelWidth = "w-44",
  fallback = "-",
}: {
  label: string
  value: React.ReactNode
  labelWidth?: string
  fallback?: string
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 py-2.5 border-b last:border-0">
      <dt className={`text-sm text-muted-foreground shrink-0 ${labelWidth}`}>
        {label}
      </dt>
      <dd className="text-sm font-medium text-gray-900 mt-0.5 sm:mt-0">
        {value ?? fallback}
      </dd>
    </div>
  )
}

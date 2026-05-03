interface SourceBadgeProps {
  source: string;
}

export default function SourceBadge({ source }: SourceBadgeProps) {
  const labels = {
    CISA_KEV: 'CISA KEV',
    NVD: 'NVD',
    GITHUB_ADVISORY: 'GitHub',
    EPSS: 'EPSS',
  };

  return (
    <span className="badge bg-blue-600 text-white px-2 py-1 rounded text-xs">
      {labels[source as keyof typeof labels] || source}
    </span>
  );
}
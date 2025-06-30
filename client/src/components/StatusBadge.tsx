interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusStyles = () => {
    switch (status.toLowerCase()) {
      case 'anxious':
        return {
          container: 'bg-red-50 text-red-700 border-red-200',
          dot: 'bg-red-500'
        };
      case 'ok':
        return {
          container: 'bg-yellow-50 text-yellow-700 border-yellow-200',
          dot: 'bg-yellow-500'
        };
      case 'good':
        return {
          container: 'bg-green-50 text-green-700 border-green-200',
          dot: 'bg-green-500'
        };
      default:
        return {
          container: 'bg-gray-50 text-gray-700 border-gray-200',
          dot: 'bg-gray-500'
        };
    }
  };

  const styles = getStatusStyles();
  const capitalizedStatus = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${styles.container}`}>
      <div className={`w-2 h-2 rounded-full mr-2 ${styles.dot}`}></div>
      {capitalizedStatus}
    </span>
  );
}

import { ExclamationTriangleIcon } from '@radix-ui/react-icons';

interface ErrorDisplayProps {
  message: string;
}

export function ErrorDisplay({ message }: ErrorDisplayProps) {
  return (
    <section className="error-display" role="alert">
      <div className="error-display-header">
        <ExclamationTriangleIcon className="error-display-icon" />
        <h3 className="error-display-title">Generation Failed</h3>
      </div>
      <p className="error-display-message">{message}</p>
    </section>
  );
}

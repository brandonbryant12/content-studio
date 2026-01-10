// features/infographics/components/workbench/preview-panel.tsx

import {
  DownloadIcon,
  ExclamationTriangleIcon,
  ImageIcon,
  ResetIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { cn } from '@repo/ui/lib/utils';
import { useCallback, useRef, useState, type MouseEvent } from 'react';
import {
  InfographicStatus,
  type InfographicStatusType,
} from '../../lib/status';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

export interface PreviewPanelProps {
  /** URL of the generated infographic image */
  imageUrl: string | null;
  /** Current generation status */
  status: InfographicStatusType;
  /** Error message when generation fails */
  errorMessage: string | null;
  /** Title for the infographic (used for download filename) */
  title: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays the generated infographic image with zoom/pan controls.
 * Shows appropriate states for loading, empty, and error conditions.
 */
export function PreviewPanel({
  imageUrl,
  status,
  errorMessage,
  title,
  className,
}: PreviewPanelProps) {
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  const isGenerating = status === InfographicStatus.GENERATING;
  const isFailed = status === InfographicStatus.FAILED;
  const hasImage = imageUrl !== null;

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // Pan controls
  const handleMouseDown = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (zoom <= 1) return; // Only pan when zoomed in
      setIsPanning(true);
      setPanStart({
        x: e.clientX - panOffset.x,
        y: e.clientY - panOffset.y,
      });
    },
    [zoom, panOffset],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!isPanning) return;
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    },
    [isPanning, panStart],
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Download handler
  const handleDownload = useCallback(async () => {
    if (!imageUrl) return;

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${title || 'infographic'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(imageUrl, '_blank');
    }
  }, [imageUrl, title]);

  return (
    <div className={cn('preview-panel', className)}>
      {/* Header with controls */}
      <div className="preview-panel-header">
        <h3 className="preview-panel-title">Preview</h3>
        {hasImage && (
          <div className="preview-panel-controls">
            <div className="preview-panel-zoom-controls">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleZoomOut}
                disabled={zoom <= MIN_ZOOM}
                aria-label="Zoom out"
              >
                <ZoomOutIcon className="w-4 h-4" />
              </Button>
              <span className="preview-panel-zoom-level">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleZoomIn}
                disabled={zoom >= MAX_ZOOM}
                aria-label="Zoom in"
              >
                <ZoomInIcon className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleResetZoom}
                disabled={zoom === 1 && panOffset.x === 0 && panOffset.y === 0}
                aria-label="Reset zoom"
              >
                <ResetIcon className="w-4 h-4" />
              </Button>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              className="preview-panel-download"
            >
              <DownloadIcon className="w-4 h-4 mr-1.5" />
              Download
            </Button>
          </div>
        )}
      </div>

      {/* Content area */}
      <div
        ref={containerRef}
        className={cn(
          'preview-panel-content',
          hasImage && zoom > 1 && 'cursor-grab',
          isPanning && 'cursor-grabbing',
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {isGenerating ? (
          <GeneratingState />
        ) : isFailed ? (
          <ErrorState message={errorMessage} />
        ) : hasImage ? (
          <ImageView
            imageUrl={imageUrl}
            zoom={zoom}
            panOffset={panOffset}
            title={title}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="preview-panel-empty">
      <div className="preview-panel-empty-icon">
        <ImageIcon className="w-8 h-8" />
      </div>
      <p className="preview-panel-empty-title">No infographic yet</p>
      <p className="preview-panel-empty-description">
        Configure your settings and click "Generate" to create your infographic
      </p>
    </div>
  );
}

function GeneratingState() {
  return (
    <div className="preview-panel-loading">
      <Spinner className="w-8 h-8" />
      <p className="preview-panel-loading-text">
        Generating your infographic...
      </p>
      <p className="preview-panel-loading-subtext">
        This may take a minute or two
      </p>
    </div>
  );
}

interface ErrorStateProps {
  message: string | null;
}

function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="preview-panel-error">
      <div className="preview-panel-error-icon">
        <ExclamationTriangleIcon className="w-8 h-8" />
      </div>
      <p className="preview-panel-error-title">Generation failed</p>
      <p className="preview-panel-error-message">
        {message || 'An unexpected error occurred. Please try again.'}
      </p>
    </div>
  );
}

interface ImageViewProps {
  imageUrl: string;
  zoom: number;
  panOffset: { x: number; y: number };
  title: string;
}

function ImageView({ imageUrl, zoom, panOffset, title }: ImageViewProps) {
  return (
    <div className="preview-panel-image-container">
      <img
        src={imageUrl}
        alt={title || 'Generated infographic'}
        className="preview-panel-image"
        style={{
          transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`,
        }}
        draggable={false}
      />
    </div>
  );
}

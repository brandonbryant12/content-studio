import { ArrowLeftIcon, Pencil1Icon } from '@radix-ui/react-icons';
import { Badge, type BadgeVariant } from '@repo/ui/components/badge';
import { Input } from '@repo/ui/components/input';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { UIMessage } from 'ai';
import type { RouterOutput } from '@repo/api/client';
import { useSvg } from '../hooks/use-svg';
import { useUpdateSvg } from '../hooks/use-svg-actions';
import { useSvgChat } from '../hooks/use-svg-chat';
import { useSvgMessages } from '../hooks/use-svg-messages';
import { SvgChatPanel } from './svg-chat-panel';
import { SvgPreview } from './svg-preview';
import { SvgToolbar } from './svg-toolbar';
import { formatDate } from '@/shared/lib/formatters';

type SvgStatus = RouterOutput['svgs']['get']['status'];
type SvgMessage = RouterOutput['svgs']['messages'][number];

const STATUS_CONFIG: Record<
  SvgStatus,
  { label: string; variant: BadgeVariant }
> = {
  draft: { label: 'Draft', variant: 'default' },
  generating: { label: 'Generating', variant: 'warning' },
  ready: { label: 'Ready', variant: 'success' },
  failed: { label: 'Failed', variant: 'error' },
};

function toUiMessage(message: SvgMessage): UIMessage {
  return {
    id: message.id,
    role: message.role,
    parts: [{ type: 'text', text: message.content }],
  };
}

interface SvgCreatorContainerProps {
  svgId: string;
}

export function SvgCreatorContainer({ svgId }: SvgCreatorContainerProps) {
  const { data: svg } = useSvg(svgId);
  const { data: persistedMessages = [] } = useSvgMessages(svgId);
  const chat = useSvgChat(svgId);
  const updateMutation = useUpdateSvg(svgId);

  const [title, setTitle] = useState(svg.title ?? '');

  useEffect(() => {
    setTitle(svg.title ?? '');
  }, [svg.id, svg.title]);

  const initialMessages = useMemo(
    () => persistedMessages.map(toUiMessage),
    [persistedMessages],
  );

  useEffect(() => {
    if (chat.messages.length > 0) return;
    if (initialMessages.length === 0) return;
    chat.setMessages(initialMessages);
  }, [chat.messages.length, chat.setMessages, initialMessages]);

  const handleSaveTitle = useCallback(() => {
    const nextTitle = title.trim();
    const currentTitle = svg.title ?? '';

    if (nextTitle === currentTitle || updateMutation.isPending) return;

    updateMutation.mutate({
      id: svg.id,
      title: nextTitle,
    });
  }, [title, svg.id, svg.title, updateMutation]);

  const handleSendMessage = useCallback(
    (text: string) => {
      chat.sendMessage({ text });
    },
    [chat],
  );

  const isTitleDirty = title.trim() !== (svg.title ?? '');
  const statusConfig = STATUS_CONFIG[svg.status];
  const displayTitle = svg.title?.trim() || 'Untitled SVG';
  const chatMessages = chat.messages.length > 0 ? chat.messages : initialMessages;

  return (
    <div className="workbench">
      <header className="workbench-header">
        <div className="workbench-header-content">
          <div className="workbench-header-row">
            <Link to="/svgs" className="workbench-back-btn" aria-label="Back to SVG list">
              <ArrowLeftIcon />
            </Link>

            <div className="workbench-title-group">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    onBlur={handleSaveTitle}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter') return;
                      event.preventDefault();
                      event.currentTarget.blur();
                    }}
                    className="workbench-title-input"
                    placeholder="Untitled SVG"
                    aria-label="SVG title"
                  />
                  {isTitleDirty && (
                    <Pencil1Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                  )}
                </div>
              </div>
            </div>

            <div className="workbench-meta">
              <Badge variant={statusConfig.variant} className="gap-1.5">
                {svg.status === 'generating' && <Spinner className="w-3 h-3" />}
                {statusConfig.label}
              </Badge>
              <span className="text-xs text-muted-foreground hidden md:inline">
                Created {formatDate(svg.createdAt)}
              </span>
              {updateMutation.isPending && (
                <span className="text-xs text-muted-foreground">Saving...</span>
              )}
              <div className="workbench-actions">
                <SvgToolbar svgContent={svg.svgContent} title={displayTitle} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="workbench-main">
        <section className="workbench-panel-left bg-card">
          <div className="h-full p-4 lg:p-6">
            <SvgPreview svgContent={svg.svgContent} />
          </div>
        </section>

        <aside className="workbench-panel-right">
          <SvgChatPanel
            messages={chatMessages}
            status={chat.status}
            error={chat.error}
            onSendMessage={handleSendMessage}
          />
        </aside>
      </div>
    </div>
  );
}

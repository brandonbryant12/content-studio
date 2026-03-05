import { InfoCircledIcon } from '@radix-ui/react-icons';
import { PERSONA_DETAIL_GUIDANCE } from '@/shared/lib/persona-guidance';

export function PersonaGuidancePanel() {
  return (
    <div className="mb-5 rounded-xl border border-violet-200/60 bg-violet-50/70 p-4 dark:border-violet-500/20 dark:bg-violet-500/5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-violet-500/10 p-2 text-violet-600 dark:text-violet-300">
          <InfoCircledIcon className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            How this persona is used
          </h2>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            {PERSONA_DETAIL_GUIDANCE.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

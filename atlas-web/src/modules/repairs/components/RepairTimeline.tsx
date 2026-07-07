import type { RepairEvent } from "../../../services/repairs.service";
import { formatTimelineDate } from "../timeline.utils";
import { getToneClasses, mapRepairEvent } from "../repairEventMapper";

type Props = {
  events: RepairEvent[];
  fallbackDate: string;
};

export function RepairTimeline({ events, fallbackDate }: Props) {
  const timelineEvents =
    events.length > 0
      ? events
      : [
          {
            id: "fallback",
            event: "Reparação criada. Máquina recebida em loja.",
            date: fallbackDate,
          },
        ];

  const lastEvent = timelineEvents[timelineEvents.length - 1];

  return (
    <div className="mt-6">
      <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">
              Diário da Reparação
            </p>

            <h3 className="mt-2 text-2xl font-semibold text-white">
              {timelineEvents.length} acontecimentos
            </h3>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-400">
            Última atualização
            <span className="ml-2 font-semibold text-white">
              {formatTimelineDate(lastEvent.date)}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {timelineEvents.map((event, index) => {
          const isCurrent = index === timelineEvents.length - 1;
          const mappedEvent = mapRepairEvent(event.event);

          return (
            <TimelineItem
              key={event.id}
              title={mappedEvent.title}
              icon={mappedEvent.icon}
              description={event.event}
              date={formatTimelineDate(event.date)}
              active={isCurrent}
              tone={mappedEvent.tone}
            />
          );
        })}
      </div>
    </div>
  );
}

function TimelineItem({
  title,
  icon,
  description,
  date,
  active,
  tone,
}: {
  title: string;
  icon: string;
  description: string;
  date: string;
  active: boolean;
  tone: ReturnType<typeof mapRepairEvent>["tone"];
}) {
  const toneClasses = getToneClasses(tone, active);

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full border text-base ${toneClasses}`}
        >
          {icon}
        </div>

        <div className="mt-3 h-full min-h-8 w-px bg-slate-800" />
      </div>

      <article
        className={`flex-1 rounded-2xl border p-5 transition ${
          active
            ? "border-cyan-400/30 bg-slate-900 shadow-lg shadow-cyan-950/20"
            : "border-slate-800 bg-slate-900/70"
        }`}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h4 className="text-lg font-semibold text-white">{title}</h4>
            <p className="mt-1 text-sm text-slate-500">{date}</p>
          </div>

          <span
            className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
              active
                ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
                : "border-slate-700 bg-slate-950 text-slate-400"
            }`}
          >
            {active ? "Estado atual" : "Concluído"}
          </span>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-300">{description}</p>
      </article>
    </div>
  );
}

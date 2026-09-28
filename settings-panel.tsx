import { INSTRUMENTS } from "@/lib/market/symbols";
import { STRATEGIES, TIMEFRAMES, type StrategyId } from "@/lib/market/types";
import { requestNotifyPermission } from "@/lib/notifications";
import { useDeskStore } from "@/lib/store";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";

const STRATEGY_LABEL: Record<StrategyId, string> = {
  harmonic: "Harmonic patterns",
  wolfe: "Wolfe waves",
  sr: "Support & resistance",
};

export function SettingsPanel() {
  const open = useDeskStore((s) => s.settingsOpen);
  const setOpen = useDeskStore((s) => s.setSettingsOpen);
  const notifyEnabled = useDeskStore((s) => s.notifyEnabled);
  const setNotifyEnabled = useDeskStore((s) => s.setNotifyEnabled);
  const soundEnabled = useDeskStore((s) => s.soundEnabled);
  const setSoundEnabled = useDeskStore((s) => s.setSoundEnabled);
  const minQuality = useDeskStore((s) => s.minQuality);
  const setMinQuality = useDeskStore((s) => s.setMinQuality);
  const enabledStrategies = useDeskStore((s) => s.enabledStrategies);
  const toggleStrategy = useDeskStore((s) => s.toggleStrategy);
  const enabledTimeframes = useDeskStore((s) => s.enabledTimeframes);
  const toggleTimeframe = useDeskStore((s) => s.toggleTimeframe);
  const enabledInstruments = useDeskStore((s) => s.enabledInstruments);
  const toggleInstrument = useDeskStore((s) => s.toggleInstrument);

  return (
    <Sheet open={open} onOpenChange={setOpen} title="Alerts & filters">
      <div className="space-y-6 pb-8">
        <section className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Notifications
          </h3>
          <Row
            label="Push alerts"
            hint="Ping when a high-quality setup appears"
            checked={notifyEnabled}
            onCheckedChange={async (value) => {
              if (value) {
                const ok = await requestNotifyPermission();
                setNotifyEnabled(ok);
                return;
              }
              setNotifyEnabled(false);
            }}
          />
          <Row
            label="Sound"
            hint="Short tone with each new alert"
            checked={soundEnabled}
            onCheckedChange={setSoundEnabled}
          />
          <label className="block space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Minimum quality</span>
              <span className="font-mono tabular-nums text-muted-foreground">{minQuality}</span>
            </div>
            <input
              type="range"
              min={60}
              max={92}
              value={minQuality}
              onChange={(e) => setMinQuality(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </label>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Strategies
          </h3>
          {STRATEGIES.map((id) => (
            <Row
              key={id}
              label={STRATEGY_LABEL[id]}
              checked={enabledStrategies[id]}
              onCheckedChange={() => toggleStrategy(id)}
            />
          ))}
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Timeframes
          </h3>
          {TIMEFRAMES.map((id) => (
            <Row
              key={id}
              label={id}
              checked={enabledTimeframes[id]}
              onCheckedChange={() => toggleTimeframe(id)}
            />
          ))}
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Markets
          </h3>
          {INSTRUMENTS.map((item) => (
            <Row
              key={item.id}
              label={`${item.label} · ${item.name}`}
              checked={enabledInstruments[item.id]}
              onCheckedChange={() => toggleInstrument(item.id)}
            />
          ))}
        </section>
      </div>
    </Sheet>
  );
}

function Row({
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-4">
      <span>
        <span className="block text-sm">{label}</span>
        {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

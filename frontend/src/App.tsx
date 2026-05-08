import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import type { ReactNode } from 'react';

function Reveal({
  children,
  delay = 0,
  y = 32,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px' }}
      transition={{ duration: 0.75, delay, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

function ScrollStagger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '0px' }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
      }}
    >
      {children}
    </motion.div>
  );
}

const stagItem = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.2, 0.7, 0.2, 1] as const } },
} as const;

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 20, mass: 0.3 });
  return (
    <motion.div
      style={{ scaleX, transformOrigin: '0% 50%' }}
      className="fixed left-0 right-0 top-0 z-50 h-[2px] bg-chartreuse"
    />
  );
}

function Explainer({
  label = "Editor's Note",
  tone = 'bone',
  children,
}: {
  label?: string;
  tone?: 'bone' | 'chart' | 'blood';
  children: ReactNode;
}) {
  const accent =
    tone === 'chart' ? 'border-l-chartreuse' :
      tone === 'blood' ? 'border-l-oxblood' :
        'border-l-bone-dim';
  const labelClass =
    tone === 'chart' ? 'eyebrow eyebrow-accent' :
      tone === 'blood' ? 'eyebrow eyebrow-blood' :
        'eyebrow';
  return (
    <motion.aside
      className={`mb-6 border-l-2 ${accent} bg-ink-deep/60 px-5 py-4`}
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6 }}
    >
      <p className={`${labelClass} mb-2`}>— {label} —</p>
      <div className="font-body text-[15px] leading-relaxed italic text-bone-warm space-y-2">
        {children}
      </div>
    </motion.aside>
  );
}

const engineLegend = [
  {
    title: 'Signal',
    desc: 'Pre-publication buzz — GitHub stars, HuggingFace downloads, social mentions, recency. A high score means the community is already paying attention.',
  },
  {
    title: 'Trust',
    desc: 'Reproducibility checks — open code, public datasets, reported benchmarks. Low trust means claims are hard to verify independently.',
  },
  {
    title: 'Debate',
    desc: 'Controversy detection — language like "fails to replicate", "adversarial", "disputed". High debate means the field has not reached consensus.',
  },
  {
    title: 'Gap Map',
    desc: 'Distance between academic momentum and industry adoption. A high gap means strong research with zero deployment — a potential product opportunity.',
  },
  {
    title: 'X-Domain',
    desc: 'Cross-disciplinary transfer potential. Could a technique from NLP apply to drug discovery, robotics, or finance?',
  },
];

function EngineLegend() {
  return (
    <motion.div
      className="mb-8 surface p-5"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.7 }}
    >
      <p className="eyebrow eyebrow-accent mb-3">— Glossary · How to Read the Engines —</p>
      <div className="rule-ticker mb-4" />
      <div className="grid gap-px bg-rule md:grid-cols-2 xl:grid-cols-5">
        {engineLegend.map((eng, idx) => (
          <motion.div
            key={eng.title}
            className="bg-ink-deep p-4"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: idx * 0.06 }}
          >
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[9px] tracking-[0.28em] text-chartreuse">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <h4 className="font-display text-lg italic text-bone tracking-tightest">{eng.title}</h4>
            </div>
            <p className="font-body mt-2 text-[13px] leading-relaxed text-bone-warm">{eng.desc}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function ActionRubric() {
  const rules = [
    {
      tone: 'chart' as const,
      icon: '🚨',
      title: 'Alert',
      condition: 'PRISM ≥ 82 · Trust ≥ 35',
      body: 'High-priority finding. Read the paper immediately, share with your team, and consider prototyping the technique this week.',
    },
    {
      tone: 'bone' as const,
      icon: '📝',
      title: 'Daily Digest',
      condition: 'PRISM ≥ 65',
      body: 'Worth knowing about but not urgent. Skim the abstract, bookmark it, and revisit if the score rises in future runs.',
    },
    {
      tone: 'blood' as const,
      icon: '📦',
      title: 'Ignored',
      condition: 'Below thresholds',
      body: 'No action needed. PRISM stores it in memory so it can influence future analysis if related papers appear later.',
    },
  ];
  return (
    <motion.div
      className="mb-8 surface p-5"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.7 }}
    >
      <p className="eyebrow eyebrow-accent mb-3">— Action Rubric · What These Routes Mean —</p>
      <p className="font-body italic text-[15px] leading-relaxed text-bone-warm mb-4">
        The SOUL agent autonomously decides how to handle each research item based on its PRISM
        score and trust level. Below: what action was taken for each paper, and why.
      </p>
      <div className="rule-ticker mb-4" />
      <div className="grid gap-px bg-rule md:grid-cols-3">
        {rules.map((r) => (
          <div key={r.title} className={`bg-ink-deep p-4 border-l-2 ${r.tone === 'chart' ? 'border-l-chartreuse' :
            r.tone === 'blood' ? 'border-l-oxblood' :
              'border-l-bone-dim'
            }`}>
            <div className="flex items-center gap-2">
              <span className="text-base">{r.icon}</span>
              <h4 className="font-display text-lg italic text-bone tracking-tightest">{r.title}</h4>
            </div>
            <p className="font-mono text-[9px] tracking-[0.24em] text-bone-mute uppercase mt-1">
              {r.condition}
            </p>
            <p className="font-body mt-3 text-[13px] leading-relaxed text-bone-warm">{r.body}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function QuadrantGuide() {
  const cells = [
    { pos: '↗', label: 'Top-Right', tag: 'High Trust + High Gap', body: 'The goldmine. Scientifically sound research with no industry deployment yet — your best startup and product opportunities.', tone: 'chart' },
    { pos: '↖', label: 'Top-Left', tag: 'Low Trust + High Gap', body: 'Risky bets. Interesting findings that have not been validated enough. Wait for replication before investing resources.', tone: 'blood' },
    { pos: '↘', label: 'Bottom-Right', tag: 'High Trust + Low Gap', body: 'Already adopted. Industry has caught up — mature, stable technologies with less competitive edge.', tone: 'bone' },
    { pos: '↙', label: 'Bottom-Left', tag: 'Low Trust + Low Gap', body: 'Background noise. Neither novel nor robust. Safe to deprioritise unless surrounding signals shift.', tone: 'mute' },
  ] as const;
  return (
    <motion.div
      className="mt-4 surface p-5"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6 }}
    >
      <p className="eyebrow eyebrow-accent mb-3">— Quadrant Guide · How to Read the Scatter —</p>
      <div className="rule-ticker mb-4" />
      <div className="grid gap-px bg-rule md:grid-cols-2">
        {cells.map((c) => (
          <div
            key={c.label}
            className={`bg-ink-deep p-4 ${c.tone === 'chart' ? 'border-l-2 border-l-chartreuse' :
              c.tone === 'blood' ? 'border-l-2 border-l-oxblood' :
                c.tone === 'bone' ? 'border-l-2 border-l-bone-dim' :
                  'border-l-2 border-l-rule'
              }`}
          >
            <div className="flex items-baseline gap-3">
              <span className="numeral text-3xl text-bone-dim" style={{ lineHeight: 1 }}>{c.pos}</span>
              <div>
                <h4 className="font-display text-lg italic text-bone tracking-tightest">{c.label}</h4>
                <p className="font-mono text-[9px] tracking-[0.24em] text-bone-mute uppercase mt-0.5">{c.tag}</p>
              </div>
            </div>
            <p className="font-body mt-2 text-[13px] leading-relaxed text-bone-warm">{c.body}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  BrainCircuit,
  Command,
  Download,
  FlaskConical,
  GitBranch,
  Heart,
  Layers3,
  Loader2,
  MessageCircle,
  Network,
  Radar as RadarIcon,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Swords,
  Telescope,
  ThumbsDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  api,
  type AgentAlertsResponse,
  type ChatMessage,
  type ChatResponse,
  type EngineRun,
  type FusionReport,
  type ItemDetail,
  type MemorySearchResult,
  type OpenClawStatus,
  type ResearchItem,
  type Suggestion,
  type UserPersona,
} from './api/client';
import {
  fallbackAgentAlerts,
  fallbackDetail,
  fallbackEngineRuns,
  fallbackItems,
  fallbackMemoryResults,
  fallbackReports,
} from './api/fallback';
import { EngineCard } from './components/EngineCard';
import { EvidencePanel } from './components/EvidencePanel';
import { ScoreOrb } from './components/ScoreOrb';
import { SignalConstellation } from './components/SignalConstellation';
import { PaperChat } from './components/PaperChat';

type ViewKey = 'command' | 'topics' | 'debate' | 'atlas' | 'radar' | 'history' | 'benchmarks' | 'persona' | 'suggest' | 'chat';

const sourceColors = ['#D6FF3D', '#EDE6D3', '#A82A2A', '#3E5C5A', '#A8A092', '#7B1E1E'];
const crossDomainColors = ['#D6FF3D', '#EDE6D3', '#A82A2A', '#63A69F', '#A8A092'];

const views: Array<{ key: ViewKey; label: string; icon: typeof Activity; numeral: string }> = [
  { key: 'command', label: 'Front Page', icon: Activity, numeral: 'I' },
  { key: 'topics', label: 'Topics', icon: Telescope, numeral: 'II' },
  { key: 'debate', label: 'Debate', icon: Swords, numeral: 'III' },
  { key: 'atlas', label: 'Atlas', icon: Layers3, numeral: 'IV' },
  { key: 'radar', label: 'Cross-Domain', icon: RadarIcon, numeral: 'V' },
  { key: 'history', label: 'Chronicle', icon: TrendingUp, numeral: 'VI' },
  { key: 'benchmarks', label: 'Metrics', icon: Bell, numeral: 'VII' },
  { key: 'persona', label: 'Persona', icon: ShieldCheck, numeral: 'VIII' },
  { key: 'suggest', label: 'Suggest', icon: Sparkles, numeral: 'IX' },
  { key: 'chat', label: 'Ask Papers', icon: MessageCircle, numeral: 'X' },
];

function byReport(items: ResearchItem[], reports: FusionReport[]) {
  return items
    .map((item) => ({ item, report: reports.find((report) => report.item_id === item.id) }))
    .sort((left, right) => (right.report?.prism_score ?? 0) - (left.report?.prism_score ?? 0));
}

function scoreLabel(score: number) {
  if (score >= 0.75) return 'critical';
  if (score >= 0.55) return 'rising';
  if (score >= 0.35) return 'watch';
  return 'quiet';
}

function sourceChart(items: ResearchItem[]) {
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    sourceNames(item.source).forEach((source) => {
      acc[source] = (acc[source] ?? 0) + 1;
    });
    return acc;
  }, {});
  return Object.entries(counts).map(([name, value]) => ({ name: name.replace('_', ' '), value }));
}

function sourceNames(source: string) {
  return source.split(',').map((entry) => entry.trim()).filter(Boolean);
}

function sourceLabel(source: string) {
  return sourceNames(source).map((entry) => entry.replace('_', ' ')).join(' + ');
}

function engineTimeline(reports: FusionReport[]) {
  return reports.slice(0, 8).map((report, index) => ({
    name: `S${index + 1}`,
    novelty: Math.round(report.novelty_score * 100),
    trust: Math.round(report.trust_score * 100),
    gap: Math.round(report.adoption_gap_score * 100),
  }));
}

function topicData(items: ResearchItem[], reports: FusionReport[]) {
  const grouped = items.reduce<Record<string, { topic: string; count: number; score: number; trust: number; gap: number }>>((acc, item) => {
    const report = reports.find((entry) => entry.item_id === item.id);
    const current = acc[item.topic] ?? { topic: item.topic, count: 0, score: 0, trust: 0, gap: 0 };
    current.count += 1;
    current.score += report?.prism_score ?? 0;
    current.trust += report?.trust_score ?? 0;
    current.gap += report?.adoption_gap_score ?? 0;
    acc[item.topic] = current;
    return acc;
  }, {});

  return Object.values(grouped)
    .map((entry) => ({
      ...entry,
      score: Math.round((entry.score / entry.count) * 100),
      trust: Math.round((entry.trust / entry.count) * 100),
      gap: Math.round((entry.gap / entry.count) * 100),
    }))
    .sort((left, right) => right.score - left.score);
}

function displayTopic(item: ResearchItem, report?: FusionReport) {
  const topic = item.topic?.trim();
  if (topic && topic.toLowerCase() !== 'general') return topic;
  const fallback = report?.cross_domain_details?.candidate_topics?.find(Boolean);
  return fallback ?? topic ?? 'general';
}

function domainScore(report: FusionReport | undefined, domain: string) {
  const score = report?.cross_domain_details?.domain_scores?.find((entry) => entry.domain === domain)?.score;
  return Math.round((score ?? 0) * 100);
}

function transferPath(report?: FusionReport) {
  const details = report?.cross_domain_details;
  const source = details?.transfer_path?.source ?? details?.source_domain;
  const target = details?.transfer_path?.target ?? details?.target_domain;
  return source && target ? `${source} → ${target}` : null;
}

function filterAlertsForQuery(alerts: AgentAlertsResponse, query: string, itemIds: Set<string>): AgentAlertsResponse {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (decision: AgentAlertsResponse['decisions'][number]) => {
    if (itemIds.has(decision.signal.item_id)) return true;
    const haystack = `${decision.signal.title} ${decision.signal.topic} ${decision.signal.source}`.toLowerCase();
    return terms.length > 0 && terms.every((term) => haystack.includes(term));
  };
  return {
    alerts: alerts.alerts.filter(matches),
    decisions: alerts.decisions.filter(matches),
    deliveries: alerts.deliveries,
  };
}

function App() {
  const [items, setItems] = useState<ResearchItem[]>(fallbackItems);
  const [reports, setReports] = useState<FusionReport[]>(fallbackReports);
  const [selectedId, setSelectedId] = useState(fallbackItems[0].id);
  const [detail, setDetail] = useState<ItemDetail>(fallbackDetail(fallbackItems[0]));
  const [history, setHistory] = useState<EngineRun[]>(fallbackEngineRuns);
  const [alerts, setAlerts] = useState<AgentAlertsResponse>(fallbackAgentAlerts);
  const [openClawStatus, setOpenClawStatus] = useState<OpenClawStatus | null>(null);
  const [persona, setPersona] = useState<UserPersona | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [memoryResults, setMemoryResults] = useState<MemorySearchResult[]>(fallbackMemoryResults);
  const [loading, setLoading] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notice, setNotice] = useState('Demo edition · run the backend pipeline to print live PRISM memory.');
  const [query, setQuery] = useState('multimodal agents');
  const [activeView, setActiveView] = useState<ViewKey>('command');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [now] = useState(() => new Date());

  const ranked = useMemo(() => byReport(items, reports), [items, reports]);
  const selected = ranked.find((entry) => entry.item.id === selectedId) ?? ranked[0];
  const selectedReport = selected?.report ?? reports[0];
  const topReport = ranked[0]?.report ?? reports[0];
  const sourceData = useMemo(() => sourceChart(items), [items]);
  const timelineData = useMemo(() => engineTimeline(reports), [reports]);
  const topics = useMemo(() => topicData(items, reports), [items, reports]);

  async function loadLiveData(activeQuery = query, refreshReports = false) {
    const scopedQuery = activeQuery.trim();
    setLoading(true);
    try {
      const [nextItems, nextReports, nextAlerts] = await Promise.all([
        api.listItems(scopedQuery),
        api.listFusionReports(scopedQuery, refreshReports),
        api.listAgentAlerts().catch(() => fallbackAgentAlerts),
      ]);
      api.openClawStatus().then(setOpenClawStatus).catch(() => setOpenClawStatus(null));
      api.getPersona().then(setPersona).catch(() => setPersona(null));
      api.getSuggestions('default', scopedQuery).then(setSuggestions).catch(() => setSuggestions([]));
      api.searchMemory(scopedQuery).then((results) => setMemoryResults(results)).catch(() => setMemoryResults([]));
      const itemIds = new Set(nextItems.map((item) => item.id));
      if (nextItems.length > 0) {
        setItems(nextItems);
        setReports(nextReports);
        setSelectedId(nextItems[0].id);
        setAlerts(filterAlertsForQuery(nextAlerts, scopedQuery, itemIds));
        setNotice(`Live edition · "${scopedQuery}" session loaded with ${nextItems.length} results.`);
      } else {
        setItems([]);
        setReports([]);
        setSelectedId('');
        setHistory([]);
        setSuggestions([]);
        setAlerts(filterAlertsForQuery(nextAlerts, scopedQuery, itemIds));
        setNotice(`Backend reachable · no stored results for "${scopedQuery}" yet.`);
      }
    } catch (error) {
      setItems(fallbackItems);
      setReports(fallbackReports);
      setSelectedId(fallbackItems[0].id);
      setAlerts(fallbackAgentAlerts);
      setNotice('Offline edition · printing demo constellation.');
    } finally {
      setLoading(false);
    }
  }

  async function runPipeline() {
    const scopedQuery = query.trim();
    if (!scopedQuery) {
      setNotice('Enter a research inquiry first.');
      return;
    }
    setLoading(true);
    try {
      const result = await api.runPipeline(scopedQuery, false);
      setNotice(`Press run · "${scopedQuery}" · ${result.ingested_items} ingested / ${result.stored_items} new / ${result.entity_links} links.`);
      await loadLiveData(scopedQuery, true);
    } catch (error) {
      setNotice('Pipeline unreachable · holding the demo edition.');
      setLoading(false);
    }
  }

  async function searchMemory(nextQuery = query) {
    setQuery(nextQuery);
    try {
      const results = await api.searchMemory(nextQuery);
      setMemoryResults(results.length > 0 ? results : fallbackMemoryResults);
    } catch (error) {
      setMemoryResults(fallbackMemoryResults);
    }
  }

  useEffect(() => {
    loadLiveData(query);
  }, []);

  useEffect(() => {
    const item = items.find((entry) => entry.id === selectedId);
    if (!item) {
      setHistory([]);
      return;
    }
    api.getItem(item.id).then(setDetail).catch(() => setDetail(fallbackDetail(item)));
    api
      .listEngineRuns(item.id)
      .then((runs) => setHistory(runs.length > 0 ? runs : fallbackEngineRuns))
      .catch(() => setHistory(fallbackEngineRuns));
  }, [selectedId, items]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
      if (event.key === 'Escape') setPaletteOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const shellProps = {
    items,
    reports,
    ranked,
    selected,
    selectedReport,
    topReport,
    sourceData,
    timelineData,
    detail,
    topics,
    history,
    alerts,
    openClawStatus,
    persona,
    suggestions,
    setSelectedId,
    setActiveView,
  };

  const dateLabel = now.toLocaleDateString('en-GB', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  }).toUpperCase();

  return (
    <main className="min-h-screen px-4 py-6 md:px-10 lg:px-14">
      <ScrollProgress />
      <div className="mx-auto max-w-[1400px]">
        <Masthead dateLabel={dateLabel} notice={notice} loading={loading} />
        <NavBar
          activeView={activeView}
          query={query}
          setActiveView={setActiveView}
          setPaletteOpen={setPaletteOpen}
          setQuery={setQuery}
          runPipeline={runPipeline}
          loading={loading}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
          >
            {activeView === 'command' && <CommandCenter notice={notice} {...shellProps} />}
            {activeView === 'topics' && <TopicExplorer topics={topics} ranked={ranked} setSelectedId={setSelectedId} setActiveView={setActiveView} />}
            {activeView === 'debate' && <ContradictionBattle ranked={ranked} items={items} />}
            {activeView === 'atlas' && <AdoptionGapAtlas ranked={ranked} topics={topics} />}
            {activeView === 'radar' && <CrossDomainRadar ranked={ranked} />}
            {activeView === 'history' && <EngineHistoryChart history={history} selectedTitle={selected?.item.title ?? 'Selected dispatch'} />}
            {activeView === 'benchmarks' && <BenchmarkLab ranked={ranked} topics={topics} persona={persona} query={query} />}
            {activeView === 'persona' && <PersonaDashboard persona={persona} ranked={ranked} setPersona={setPersona} />}
            {activeView === 'suggest' && <SuggestionFeed suggestions={suggestions} setSelectedId={setSelectedId} setActiveView={setActiveView} />}
            {activeView === 'chat' && <PaperChat ranked={ranked} chatMessages={chatMessages} setChatMessages={setChatMessages} chatLoading={chatLoading} setChatLoading={setChatLoading} setSelectedId={setSelectedId} setActiveView={setActiveView} />}
          </motion.div>
        </AnimatePresence>

        <Colophon />
      </div>
      {paletteOpen && (
        <MemoryPalette
          query={query}
          results={memoryResults}
          setQuery={setQuery}
          close={() => setPaletteOpen(false)}
          searchMemory={searchMemory}
          setSelectedId={setSelectedId}
          setActiveView={setActiveView}
        />
      )}
    </main>
  );
}

function Masthead({ dateLabel, notice, loading }: { dateLabel: string; notice: string; loading: boolean }) {
  const line1 = 'Research Intelligence'.split('');
  const line2 = 'Command Center'.split('');
  return (
    <motion.header
      className="mb-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
    >
      <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.32em] text-bone-mute uppercase">
        <div className="flex items-center gap-3">
          <span className="pulse-dot" />
          <span>{loading ? 'Updating press' : 'On press'}</span>
          <span className="text-bone-dim">·</span>
          <span>{dateLabel}</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={notice}
            className="hidden md:flex items-center gap-3"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.4 }}
          >

            <span className="text-bone-dim"></span>
            <span className="text-chartreuse">{notice}</span>
          </motion.div>
        </AnimatePresence>
      </div>
      <motion.div
        className="rule-double mt-3 origin-left"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.9, delay: 0.1, ease: [0.2, 0.7, 0.2, 1] }}
      />
      <div className="mt-3 flex items-end justify-between">
        <h1
          className="prism-title leading-[0.85] tracking-tightest"
          style={{ fontSize: 'clamp(1.5rem, 6vw, 5.5rem)', fontFamily: 'Times New Roman, serif', fontWeight: 400, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 0' }}
          aria-label="Research Intelligence Command Center"
        >
          <span className="block">
            {line1.map((letter, i) => (
              <motion.span
                key={i}
                style={{ display: 'inline-block' }}
                initial={{ opacity: 0, y: 30, rotate: -3 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{
                  duration: 0.7,
                  delay: 0.1 + i * 0.02,
                  ease: [0.2, 0.7, 0.2, 1],
                }}
              >
                {letter === ' ' ? '\u00A0' : letter}
              </motion.span>
            ))}
          </span>
          <span className="block mt-1">
            {line2.map((letter, i) => (
              <motion.span
                key={i}
                style={{ display: 'inline-block' }}
                initial={{ opacity: 0, y: 30, rotate: -3 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{
                  duration: 0.7,
                  delay: 0.45 + i * 0.02,
                  ease: [0.2, 0.7, 0.2, 1],
                }}
              >
                {letter === ' ' ? '\u00A0' : letter}
              </motion.span>
            ))}
          </span>
        </h1>
        <motion.div
          className="hidden md:block text-right"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.7 }}
        >
          <p className="font-mono text-[10px] tracking-[0.3em] text-bone-mute">A Quarterly of Imminent Research</p>
          <p className="font-mono text-[10px] tracking-[0.3em] text-bone-mute">— Founded MMXXV —</p>
        </motion.div>
      </div>
      <motion.div
        className="rule-double mt-3 origin-right"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.9, delay: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
      />
    </motion.header>
  );
}

function NavBar({
  activeView,
  loading,
  query,
  setActiveView,
  setPaletteOpen,
  setQuery,
  runPipeline,
}: {
  activeView: ViewKey;
  loading: boolean;
  query: string;
  setActiveView: (view: ViewKey) => void;
  setPaletteOpen: (open: boolean) => void;
  setQuery: (query: string) => void;
  runPipeline: () => void;
}) {
  return (
    <motion.nav
      className="mb-10 space-y-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.5 }}
    >
      {/* Top tab strip — compact section toggles */}
      <div className="flex items-stretch overflow-x-auto border border-rule bg-ink-deep">
        {views.map((view, idx) => {
          const Icon = view.icon;
          const active = activeView === view.key;
          return (
            <motion.button
              key={view.key}
              onClick={() => setActiveView(view.key)}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              className={`group relative flex shrink-0 items-center gap-2 px-4 py-2.5 transition-colors ${idx > 0 ? 'border-l border-rule' : ''
                } ${active ? 'text-ink' : 'text-bone-dim hover:bg-ink-soft hover:text-bone'}`}
            >
              {active && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-0 bg-chartreuse"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className={`relative z-10 font-mono text-[9px] tracking-[0.28em] ${active ? 'text-ink' : 'text-bone-mute group-hover:text-bone-dim'}`}>
                {view.numeral}
              </span>
              <Icon size={12} strokeWidth={1.6} className="relative z-10" />
              <span className={`relative z-10 font-mono text-[10px] tracking-[0.22em] uppercase font-medium ${active ? 'text-ink' : ''}`}>
                {view.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Below — query + actions */}
      <div className="flex flex-wrap items-center gap-3 border border-rule bg-ink-deep px-4 py-3">
        <div className="flex flex-1 min-w-[220px] items-center gap-2">
          <Search size={14} className="text-chartreuse" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') runPipeline(); }}
            className="editorial-input"
            placeholder="enter research inquiry"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setPaletteOpen(true)} className="btn">
            <Command size={12} /> Memory
          </button>
          <button onClick={runPipeline} className="btn-primary btn">
            {loading ? <Loader2 className="animate-spin" size={12} /> : <RefreshCw size={12} />}
            Run Press
          </button>
          <a href={api.weeklyReportUrl()} className="btn-blood btn">
            <Download size={12} /> Brief
          </a>
        </div>
      </div>
    </motion.nav>
  );
}

function CommandCenter({
  notice,
  items,
  ranked,
  selected,
  selectedReport,
  topReport,
  sourceData,
  timelineData,
  detail,
  setSelectedId,
}: any) {
  return (
    <>
      {/* HERO — broken grid editorial spread */}
      <section className="mb-16 grid grid-cols-12 gap-6 lg:gap-10">
        <motion.div
          className="col-span-12 lg:col-span-8"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <div className="flex items-center gap-4 mb-6">
            <span className="chip chip-chart">— Lead Story —</span>
            <span className="font-mono text-[10px] tracking-[0.32em] text-bone-mute uppercase">
              · Front Page
            </span>
            <div className="flex-1 rule-ticker" />
            <span className="font-mono text-[10px] tracking-[0.32em] text-bone-mute">
              p. 01
            </span>
          </div>
          <h2
            className="headline mb-8"
            style={{ fontSize: 'clamp(2.5rem, 6.4vw, 6rem)' }}
          >
            Detect what will <em>matter</em>
            <br />
            before it becomes obvious.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-start">
            <p className="body-serif max-w-xl border-l-2 border-oxblood pl-5">
              <span className="font-display text-3xl float-left mr-2 leading-none italic text-oxblood-glow">P</span>
              RISM fuses early source signals, replication risk, debate clusters,
              adoption gaps, and cross-domain sparks into one explainable
              intelligence stream — published in the open, read like a paper.
            </p>
            <div className="hidden md:block w-px self-stretch bg-rule" />
            <div className="space-y-2 max-w-[200px]">
              <p className="eyebrow eyebrow-blood">Status Bulletin</p>
              <p className="font-body text-sm italic leading-snug text-bone-warm">
                {notice}
              </p>
            </div>
          </div>
        </motion.div>
        <motion.aside
          className="col-span-12 lg:col-span-4 lg:border-l lg:border-rule lg:pl-10"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.9, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <div className="flex justify-center lg:justify-end">
            <ScoreOrb label="PRISM Priority" score={topReport?.prism_score ?? 0} size="lg" />
          </div>
          <div className="mt-8 space-y-3 text-right">
            <p className="eyebrow">Verdict / abridged</p>
            <p className="font-display text-2xl italic text-bone leading-tight">
              "{topReport?.verdict?.split('.')[0] ?? 'Awaiting first transmission'}."
            </p>
          </div>
        </motion.aside>
      </section>

      <motion.div
        className="rule-ticker mb-12 origin-left"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: [0.2, 0.7, 0.2, 1] }}
      />

      {/* CONSTELLATION */}
      <Reveal className="mb-16">
        <SignalConstellation items={items} />
      </Reveal>

      {/* ENGINE STRIP */}
      <section className="mb-16">
        <Reveal>
          <SectionHeader numeral="IV" eyebrow="The Five Engines" title="Today's instrument readings" />
        </Reveal>
        <EngineLegend />
        <ScrollStagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            { title: 'Signal', subtitle: 'pre-publication traction', score: selectedReport?.novelty_score ?? 0, icon: Zap },
            { title: 'Trust', subtitle: 'replication readiness', score: selectedReport?.trust_score ?? 0, icon: ShieldCheck },
            { title: 'Debate', subtitle: 'claim conflict pressure', score: selectedReport?.controversy_score ?? 0, icon: FlaskConical },
            { title: 'Gap Map', subtitle: 'industry lag index', score: selectedReport?.adoption_gap_score ?? 0, icon: Layers3 },
            { title: 'X-Domain', subtitle: 'transfer opportunity', score: selectedReport?.transferability_score ?? 0, icon: RadarIcon },
          ].map((card) => (
            <motion.div key={card.title} variants={stagItem} initial="hidden" animate="show" whileHover={{ y: -4 }}>
              <EngineCard {...card} gradient="" />
            </motion.div>
          ))}
        </ScrollStagger>
      </section>

      {/* TWO-COLUMN GAZETTE BODY */}
      <section className="grid gap-10 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-10">
          <Reveal>
            <RankedQueue ranked={ranked} selectedId={selected?.item.id} setSelectedId={setSelectedId} />
          </Reveal>
          <Reveal delay={0.1}>
            <SourceMix sourceData={sourceData} />
          </Reveal>
        </div>
        <div className="space-y-10">
          {selected && selectedReport && (
            <Reveal>
              <DetailPanel selected={selected} selectedReport={selectedReport} />
            </Reveal>
          )}
          <ScrollStagger className="grid gap-6 lg:grid-cols-2">
            <motion.div variants={stagItem} initial="hidden" animate="show">
              <EvidencePanel title="Explainability Trace" evidence={selectedReport?.evidence ?? []} />
            </motion.div>
            {selected && (
              <motion.div variants={stagItem} initial="hidden" animate="show">
                <EntityLinks detail={detail} />
              </motion.div>
            )}
          </ScrollStagger>
          <Reveal>
            <EngineTrend timelineData={timelineData} />
          </Reveal>
        </div>
      </section>
    </>
  );
}

function SectionHeader({ numeral, eyebrow, title }: { numeral: string; eyebrow: string; title: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-4">
        <span className="font-mono text-[10px] tracking-[0.32em] text-chartreuse">{numeral}</span>
        <span className="eyebrow">{eyebrow}</span>
        <div className="flex-1 rule-ticker" />
      </div>
      <h2 className="font-display mt-3 text-3xl tracking-tightest text-bone md:text-4xl">
        {title}
      </h2>
    </div>
  );
}

function RankedQueue({ ranked, selectedId, setSelectedId }: any) {
  return (
    <div>
      <SectionHeader numeral="  V" eyebrow="Ranked Dispatches" title="The priority queue" />
      <Explainer label="How to Use This Queue">
        All discovered research items, ranked by their overall PRISM priority score. Higher numbers
        mean stronger combined signals across all five engines. Click any item to inspect its full
        analysis on the right.
      </Explainer>
      <div className="surface">
        {ranked.length === 0 && (
          <div className="p-6 font-body italic text-bone-mute">
            No papers in this research session yet. Run the press for the query above.
          </div>
        )}
        {ranked.map(({ item, report }: { item: ResearchItem; report?: FusionReport }, index: number) => {
          const active = selectedId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              className={`w-full border-b border-rule px-5 py-5 text-left transition-colors last:border-b-0 ${active ? 'bg-chartreuse/5' : 'hover:bg-ink-soft'}`}
            >
              <div className="flex items-start gap-4">
                <span className="numeral shrink-0 text-3xl text-bone-mute" style={{ lineHeight: 1 }}>
                  {(index + 1).toString().padStart(2, '0')}
                </span>
                <div className="flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2 font-mono text-[9px] tracking-[0.22em] text-bone-mute uppercase">
                    <span>{sourceLabel(item.source)}</span>
                    <span>·</span>
                    <span>{item.topic}</span>
                    <span>·</span>
                    <span className={(report?.prism_score ?? 0) >= 0.55 ? 'text-chartreuse' : 'text-oxblood-glow'}>
                      {scoreLabel(report?.prism_score ?? 0)}
                    </span>
                  </div>
                  <h3 className={`font-display text-lg leading-snug ${active ? 'text-chartreuse' : 'text-bone'}`}>
                    {item.title}
                  </h3>
                </div>
                <span className={`numeral text-3xl ${active ? 'text-chartreuse' : 'text-bone'}`} style={{ lineHeight: 1 }}>
                  {Math.round((report?.prism_score ?? 0) * 100)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SourceMix({ sourceData }: { sourceData: Array<{ name: string; value: number }> }) {
  return (
    <div>
      <SectionHeader numeral="  VI" eyebrow="Source Mix" title="Where the signal originates" />
      <Explainer label="Why This Matters">
        A healthy intelligence pipeline draws from multiple channels. If one bar dominates, you may
        be missing insights from the others — consider broadening your monitored sources.
      </Explainer>
      <div className="surface p-5">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sourceData}>
              <CartesianGrid strokeDasharray="0" stroke="rgba(237,230,211,0.06)" />
              <XAxis dataKey="name" stroke="#A8A092" fontSize={10} tickLine={false} axisLine={{ stroke: '#1E1E26' }} />
              <YAxis stroke="#A8A092" fontSize={10} tickLine={false} axisLine={{ stroke: '#1E1E26' }} />
              <Tooltip contentStyle={{ background: '#070709', border: '1px solid #A8A092', borderRadius: 0, color: '#EDE6D3' }} />
              <Bar dataKey="value" radius={0}>
                {sourceData.map((entry, index) => (
                  <Cell key={entry.name} fill={sourceColors[index % sourceColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function DetailPanel({ selected, selectedReport }: any) {
  return (
    <section>
      <SectionHeader numeral="  II" eyebrow="Feature" title="Selected dispatch" />
      <article className="surface relative p-8">
        <div className="absolute top-0 right-0 diagonal-strike h-full w-24 pointer-events-none" />
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="chip">{selected.item.source.replace('_', ' ')}</span>
          <span className="chip chip-bone">{selected.item.topic}</span>
          <span className="font-mono text-[10px] tracking-[0.22em] text-bone-mute ml-auto">
            DOI / {selected.item.id.slice(0, 8)}
          </span>
        </div>
        <h2 className="headline" style={{ fontSize: 'clamp(1.75rem, 3.4vw, 2.75rem)' }}>
          {selected.item.title}
        </h2>
        <div className="my-5 rule-ticker" />
        <p className="body-serif columns-1 md:columns-2 gap-8">
          <span className="font-display text-5xl float-left mr-2 leading-none italic text-oxblood-glow">
            {selected.item.abstract.charAt(0)}
          </span>
          {selected.item.abstract.slice(1)}
        </p>
        <div className="mt-6 flex items-center gap-4">
          <a href={selected.item.url} target="_blank" rel="noreferrer" className="editorial-link font-mono text-[11px] tracking-[0.22em] uppercase">
            Read source <ArrowUpRight size={12} className="inline" />
          </a>
          <div className="flex-1 rule-ticker" />
        </div>
        <div className="mt-6 surface-inset p-5">
          <div className="mb-2 flex items-center gap-2">
            <BrainCircuit size={14} className="text-chartreuse" strokeWidth={1.4} />
            <span className="eyebrow eyebrow-accent">Fusion Verdict</span>
          </div>
          <p className="font-display italic text-xl leading-snug text-bone">
            "{selectedReport.verdict}"
          </p>
          <p className="font-body mt-3 text-[13px] italic text-bone-mute leading-relaxed">
            Generated by PRISM's fusion engine. When enabled, the Groq API refines the reasoning first for maximum speed;
            local Ollama is the secondary fallback before the deterministic heuristics take over.
          </p>
        </div>
      </article>
    </section>
  );
}

function EntityLinks({ detail }: { detail: ItemDetail }) {
  return (
    <section className="surface p-5">
      <div className="mb-4 flex items-center gap-2">
        <Network size={14} className="text-oxblood-glow" strokeWidth={1.4} />
        <p className="eyebrow eyebrow-blood">Linked Intelligence</p>
      </div>
      <p className="font-body mb-4 text-[13px] italic text-bone-mute leading-relaxed">
        PRISM automatically discovers relationships between papers, repositories, datasets, and
        models. Confidence shows how strongly each link is supported by shared evidence.
      </p>
      <div className="rule-ticker mb-4" />
      <div className="space-y-4">
        {detail.entity_links.length === 0 && (
          <p className="font-body text-sm italic text-bone-mute">
            No entity links printed in this edition.
          </p>
        )}
        {detail.entity_links.map((link) => (
          <div key={link.id} className="border-b border-rule pb-4 last:border-b-0 last:pb-0">
            <div className="flex items-center justify-between gap-3">
              <span className="font-display italic text-bone">{link.relation_type.replace('_', ' ')}</span>
              <span className="numeral text-2xl text-chartreuse" style={{ lineHeight: 1 }}>
                {Math.round(link.confidence * 100)}<span className="text-xs text-bone-mute font-mono ml-1">%</span>
              </span>
            </div>
            <p className="font-body mt-2 text-sm text-bone-warm italic">{link.evidence.join(' / ')}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function EngineTrend({ timelineData }: { timelineData: Array<Record<string, number | string>> }) {
  return (
    <section>
      <SectionHeader numeral="  VII" eyebrow="Trend Contours" title="The engine over time" />
      <Explainer label="Reading the Contours">
        <p>
          <span className="text-chartreuse not-italic">Chartreuse</span> tracks novelty and
          buzz building up. <span className="text-bone not-italic">Bone</span> tracks trust as
          reproducibility evidence accumulates. <span className="text-oxblood-glow not-italic">Oxblood</span>{' '}
          tracks the adoption gap between research momentum and industry uptake.
        </p>
      </Explainer>
      <div className="surface p-5">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineData}>
              <defs>
                <linearGradient id="novelty" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D6FF3D" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#D6FF3D" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="trust" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EDE6D3" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#EDE6D3" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gap" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#A82A2A" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#A82A2A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="0" stroke="rgba(237,230,211,0.06)" />
              <XAxis dataKey="name" stroke="#A8A092" fontSize={10} tickLine={false} axisLine={{ stroke: '#1E1E26' }} />
              <YAxis stroke="#A8A092" fontSize={10} tickLine={false} axisLine={{ stroke: '#1E1E26' }} />
              <Tooltip contentStyle={{ background: '#070709', border: '1px solid #A8A092', borderRadius: 0, color: '#EDE6D3' }} />
              <Area type="monotone" dataKey="novelty" stroke="#D6FF3D" fill="url(#novelty)" strokeWidth={2} />
              <Area type="monotone" dataKey="trust" stroke="#EDE6D3" fill="url(#trust)" strokeWidth={2} />
              <Area type="monotone" dataKey="gap" stroke="#A82A2A" fill="url(#gap)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

function TopicExplorer({ topics, ranked, setSelectedId, setActiveView }: any) {
  return (
    <section className="grid gap-10 xl:grid-cols-[0.85fr_1.15fr]">
      <div>
        <SectionHeader numeral="  II" eyebrow="Topics" title="Research by monitored theme" />
        <Explainer label="How to Read the Topics">
          Items are grouped by topic. Each card shows the average PRISM score, trust level, and
          adoption gap for that theme. Use this view to identify which research areas are producing
          the most actionable intelligence right now.
        </Explainer>
        <div className="surface">
          {topics.map((topic: any, idx: number) => (
            <motion.div
              key={topic.topic}
              className="border-b border-rule p-5 last:border-b-0"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.55, delay: idx * 0.05, ease: [0.2, 0.7, 0.2, 1] }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="font-mono text-[9px] tracking-[0.32em] text-bone-mute">
                    {(idx + 1).toString().padStart(2, '0')} ·
                  </span>
                  <h3 className="font-display text-2xl text-bone tracking-tightest">{topic.topic}</h3>
                  <p className="font-body italic text-sm text-bone-mute">
                    {topic.count} signals captured
                  </p>
                </div>
                <span className="numeral text-5xl text-chartreuse" style={{ lineHeight: 0.9 }}>
                  {topic.score}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-px bg-rule">
                <Metric label="trust" value={topic.trust} />
                <Metric label="gap" value={topic.gap} />
                <Metric label="priority" value={topic.score} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      <div>
        <SectionHeader numeral="  III" eyebrow="Evidence-First Queue" title="Top signals inside the map" />
        <Explainer label="Click to Drill In">
          The highest-priority papers across all topics. Click any card to jump back to the Front
          Page for a full breakdown of that paper's scores, verdict, and supporting evidence.
        </Explainer>
        <div className="grid gap-px bg-rule md:grid-cols-2">
          {ranked.map(({ item, report }: any, idx: number) => (
            <motion.button
              key={item.id}
              onClick={() => {
                setSelectedId(item.id);
                setActiveView('command');
              }}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: idx * 0.04, ease: [0.2, 0.7, 0.2, 1] }}
              whileHover={{ y: -2 }}
              className="bg-ink-deep p-5 text-left hover:bg-ink-soft transition-colors"
            >
              <span className="eyebrow eyebrow-accent">{item.topic}</span>
              <h3 className="font-display mt-2 text-xl text-bone leading-snug">{item.title}</h3>
              <p className="font-body mt-3 text-sm italic text-bone-warm">
                {report?.evidence?.[0] ?? 'Fallback evidence available.'}
              </p>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContradictionBattle({ ranked }: any) {
  const contenders = ranked
    .filter(({ report }: any) => (report?.controversy_score ?? 0) >= 0.0)
    .slice(0, 8);

  return (
    <section>
      <SectionHeader numeral="  III" eyebrow="Debate" title="Where claims are most contested" />
      <Explainer label="What 'Debate' Means" tone="blood">
        The Debate engine surfaces papers whose claims are actively challenged — through replication
        failures, adversarial counter-results, or disputed benchmarks. Higher numbers mean less
        consensus. Use this view to spot fragile findings before they collapse.
      </Explainer>
      <div className="grid gap-6 lg:grid-cols-2">
        {contenders.map(({ item, report }: any, index: number) => (
          <motion.article
            key={item.id}
            className="surface p-6 border-l-4 border-l-oxblood"
            initial={{ opacity: 0, y: 32, rotateX: -6 }}
            whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: index * 0.07, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="chip chip-blood">Claim {(index + 1).toString().padStart(2, '0')}</span>
              <span className="numeral text-4xl text-oxblood-glow" style={{ lineHeight: 1 }}>
                {Math.round((report?.controversy_score ?? 0) * 100)}
              </span>
            </div>
            <h3 className="font-display text-2xl text-bone tracking-tightest leading-snug">{item.title}</h3>
            <p className="body-serif mt-3">{item.abstract}</p>
            <div className="mt-4 surface-inset p-4">
              <p className="eyebrow eyebrow-blood mb-2">Debate Evidence</p>
              <p className="font-body italic text-sm text-bone-warm">
                {report?.evidence?.find((entry: string) => entry.toLowerCase().includes('debate'))
                  ?? report?.evidence?.[0]
                  ?? 'No contradiction evidence printed yet.'}
              </p>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

function AdoptionGapAtlas({ ranked, topics }: any) {
  const scatter = ranked.map(({ item, report }: any) => ({
    name: item.title.slice(0, 28),
    x: Math.round((report?.trust_score ?? 0) * 100),
    y: Math.round((report?.adoption_gap_score ?? 0) * 100),
    z: Math.round((report?.prism_score ?? 0) * 100),
    topic: item.topic,
  }));

  return (
    <section className="grid gap-10 xl:grid-cols-[1.1fr_0.9fr]">
      <div>
        <SectionHeader numeral="  IV" eyebrow="Adoption Gap Atlas" title="Trusted, but unabsorbed by industry" />
        <Explainer label="Reading the Scatter">
          A scatter plot of <span className="text-bone not-italic">Trust</span> (X-axis: how
          reproducible the research is) against <span className="text-bone not-italic">Adoption Gap</span>{' '}
          (Y-axis: how far ahead academia sits versus industry). Each dot is a paper. The quadrant
          guide below explains how to read each region.
        </Explainer>
        <div className="surface p-5 h-[28rem]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid strokeDasharray="0" stroke="rgba(237,230,211,0.06)" />
              <XAxis dataKey="x" name="trust" stroke="#A8A092" fontSize={10} tickLine={false} axisLine={{ stroke: '#1E1E26' }} />
              <YAxis dataKey="y" name="gap" stroke="#A8A092" fontSize={10} tickLine={false} axisLine={{ stroke: '#1E1E26' }} />
              <Tooltip cursor={{ strokeDasharray: '3 3', stroke: '#A8A092' }} contentStyle={{ background: '#070709', border: '1px solid #A8A092', borderRadius: 0, color: '#EDE6D3' }} />
              <Scatter data={scatter} fill="#D6FF3D" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <QuadrantGuide />
      </div>
      <div>
        <SectionHeader numeral="  V" eyebrow="Cluster Pressure" title="Topic gap summary" />
        <Explainer label="Where to Build">
          Average adoption gap per research topic. Longer bars mean academia is further ahead of
          industry in that area. Topics scoring above 60 are strong candidates for new products,
          tools, or services that bridge the research-to-market divide.
        </Explainer>
        <div className="surface">
          {topics.map((topic: any) => (
            <div key={topic.topic} className="border-b border-rule p-5 last:border-b-0">
              <div className="flex justify-between gap-3 items-baseline">
                <span className="font-display text-xl text-bone tracking-tightest">{topic.topic}</span>
                <span className="numeral text-3xl text-oxblood-glow" style={{ lineHeight: 1 }}>{topic.gap}</span>
              </div>
              <div className="mt-3 h-px bg-rule">
                <div className="h-px bg-oxblood-glow" style={{ width: `${topic.gap}%` }} />
              </div>
              <div className="mt-2 flex justify-between font-mono text-[9px] tracking-[0.22em] text-bone-mute uppercase">
                <span>quiet</span><span>industry-lag index</span><span>critical</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CrossDomainRadar({ ranked }: any) {
  const candidateRows = ranked
    .filter(({ report }: any) => (report?.transferability_score ?? 0) > 0.2)
    .slice(0, 5);
  const visibleCandidates = candidateRows.length ? candidateRows : ranked.slice(0, 5);
  const domainNames = Array.from(
    new Set<string>(
      visibleCandidates.flatMap(({ report }: any) =>
        (report?.cross_domain_details?.domain_scores ?? [])
          .filter((entry: any) => entry.score > 0)
          .map((entry: any) => entry.domain)
      )
    )
  )
    .sort((left, right) => {
      const leftMax = Math.max(...visibleCandidates.map(({ report }: any) => domainScore(report, left)));
      const rightMax = Math.max(...visibleCandidates.map(({ report }: any) => domainScore(report, right)));
      return rightMax - leftMax;
    })
    .slice(0, 7);
  const radarData = domainNames.map((domain) => ({
    domain,
    ...Object.fromEntries(
      visibleCandidates.map(({ report }: any, index: number) => [`candidate${index}`, domainScore(report, domain)])
    ),
  }));
  const hasDomainRadar = radarData.length > 2;

  return (
    <section className="grid gap-10 xl:grid-cols-[0.9fr_1.1fr]">
      <div>
        <SectionHeader numeral="  V" eyebrow="Transfer" title="Cross-domain paths" />
        <Explainer label="Reading the Radar">
          <p>
            Each shape compares one candidate across detected domains. Stronger spread across two
            or more axes means the paper has a clearer transfer path than a single-domain spike.
          </p>
          <p>
            The candidate list shows the topic, inferred source-to-target path, and technique so the
            chart and evidence read together.
          </p>
        </Explainer>
        <div className="surface p-5 h-[30rem]">
          {hasDomainRadar ? (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(237,230,211,0.12)" />
                <PolarAngleAxis dataKey="domain" stroke="#EDE6D3" fontSize={10} />
                {visibleCandidates.map(({ item, report }: any, index: number) => (
                  <Radar
                    key={item.id}
                    name={displayTopic(item, report)}
                    dataKey={`candidate${index}`}
                    stroke={crossDomainColors[index % crossDomainColors.length]}
                    fill={crossDomainColors[index % crossDomainColors.length]}
                    fillOpacity={index === 0 ? 0.22 : 0.08}
                    strokeWidth={2}
                  />
                ))}
                <Tooltip contentStyle={{ background: '#070709', border: '1px solid #A8A092', borderRadius: 0, color: '#EDE6D3' }} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-center font-body text-sm italic leading-relaxed text-bone-warm">
              Run or refresh the engines to populate per-domain comparison scores for this radar.
            </div>
          )}
        </div>
        <div className="mt-4 grid gap-2">
          {visibleCandidates.map(({ item, report }: any, index: number) => (
            <div key={item.id} className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-bone-mute">
              <span className="h-2 w-8" style={{ backgroundColor: crossDomainColors[index % crossDomainColors.length] }} />
              <span>{displayTopic(item, report)}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <SectionHeader numeral="  VI" eyebrow="Transfer Evidence" title="Cross-domain candidates" />
        <Explainer label="What These Candidates Are">
          Papers where the Cross-Domain Engine detected a plausible transfer path — for example, a
          drug-discovery technique that could work for materials science, or an NLP method
          applicable to code generation.
        </Explainer>
        <div className="space-y-px bg-rule">
          {visibleCandidates.map(({ item, report }: any) => {
            const path = transferPath(report);
            const details = report?.cross_domain_details;
            return (
              <div key={item.id} className="bg-ink-deep p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-xl text-bone tracking-tightest">{item.title}</h3>
                  <span className="numeral text-3xl text-chartreuse" style={{ lineHeight: 1 }}>
                    {Math.round((report?.transferability_score ?? 0) * 100)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-bone-mute">
                  <span className="border border-rule px-2 py-1 text-bone">{displayTopic(item, report)}</span>
                  {path && <span className="border border-rule px-2 py-1">{path}</span>}
                  {details?.technique && <span className="border border-rule px-2 py-1">{details.technique}</span>}
                </div>
                <p className="font-body mt-2 text-sm italic text-bone-warm">
                  {report?.evidence?.find((entry: string) => entry.toLowerCase().includes('cross')) ?? report?.verdict}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function EngineHistoryChart({ history, selectedTitle }: { history: EngineRun[]; selectedTitle: string }) {
  const data = history
    .slice()
    .reverse()
    .map((run, index) => ({
      name: `R${index + 1}`,
      signal: Math.round(run.signal_score * 100),
      trust: Math.round(run.trust_score * 100),
      debate: Math.round(run.debate_score * 100),
      gap: Math.round(run.gap_score * 100),
      cross: Math.round(run.cross_domain_score * 100),
    }));

  return (
    <section>
      <SectionHeader numeral="  VI" eyebrow="Chronicle" title={selectedTitle} />
      <Explainer label="Reading the Chronicle">
        <p>
          Each point (R1, R2, R3…) represents a separate analysis run for this paper.
        </p>
        <p>
          <span className="text-chartreuse not-italic">Rising Signal</span> — more stars, downloads,
          or social mentions over time; growing community interest.
          {' · '}
          <span className="text-bone not-italic">Rising Trust</span> — new code, datasets, or
          benchmarks have appeared; the research is becoming more reproducible.
          {' · '}
          <span className="text-oxblood-glow not-italic">Rising Debate</span> — more conflicting
          papers; claims are becoming more contested.
        </p>
      </Explainer>
      <div className="surface p-5 h-[30rem]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="0" stroke="rgba(237,230,211,0.06)" />
            <XAxis dataKey="name" stroke="#A8A092" fontSize={10} tickLine={false} axisLine={{ stroke: '#1E1E26' }} />
            <YAxis stroke="#A8A092" fontSize={10} tickLine={false} axisLine={{ stroke: '#1E1E26' }} />
            <Tooltip contentStyle={{ background: '#070709', border: '1px solid #A8A092', borderRadius: 0, color: '#EDE6D3' }} />
            <Area type="monotone" dataKey="signal" stroke="#D6FF3D" fill="#D6FF3D" fillOpacity={0.12} strokeWidth={2} />
            <Area type="monotone" dataKey="trust" stroke="#EDE6D3" fill="#EDE6D3" fillOpacity={0.08} strokeWidth={2} />
            <Area type="monotone" dataKey="debate" stroke="#A82A2A" fill="#A82A2A" fillOpacity={0.12} strokeWidth={2} />
            <Area type="monotone" dataKey="gap" stroke="#7B1E1E" fill="#7B1E1E" fillOpacity={0.1} strokeWidth={2} />
            <Area type="monotone" dataKey="cross" stroke="#3E5C5A" fill="#3E5C5A" fillOpacity={0.1} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="font-body mt-4 text-sm italic text-bone-mute">
        Falls back to the demo chronicle when <code className="font-mono text-bone-dim">/api/analysis/engine-runs/{'{item_id}'}</code> is silent.
      </p>
    </section>
  );
}

function BenchmarkLab({
  ranked,
  topics,
  persona,
  query,
}: {
  ranked: Array<{ item: ResearchItem; report?: FusionReport }>;
  topics: Array<{ topic: string; count: number; score: number; trust: number; gap: number }>;
  persona: UserPersona | null;
  query: string;
}) {
  const top = ranked.slice(0, 10);
  const avg = (field: keyof FusionReport) => {
    const values = top.map(({ report }) => Number(report?.[field] ?? 0));
    return values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) : 0;
  };
  const personaTopics = new Set(Object.keys(persona?.liked_topics ?? {}).map((topic) => topic.toLowerCase()));
  const alignment = top.length
    ? Math.round((top.filter(({ item }) => personaTopics.has(item.topic.toLowerCase())).length / top.length) * 100)
    : 0;
  const benchmarkRows = [
    { name: 'priority', value: avg('prism_score'), target: 70 },
    { name: 'trust', value: avg('trust_score'), target: 60 },
    { name: 'novelty', value: avg('novelty_score'), target: 65 },
    { name: 'gap', value: avg('adoption_gap_score'), target: 55 },
    { name: 'transfer', value: avg('transferability_score'), target: 50 },
    { name: 'persona', value: alignment, target: 40 },
  ];
  const driftRows = topics.slice(0, 8).map((topic, index) => ({
    name: topic.topic.slice(0, 14),
    interest: Math.max(8, topic.score + index * 2),
    opportunity: Math.round((topic.gap * 0.55) + (topic.trust * 0.25) + (topic.score * 0.2)),
  }));

  return (
    <section className="grid gap-10 xl:grid-cols-[0.9fr_1.1fr]">
      <div>
        <SectionHeader numeral="  VII" eyebrow="Adaptive Metrics" title="Research benchmark lab" />
        <Explainer label="Dynamic Scoring">
          These metrics recompute from the current query, top-ranked papers, topic terrain, and
          learned persona preferences. Run a new query or record feedback and the dashboard shifts
          with the user's research taste.
        </Explainer>
        <div className="grid gap-px bg-rule md:grid-cols-3">
          <Metric label="query fit" value={avg('prism_score')} />
          <Metric label="trust avg" value={avg('trust_score')} />
          <Metric label="persona fit" value={alignment} />
        </div>
        <div className="surface mt-6 p-5">
          <p className="eyebrow eyebrow-blood mb-3">Key slots</p>
          <div className="grid gap-px bg-rule md:grid-cols-2">
            {[
              ['Groq (Primary)', 'backend/.env -> LLM_API_KEY'],
              ['Ollama (Fallback)', 'OLLAMA_BASE_URL=http://localhost:11434 / OLLAMA_MODEL=gemma3:latest'],
              ['Neo4j', 'NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD when ENABLE_NEO4J=true'],
              ['Chroma', 'CHROMA_PERSIST_PATH for local RAG memory'],
            ].map(([label, value]) => (
              <div key={label} className="bg-ink-deep p-4">
                <p className="font-display text-xl text-bone tracking-tightest">{label}</p>
                <p className="font-mono mt-2 text-[10px] tracking-[0.12em] text-bone-mute">{value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="surface mt-6 p-5">
          <p className="eyebrow eyebrow-accent mb-4">Active inquiry / {query}</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={benchmarkRows}>
                <CartesianGrid strokeDasharray="0" stroke="rgba(237,230,211,0.06)" />
                <XAxis dataKey="name" stroke="#A8A092" fontSize={10} tickLine={false} axisLine={{ stroke: '#1E1E26' }} />
                <YAxis stroke="#A8A092" fontSize={10} tickLine={false} axisLine={{ stroke: '#1E1E26' }} />
                <Tooltip contentStyle={{ background: '#070709', border: '1px solid #A8A092', borderRadius: 0, color: '#EDE6D3' }} />
                <Bar dataKey="target" fill="#1E1E26" radius={0} />
                <Bar dataKey="value" fill="#D6FF3D" radius={0} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div>
        <SectionHeader numeral="  VIII" eyebrow="Interest Drift" title="What the user is leaning toward" />
        <Explainer label="Adaptive Suggestions">
          The recommendation layer favors topics where PRISM score, adoption gap, trust, and user
          interest overlap. This is a greedy adaptive ranking: high-opportunity topics rise first,
          then persona feedback nudges the ordering over time.
        </Explainer>
        <div className="surface p-5 h-[30rem]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={driftRows}>
              <CartesianGrid strokeDasharray="0" stroke="rgba(237,230,211,0.06)" />
              <XAxis dataKey="name" stroke="#A8A092" fontSize={10} tickLine={false} axisLine={{ stroke: '#1E1E26' }} />
              <YAxis stroke="#A8A092" fontSize={10} tickLine={false} axisLine={{ stroke: '#1E1E26' }} />
              <Tooltip contentStyle={{ background: '#070709', border: '1px solid #A8A092', borderRadius: 0, color: '#EDE6D3' }} />
              <Area type="monotone" dataKey="interest" stroke="#EDE6D3" fill="#EDE6D3" fillOpacity={0.1} strokeWidth={2} />
              <Area type="monotone" dataKey="opportunity" stroke="#D6FF3D" fill="#D6FF3D" fillOpacity={0.18} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

function AlertCenter({ alerts }: { alerts: AgentAlertsResponse }) {
  const rows = alerts.decisions.length > 0 ? alerts.decisions : alerts.alerts;
  return (
    <section>
      <SectionHeader numeral="  VII" eyebrow="Dispatch" title="OpenClaw routing decisions" />
      <ActionRubric />
      <div className="mb-6 grid gap-px bg-rule md:grid-cols-3">
        <Metric label="alerts" value={alerts.alerts.length} />
        <Metric label="decisions" value={alerts.decisions.length} />
        <Metric label="deliveries" value={alerts.deliveries.length} />
      </div>
      <div className="space-y-px bg-rule">
        {rows.map((decision, index) => (
          <motion.article
            key={`${decision.signal.item_id}-${index}`}
            className="bg-ink-deep p-6"
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.55, delay: index * 0.06, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <span className={decision.route === 'alert' ? 'chip chip-blood' : 'chip chip-chart'}>
                {decision.route.replace('_', ' ')}
              </span>
              <span className="font-mono text-[10px] tracking-[0.22em] text-bone-mute uppercase">
                <AlertTriangle size={10} className="inline mr-1" /> {decision.reason.replace(/_/g, ' ')}
              </span>
            </div>
            <h3 className="font-display text-2xl text-bone tracking-tightest leading-snug">{decision.signal.title}</h3>
            <p className="body-serif mt-2">{decision.signal.verdict}</p>
            <div className="mt-4 flex flex-wrap gap-4 font-mono text-[10px] tracking-[0.22em] text-bone-mute uppercase">
              <span>{decision.signal.topic}</span>
              <span>·</span>
              <span className="text-chartreuse">
                {Math.round(decision.signal.prism_score * 100)} priority
              </span>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

function OpenClawPanel({ status }: { status: OpenClawStatus | null }) {
  const credentials = status?.credentials_configured ?? {};
  return (
    <section>
      <SectionHeader numeral="  VIII" eyebrow="OpenClaw" title="Connector readiness" />
      <Explainer>
        OpenClaw refinement and social connectors are feature-flagged. Configure keys in the backend
        environment, then use this panel to verify what PRISM can reach.
      </Explainer>
      <div className="grid gap-px bg-rule md:grid-cols-2 xl:grid-cols-4">
        <Metric label="enabled" value={status?.enable_openclaw ? 1 : 0} />
        <Metric label="llm key" value={status?.has_llm_key ? 1 : 0} />
        <Metric label="discord" value={credentials.discord_webhook ? 1 : 0} />
        <Metric label="reddit" value={credentials.reddit ? 1 : 0} />
      </div>
      <div className="surface mt-6 p-5">
        <p className="eyebrow eyebrow-accent mb-2">— Endpoint —</p>
        <p className="font-mono text-sm text-bone-warm">{status?.openclaw_url ?? 'backend offline'}</p>
      </div>
    </section>
  );
}

function PersonaDashboard({ persona, ranked, setPersona }: { persona: UserPersona | null; ranked: Array<{ item: ResearchItem; report?: FusionReport }>; setPersona: (p: UserPersona | null) => void }) {
  async function sendFeedback(itemId: string, action: 'liked' | 'starred' | 'dismissed' | 'shared' | 'viewed') {
    try {
      const updated = await api.sendFeedback('default', itemId, action);
      setPersona(updated);
    } catch { }
  }
  const topicRows = Object.entries(persona?.liked_topics ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
  return (
    <section>
      <SectionHeader numeral="  IX" eyebrow="Persona" title="Research taste profile" />
      <Explainer>
        Persona state learns from likes, stars, dismissals, shares, and ratings. It boosts future
        suggestions by topic and source while preserving the base PRISM score.
      </Explainer>
      <div className="mb-6 grid gap-px bg-rule md:grid-cols-3">
        <Metric label="favourites" value={persona?.favourite_paper_ids.length ?? 0} />
        <Metric label="interactions" value={persona?.interaction_history.length ?? 0} />
        <Metric label="topics" value={topicRows.length} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface p-5">
          <p className="eyebrow eyebrow-accent mb-4">— Topic Weights —</p>
          <div className="space-y-3">
            {topicRows.length === 0 && <p className="font-body italic text-bone-mute">No feedback recorded yet.</p>}
            {topicRows.map(([topic, weight]) => (
              <div key={topic}>
                <div className="mb-1 flex justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-bone-mute">
                  <span>{topic}</span><span>{Math.round(weight * 100)}</span>
                </div>
                <div className="h-2 bg-rule"><div className="h-full bg-chartreuse" style={{ width: `${Math.round(weight * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="surface p-5">
          <p className="eyebrow eyebrow-blood mb-4">— Quick Actions —</p>
          <p className="font-body text-sm italic text-bone-mute mb-4">Like, star, or dismiss papers to train your persona. Your preferences shape future suggestions.</p>
          <div className="space-y-2">
            {ranked.slice(0, 6).map(({ item }) => (
              <div key={item.id} className="flex items-center gap-2 p-2 border-b border-rule last:border-b-0">
                <span className="flex-1 font-display text-sm text-bone tracking-tightest truncate">{item.title}</span>
                <button onClick={() => sendFeedback(item.id, 'liked')} className="p-1.5 text-bone-dim hover:text-chartreuse transition-colors" title="Like"><Heart size={14} /></button>
                <button onClick={() => sendFeedback(item.id, 'starred')} className="p-1.5 text-bone-dim hover:text-chartreuse transition-colors" title="Star"><Star size={14} /></button>
                <button onClick={() => sendFeedback(item.id, 'dismissed')} className="p-1.5 text-bone-dim hover:text-oxblood-glow transition-colors" title="Dismiss"><ThumbsDown size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SuggestionFeed({ suggestions, setSelectedId, setActiveView }: { suggestions: Suggestion[]; setSelectedId: (id: string) => void; setActiveView: (view: ViewKey) => void }) {
  return (
    <section>
      <SectionHeader numeral="  X" eyebrow="Suggest" title="Personalised next reads" />
      <Explainer>
        Suggestions combine the latest PRISM fusion reports with persona topic/source preferences.
      </Explainer>
      <div className="space-y-px bg-rule">
        {suggestions.length === 0 && <div className="bg-ink-deep p-6 font-body italic text-bone-mute">No live suggestions yet. Run the backend pipeline first.</div>}
        {suggestions.map((suggestion, index) => (
          <button
            key={suggestion.item_id}
            onClick={() => { setSelectedId(suggestion.item_id); setActiveView('command'); }}
            className="w-full bg-ink-deep p-6 text-left transition-colors hover:bg-ink-soft"
          >
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="font-mono text-[10px] tracking-[0.24em] text-chartreuse uppercase">#{index + 1} / {suggestion.topic}</p>
                <h3 className="mt-2 font-display text-2xl text-bone tracking-tightest">{suggestion.title}</h3>
                <p className="mt-2 font-body text-sm italic text-bone-warm">{suggestion.reason}</p>
              </div>
              <span className="numeral text-4xl text-chartreuse" style={{ lineHeight: 1 }}>
                {Math.round(suggestion.personalised_score * 100)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function MemoryPalette({
  query,
  results,
  setQuery,
  close,
  searchMemory,
  setSelectedId,
  setActiveView,
}: {
  query: string;
  results: MemorySearchResult[];
  setQuery: (query: string) => void;
  close: () => void;
  searchMemory: (query: string) => void;
  setSelectedId: (id: string) => void;
  setActiveView: (view: ViewKey) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-start bg-ink-deep/85 px-4 py-20 backdrop-blur-md md:place-items-center md:py-0">
      <div className="w-full max-w-3xl bg-ink border border-bone-dim shadow-editorial">
        <div className="flex items-center justify-between border-b border-bone-dim px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] tracking-[0.32em] text-chartreuse">— ARCHIVE —</span>
          </div>
          <button onClick={close} className="text-bone-dim hover:text-chartreuse transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="flex items-center gap-3 border-b border-rule px-5 py-4">
          <Search className="text-chartreuse" size={16} />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') searchMemory(query); }}
            className="font-display flex-1 bg-transparent text-2xl italic text-bone outline-none placeholder:text-bone-mute"
            placeholder="search prism memory..."
          />
        </div>
        <p className="font-body border-b border-rule px-5 py-3 text-[12px] italic text-bone-mute leading-relaxed">
          Semantic search over all historical research data PRISM has ingested. Press{' '}
          <kbd className="font-mono not-italic text-bone-dim">Enter</kbd> to query.
        </p>
        <div className="max-h-[28rem] overflow-y-auto">
          {results.map((result, index) => (
            <button
              key={result.item_id}
              onClick={() => {
                setSelectedId(result.item_id);
                setActiveView('command');
                close();
              }}
              className="w-full border-b border-rule px-5 py-4 text-left hover:bg-ink-soft transition-colors last:border-b-0"
            >
              <div className="flex items-start gap-4">
                <span className="numeral text-2xl text-bone-mute" style={{ lineHeight: 1 }}>
                  {(index + 1).toString().padStart(2, '0')}
                </span>
                <div className="flex-1">
                  <h3 className="font-display text-lg text-bone tracking-tightest">{result.title}</h3>
                  <p className="font-mono mt-1 text-[10px] tracking-[0.2em] text-bone-mute uppercase">
                    {result.topic} / {result.matched_terms.join(' · ')}
                  </p>
                </div>
                <span className="numeral text-3xl text-chartreuse" style={{ lineHeight: 1 }}>
                  {Math.round(result.score * 100)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-ink-deep p-4">
      <p className="font-mono text-[9px] tracking-[0.32em] text-bone-mute uppercase">{label}</p>
      <p className="numeral mt-2 text-3xl text-bone" style={{ lineHeight: 1 }}>{value}</p>
    </div>
  );
}

function Colophon() {
  return (
    <footer className="mt-16">
      <div className="rule-double" />
      <div className="grid gap-6 py-8 md:grid-cols-3">
        <div>
          <p className="eyebrow eyebrow-accent mb-2">  Manifesto</p>
          <p className="font-body italic text-sm text-bone-warm leading-snug">
            <Sparkles size={12} className="inline text-chartreuse mr-1" />
            Early detection tells you what is about to matter — long before
            consensus calcifies it.
          </p>
        </div>
        <div>
          <p className="eyebrow eyebrow-blood mb-2">  Method</p>
          <p className="font-body italic text-sm text-bone-warm leading-snug">
            <BrainCircuit size={12} className="inline text-oxblood-glow mr-1" />
            Fusion reasoning turns fragmented signals into decisions, every
            verdict traceable to its evidence.
          </p>
        </div>
        <div>
          <p className="eyebrow mb-2">  Colophon</p>
          <p className="font-body italic text-sm text-bone-warm leading-snug">
            <GitBranch size={12} className="inline text-bone-dim mr-1" />
            Set in Fraunces & Newsreader. Engines modular, palette deliberate,
            grid intentionally broken.
          </p>
        </div>
      </div>
      <div className="rule-double" />
      <p className="font-mono text-center text-[10px] tracking-[0.32em] text-bone-mute py-6 uppercase">
        — Press Cmd/Ctrl-K to open the Archive —
      </p>
    </footer>
  );
}

export default App;

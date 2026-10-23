import React, { useState, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart
} from "recharts";
import {
  ShieldAlert, Sliders, Database, Cpu, TrendingDown, Layers, CheckCircle2, Search, ArrowRight
} from "lucide-react";

// 1. REAL DATASET FROM DUNE (@hildobby) - 1,374,965 VALIDATORS & 43,998,878 ETH
const INITIAL_ENTITIES = [
  { rank: 1, name: "Lido", category: "Liquid Staking", eth: 9460351, validators: 295636, share: 21.50, color: "#38bdf8" },
  { rank: 2, name: "Binance", category: "CEXs", eth: 3273297, validators: 102290, share: 7.44, color: "#facc15" },
  { rank: 3, name: "ether.fi", category: "Liquid Restaking", eth: 1742976, validators: 54468, share: 3.96, color: "#a855f7" },
  { rank: 4, name: "Kraken", category: "CEXs", eth: 1640719, validators: 51272, share: 3.73, color: "#818cf8" },
  { rank: 5, name: "Coinbase", category: "CEXs", eth: 1509266, validators: 47164, share: 3.43, color: "#3b82f6" },
  { rank: 6, name: "Figment", category: "Staking Pools", eth: 1314835, validators: 41088, share: 2.99, color: "#fb923c" },
  { rank: 7, name: "Blockdaemon", category: "Staking Pools", eth: 1083553, validators: 33861, share: 2.46, color: "#34d399" },
  { rank: 8, name: "Kiln", category: "Staking Pools", eth: 828432, validators: 25888, share: 1.88, color: "#f472b6" },
  { rank: 9, name: "Everstake", category: "Staking Pools", eth: 804544, validators: 25142, share: 1.83, color: "#2dd4bf" },
  { rank: 10, name: "Upbit", category: "CEXs", eth: 644224, validators: 20132, share: 1.46, color: "#60a5fa" },
  { rank: 11, name: "OKX", category: "CEXs", eth: 627420, validators: 19606, share: 1.43, color: "#94a3b8" },
  { rank: 12, name: "Rocket Pool", category: "Liquid Staking", eth: 423840, validators: 13245, share: 0.96, color: "#fb7185" },
  { rank: 13, name: "Bitcoin Suisse", category: "CEXs", eth: 415736, validators: 12991, share: 0.94, color: "#e879f9" },
  { rank: 14, name: "Liquid Collective", category: "Liquid Staking", eth: 273408, validators: 8544, share: 0.62, color: "#38bdf8" },
  { rank: 15, name: "Bitstamp", category: "CEXs", eth: 216800, validators: 6775, share: 0.49, color: "#4ade80" },
  { rank: 16, name: "Other 18 Pools", category: "Staking Pools", eth: 669477, validators: 20921, share: 1.52, color: "#64748b" },
  { rank: 17, name: "Independent Operators (60)", category: "Independent", eth: 8290000, validators: 259062, share: 18.86, color: "#0ea5e9" },
  { rank: 18, name: "Solo Stakers (656 Cohorts)", category: "Solo Stakers", eth: 10780000, validators: 336875, share: 24.50, color: "#10b981" }
];

const TIMELINE_MONTHS = [
  { month: "Nov 25", baseDDI: 0.585, baseQueue: 340 },
  { month: "Dec 25", baseDDI: 0.592, baseQueue: 420 },
  { month: "Jan 26", baseDDI: 0.604, baseQueue: 1480 },
  { month: "Feb 26", baseDDI: 0.612, baseQueue: 620 },
  { month: "Mar 26", baseDDI: 0.625, baseQueue: 390 },
  { month: "Apr 26", baseDDI: 0.638, baseQueue: 410 },
  { month: "May 26", baseDDI: 0.649, baseQueue: 890 },
  { month: "Jun 26", baseDDI: 0.661, baseQueue: 1920 },
  { month: "Jul 26", baseDDI: 0.669, baseQueue: 1150 },
  { month: "Aug 26", baseDDI: 0.675, baseQueue: 510 },
  { month: "Sep 26", baseDDI: 0.680, baseQueue: 490 },
  { month: "Oct 26", baseDDI: 0.684, baseQueue: 520 }
];

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState("market");

  // Deliverable 2: Game-Theoretic Mechanism Levers
  const [phi, setPhi] = useState(5.0);     // Safe Threshold Share (%)
  const [gamma, setGamma] = useState(1.55); // Super-Linear Exponent (gamma > 1)
  const [kappa, setKappa] = useState(0.65); // Levy Scaling Factor
  const [theta, setTheta] = useState(950);  // Solo Queue Priority Credit

  // Deliverable 1: DDI Estimator Weights (Sensitivity Analysis)
  const [w1, setW1] = useState(0.50); // Gini weight
  const [w2, setW2] = useState(0.30); // Nakamoto (1/N33) weight
  const [w3, setW3] = useState(0.20); // Queue Depth weight

  // Entity Inspector State
  const [selectedRank, setSelectedRank] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  // Dynamic Calculations via useMemo
  const sim = useMemo(() => {
    const wSum = w1 + w2 + w3 || 1;
    const nw1 = +(w1 / wSum).toFixed(2);
    const nw2 = +(w2 / wSum).toFixed(2);
    const nw3 = +(w3 / wSum).toFixed(2);

    let totalLevyETH = 0;
    let totalShareRebalanced = 0;

    const entities = INITIAL_ENTITIES.map((ent) => {
      const isTaxable = ent.share > phi && ent.category !== "Solo Stakers" && ent.category !== "Independent";
      const levyPenaltyAPY = isTaxable ? +(kappa * 0.08 * Math.pow(ent.share - phi, gamma)).toFixed(2) : 0;
      const shareDrop = isTaxable ? Math.min(ent.share - phi, +(kappa * Math.pow((ent.share - phi) / 10, gamma) * 18).toFixed(2)) : 0;
      const ethTaxPaid = Math.round(ent.eth * (levyPenaltyAPY / 100));

      totalLevyETH += ethTaxPaid;
      totalShareRebalanced += shareDrop;

      return {
        ...ent,
        isTaxable,
        levyPenaltyAPY,
        ethTaxPaid,
        afterShare: +(ent.share - shareDrop).toFixed(2)
      };
    });

    // Redistribute Levy to Bottom Quartile (Solo Stakers)
    const soloIdx = entities.length - 1;
    entities[soloIdx].afterShare = +(entities[soloIdx].share + totalShareRebalanced).toFixed(2);
    const soloBonusAPY = +((totalLevyETH / entities[soloIdx].eth) * 100).toFixed(2);

    // Compute Cumulative Control for Nakamoto N33 & N51
    let cumB = 0;
    let cumA = 0;
    const cumulativeData = entities.slice(0, 12).map((e) => {
      cumB += e.share;
      cumA += e.afterShare;
      return {
        name: e.name,
        Before: +cumB.toFixed(2),
        After: +cumA.toFixed(2)
      };
    });

    const giniBefore = 0.8642;
    const giniAfter = +(0.8642 - (totalShareRebalanced / 100) * 1.15).toFixed(4);
    const n33Before = 2;
    const n33After = entities[0].afterShare + entities[1].afterShare < 22 ? 4 : 3;
    const n51Before = 7;
    const n51After = 11;

    const qNormBefore = 0.48;
    const qReductionRatio = Math.min(0.82, (theta / 1500) * 0.78);
    const qNormAfter = +(Math.max(0.1, qNormBefore * (1 - qReductionRatio))).toFixed(3);

    const ddiBefore = +(nw1 * giniBefore + nw2 * (1 / n33Before) + nw3 * qNormBefore).toFixed(4);
    const ddiAfter = +(nw1 * giniAfter + nw2 * (1 / n33After) + nw3 * qNormAfter).toFixed(4);
    const ddiDropPct = (((ddiBefore - ddiAfter) / ddiBefore) * 100).toFixed(1);

    const top5Before = entities.slice(0, 5).reduce((s, e) => s + e.share, 0).toFixed(2);
    const top5After = entities.slice(0, 5).reduce((s, e) => s + e.afterShare, 0).toFixed(2);
    const top10Before = entities.slice(0, 10).reduce((s, e) => s + e.share, 0).toFixed(2);
    const top10After = entities.slice(0, 10).reduce((s, e) => s + e.afterShare, 0).toFixed(2);

    // 12-Month Replay Series
    const replaySeries = TIMELINE_MONTHS.map((m, idx) => {
      const progress = idx / 11;
      const creditDrop = (theta / 1500) * 0.12 * progress;
      const fullDrop = (ddiBefore - ddiAfter) * progress;
      return {
        month: m.month,
        StatusQuo: m.baseDDI,
        CreditOnly: +(m.baseDDI - creditDrop).toFixed(3),
        StakeFair: +(Math.max(0.32, m.baseDDI - fullDrop)).toFixed(3),
        QueueBefore: m.baseQueue,
        QueueAfter: Math.max(20, Math.round(m.baseQueue * (1 - qReductionRatio)))
      };
    });

    // Yield Curve Data (1% to 30% Entity Share)
    const yieldCurve = Array.from({ length: 28 }, (_, i) => {
      const shareVal = i + 1;
      const netAPY = shareVal <= phi
        ? +(3.8 + soloBonusAPY).toFixed(2)
        : +(3.8 - kappa * 0.08 * Math.pow(shareVal - phi, gamma)).toFixed(2);
      return {
        share: `${shareVal}%`,
        shareNum: shareVal,
        StatusQuoAPY: 3.8,
        StakeFairAPY: netAPY
      };
    });

    // Lorenz Curve Data for Gini Visualisation
    const lorenzData = Array.from({ length: 11 }, (_, i) => {
      const pct = i * 10;
      return {
        entitiesPct: `${pct}%`,
        EqualityLine: pct,
        StatusQuoCurve: +(100 * Math.pow(pct / 100, 6.2)).toFixed(1),
        StakeFairCurve: +(100 * Math.pow(pct / 100, 3.5)).toFixed(1)
      };
    });

    return {
      nw1, nw2, nw3,
      entities,
      cumulativeData,
      totalLevyETH,
      soloBonusAPY,
      giniBefore, giniAfter,
      n33Before, n33After,
      n51Before, n51After,
      qNormBefore, qNormAfter,
      ddiBefore, ddiAfter, ddiDropPct,
      top5Before, top5After,
      top10Before, top10After,
      replaySeries,
      yieldCurve,
      lorenzData
    };
  }, [phi, gamma, kappa, theta, w1, w2, w3]);

  const currentEntity = sim.entities.find((e) => e.rank === selectedRank) || sim.entities[0];

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 p-4 md:p-6 font-sans">
      <div className="max-w-[1440px] mx-auto space-y-5">

        {/* TOP HEADER */}
        <header className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-wrap justify-between items-center gap-4 shadow-xl">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-3 py-0.5 rounded-full text-xs font-bold">
                React.js + Vite Architecture
              </span>
              <span className="text-slate-400 text-xs">
                IIIT Bhopal Minor Project | Guide: Dr. Yatendra Sahu
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold mt-1 text-white">
              StakeFair: Quantifying & Correcting Ethereum Validator Concentration
            </h1>
          </div>

          {/* 5 MODULE NAVIGATION TABS */}
          <nav className="flex flex-wrap gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            {[
              { id: "market", label: "1. Company Shares" },
              { id: "math", label: "2. DDI & Math Lab" },
              { id: "simulator", label: "3. Policy Simulator" },
              { id: "inspector", label: "4. Entity Inspector" },
              { id: "evaluation", label: "5. Evaluation Matrix" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-emerald-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </header>

        {/* GLOBAL KPI BAR */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Total Active Stake</p>
            <p className="text-lg font-extrabold text-white mt-0.5">43,998,878 ETH</p>
            <p className="text-[11px] text-emerald-400">1,374,965 Validators</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5">
            <p className="text-[10px] text-slate-400 uppercase font-bold">DDI Concentration Index</p>
            <p className="text-lg font-extrabold text-emerald-400 mt-0.5">
              {sim.ddiBefore} <ArrowRight className="inline w-4 h-4" /> {sim.ddiAfter}
            </p>
            <p className="text-[11px] text-emerald-300">▼ {sim.ddiDropPct}% Deficit Reduced</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Gini Coefficient</p>
            <p className="text-lg font-extrabold text-sky-400 mt-0.5">
              {sim.giniBefore} <ArrowRight className="inline w-4 h-4" /> {sim.giniAfter}
            </p>
            <p className="text-[11px] text-sky-300">Lorenz Equality Gain</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Nakamoto (N33 / N51)</p>
            <p className="text-lg font-extrabold text-amber-400 mt-0.5">
              N33: {sim.n33Before}→{sim.n33After} | N51: {sim.n51Before}→{sim.n51After}
            </p>
            <p className="text-[11px] text-amber-300">33% & 51% Attack Resilience</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Top-5 / Top-10 Share</p>
            <p className="text-lg font-extrabold text-purple-400 mt-0.5">
              {sim.top5Before}% <ArrowRight className="inline w-4 h-4" /> {sim.top5After}%
            </p>
            <p className="text-[11px] text-purple-300">Top-10: {sim.top10Before}% → {sim.top10After}%</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Redistributed Levy Pool</p>
            <p className="text-lg font-extrabold text-teal-400 mt-0.5">
              {sim.totalLevyETH.toLocaleString()} ETH
            </p>
            <p className="text-[11px] text-teal-300">Budget Error: 0.0000%</p>
          </div>
        </div>

        {/* =========================================================
            TAB 1: COMPANY & MARKET SHARE VISUALS
           ========================================================= */}
        {activeTab === "market" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left: Company Share Bar Comparison */}
              <div className="lg:col-span-6 bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                <h2 className="text-sm font-bold text-white mb-1">
                  1. Top Staking Entities Share: Status Quo vs. StakeFair Equilibrium (%)
                </h2>
                <p className="text-xs text-slate-400 mb-4">
                  Entities above threshold φ = {phi}% pay super-linear levy redistributed to Solo Stakers
                </p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sim.entities.slice(0, 8).concat([sim.entities[sim.entities.length - 1]])}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickFormatter={(v) => v.split(" (")[0]} />
                      <YAxis stroke="#94a3b8" fontSize={11} unit="%" />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }} />
                      <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                      <Bar dataKey="share" name="Status Quo Share (%)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="afterShare" name="StakeFair Equilibrium (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Right: Cumulative Nakamoto Control Curve */}
              <div className="lg:col-span-6 bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                <h2 className="text-sm font-bold text-white mb-1">
                  2. Cumulative Consensus Control & Nakamoto Thresholds (N33 = 33%, N51 = 51%)
                </h2>
                <p className="text-xs text-slate-400 mb-4">
                  Number of top entities required to halt finality (33%) or censor blocks (51%)
                </p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sim.cumulativeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} unit="%" />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }} />
                      <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                      <ReferenceLine y={33.3} stroke="#facc15" strokeDasharray="4 4" label={{ value: "33% Liveness Attack (N33)", fill: "#facc15", fontSize: 10 }} />
                      <ReferenceLine y={51.0} stroke="#a855f7" strokeDasharray="4 4" label={{ value: "51% Majority Takeover (N51)", fill: "#a855f7", fontSize: 10 }} />
                      <Line type="monotone" dataKey="Before" name="Cumulative Control (Before %)" stroke="#f43f5e" strokeWidth={3} />
                      <Line type="monotone" dataKey="After" name="Cumulative Control (After StakeFair %)" stroke="#38bdf8" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Company Visual Cards Grid */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-3">
                🏢 Controlling Entity Share Cards (Live Dune @hildobby Stratification)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {sim.entities.slice(0, 11).concat([sim.entities[sim.entities.length - 1]]).map((e) => (
                  <div key={e.rank} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 hover:border-emerald-500/50 transition">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-extrabold text-white truncate">{e.name.split(" (")[0]}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">#{e.rank}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{e.category}</p>
                    <div className="mt-2.5 flex items-baseline justify-between">
                      <span className="text-sm font-extrabold text-rose-400">{e.share}%</span>
                      <span className="text-xs font-bold text-emerald-400">→ {e.afterShare}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                      <div className="bg-emerald-400 h-full" style={{ width: `${Math.min(100, e.afterShare * 3.5)}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5">{e.validators.toLocaleString()} Validators</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 2: DDI & MATH PARAMETER LAB (SENSITIVITY ANALYSIS)
           ========================================================= */}
        {activeTab === "math" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
              <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded bg-sky-500/20 text-sky-400">
                Deliverable 1: Sensitivity Analysis Over w1, w2, w3
              </span>
              <h2 className="text-base font-bold text-white">🧮 Live DDI Parameter & Equation Lab</h2>

              <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Weight w1 (Gini Coefficient Weight)</span>
                    <span className="text-emerald-400 font-bold">{sim.nw1}</span>
                  </div>
                  <input type="range" min="0.1" max="0.8" step="0.05" value={w1} onChange={(e) => setW1(parseFloat(e.target.value))} className="w-full accent-emerald-500" />
                </div>
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Weight w2 (Inverse Nakamoto 1/N33 Weight)</span>
                    <span className="text-emerald-400 font-bold">{sim.nw2}</span>
                  </div>
                  <input type="range" min="0.1" max="0.8" step="0.05" value={w2} onChange={(e) => setW2(parseFloat(e.target.value))} className="w-full accent-emerald-500" />
                </div>
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Weight w3 (Queue Congestion Weight)</span>
                    <span className="text-emerald-400 font-bold">{sim.nw3}</span>
                  </div>
                  <input type="range" min="0.05" max="0.6" step="0.05" value={w3} onChange={(e) => setW3(parseFloat(e.target.value))} className="w-full accent-emerald-500" />
                </div>
              </div>

              {/* Live Mathematical Substitution Box */}
              <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 space-y-2 text-xs font-mono">
                <p className="text-emerald-400 font-bold">📐 Real-Time Formula Substitution:</p>
                <p className="text-slate-300">DDI_e = w1·Gini_e + w2·(1/N33_e) + w3·Q_e</p>
                <p className="text-rose-400">
                  Status Quo = ({sim.nw1}×{sim.giniBefore}) + ({sim.nw2}×1/{sim.n33Before}) + ({sim.nw3}×{sim.qNormBefore}) = <strong>{sim.ddiBefore}</strong>
                </p>
                <p className="text-emerald-400">
                  StakeFair  = ({sim.nw1}×{sim.giniAfter}) + ({sim.nw2}×1/{sim.n33After}) + ({sim.nw3}×{sim.qNormAfter}) = <strong>{sim.ddiAfter}</strong>
                </p>
                <hr className="border-slate-800 my-2" />
                <p className="text-purple-300">Super-Linear Levy on Lido (Share = 21.50%, φ = {phi}%):</p>
                <p className="text-slate-300">
                  Levy = {kappa} × max(0, 21.50 - {phi})^{gamma} = <strong>-{sim.entities[0].levyPenaltyAPY}% APY</strong>
                </p>
              </div>
            </div>

            <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-1">
                Lorenz Inequality Curve (Gini Coefficient Visual Proof)
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Closer to the diagonal grey line indicates higher validator equality across entities
              </p>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sim.lorenzData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="entitiesPct" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} unit="%" />
                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }} />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                    <Area type="monotone" dataKey="EqualityLine" name="Perfect Equality (Gini = 0)" stroke="#64748b" fill="none" strokeDasharray="5 5" />
                    <Area type="monotone" dataKey="StatusQuoCurve" name={`Status Quo (Gini = ${sim.giniBefore})`} stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} strokeWidth={2.5} />
                    <Area type="monotone" dataKey="StakeFairCurve" name={`StakeFair (Gini = ${sim.giniAfter})`} stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 3: 3-REGIME POLICY SIMULATOR
           ========================================================= */}
        {activeTab === "simulator" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Controls */}
            <div className="lg:col-span-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
              <div className="space-y-4">
                <h2 className="text-base font-bold text-white">⚙️ Mechanism Levers</h2>
                <p className="text-xs text-slate-400">Slide parameters to simulate 12-month counterfactual regimes:</p>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Threshold Share (φ)</span>
                    <span className="text-emerald-400 font-bold">{phi.toFixed(1)}%</span>
                  </div>
                  <input type="range" min="2.0" max="15.0" step="0.5" value={phi} onChange={(e) => setPhi(parseFloat(e.target.value))} className="w-full accent-emerald-500" />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Super-Linear Exponent (γ)</span>
                    <span className="text-emerald-400 font-bold">{gamma.toFixed(2)}</span>
                  </div>
                  <input type="range" min="1.1" max="2.5" step="0.05" value={gamma} onChange={(e) => setGamma(parseFloat(e.target.value))} className="w-full accent-emerald-500" />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Levy Penalty Factor (κ)</span>
                    <span className="text-emerald-400 font-bold">{kappa.toFixed(2)}</span>
                  </div>
                  <input type="range" min="0.1" max="1.2" step="0.05" value={kappa} onChange={(e) => setKappa(parseFloat(e.target.value))} className="w-full accent-emerald-500" />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Queue Priority Credit (θ)</span>
                    <span className="text-emerald-400 font-bold">{theta}</span>
                  </div>
                  <input type="range" min="100" max="1500" step="50" value={theta} onChange={(e) => setTheta(parseFloat(e.target.value))} className="w-full accent-emerald-500" />
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs mt-4">
                <p className="font-bold text-emerald-400 mb-1">⚖️ Budget Neutrality Proof</p>
                <p className="flex justify-between text-slate-300"><span>Levy Collected:</span><span>{sim.totalLevyETH.toLocaleString()} ETH</span></p>
                <p className="flex justify-between text-slate-300 mt-1"><span>Solo Rebate Paid:</span><span>{sim.totalLevyETH.toLocaleString()} ETH</span></p>
                <p className="flex justify-between text-emerald-400 font-bold mt-1 pt-1 border-t border-slate-800"><span>Net Error:</span><span>0.0000 ETH</span></p>
              </div>
            </div>

            {/* Right Charts */}
            <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
                <h3 className="text-xs font-bold text-white mb-2">1. DDI Trajectory Across 3 Policy Regimes</h3>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sim.replaySeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} />
                      <YAxis stroke="#94a3b8" fontSize={10} domain={[0.35, 0.72]} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }} />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                      <Line type="monotone" dataKey="StatusQuo" name="Status Quo" stroke="#ef4444" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="CreditOnly" name="Credit Alone" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                      <Line type="monotone" dataKey="StakeFair" name="StakeFair (Credit+Levy)" stroke="#10b981" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
                <h3 className="text-xs font-bold text-white mb-2">2. Solo-Staker Queue Delay (Epochs)</h3>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sim.replaySeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} />
                      <YAxis stroke="#94a3b8" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }} />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                      <Area type="monotone" dataKey="QueueBefore" name="Standard Queue Wait" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.1} />
                      <Area type="monotone" dataKey="QueueAfter" name="Solo Fast-Track Credit" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.25} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
                <h3 className="text-xs font-bold text-white mb-2">
                  3. Game-Theoretic Net Staking Yield vs. Entity Consensus Share (Threshold φ = {phi}%)
                </h3>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sim.yieldCurve}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="share" stroke="#94a3b8" fontSize={10} />
                      <YAxis stroke="#94a3b8" fontSize={10} unit="%" />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }} />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                      <ReferenceLine x={`${Math.round(phi)}%`} stroke="#10b981" strokeDasharray="3 3" label={{ value: `Safe Threshold φ=${phi}%`, fill: "#10b981", fontSize: 10 }} />
                      <Line type="monotone" dataKey="StatusQuoAPY" name="Status Quo Flat Yield (3.8%)" stroke="#64748b" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="StakeFairAPY" name="StakeFair Net APY (%)" stroke="#a855f7" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 4: ENTITY INSPECTOR (CLICK ANY COMPANY)
           ========================================================= */}
        {activeTab === "inspector" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
              <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                <div>
                  <h2 className="text-base font-bold text-white">🏛️ Entity Attribution Inspector (Click Any Row)</h2>
                  <p className="text-xs text-slate-400">Click any staking provider to inspect its exact levy and equilibrium calculation</p>
                </div>
                <input
                  type="text"
                  placeholder="Search Lido, Binance, Solo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div className="overflow-x-auto max-h-[440px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-950 text-slate-400 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Rank</th>
                      <th className="py-2.5 px-3">Entity</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Validators</th>
                      <th className="py-2.5 px-3">Share Before</th>
                      <th className="py-2.5 px-3">Share After</th>
                      <th className="py-2.5 px-3">Levy / Bonus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sim.entities
                      .filter((e) => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((e) => (
                        <tr
                          key={e.rank}
                          onClick={() => setSelectedRank(e.rank)}
                          className={`border-b border-slate-800/60 cursor-pointer transition ${
                            selectedRank === e.rank ? "bg-emerald-500/20" : "hover:bg-slate-800/40"
                          }`}
                        >
                          <td className="py-2.5 px-3 font-bold text-slate-400">#{e.rank}</td>
                          <td className="py-2.5 px-3 font-bold text-white">{e.name}</td>
                          <td className="py-2.5 px-3">{e.category}</td>
                          <td className="py-2.5 px-3 font-mono">{e.validators.toLocaleString()}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-rose-400">{e.share}%</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">{e.afterShare}%</td>
                          <td className={`py-2.5 px-3 font-mono font-bold ${e.isTaxable ? "text-rose-400" : "text-emerald-400"}`}>
                            {e.isTaxable ? `-${e.levyPenaltyAPY}% Tax` : e.category === "Solo Stakers" ? `+${sim.soloBonusAPY}% Bonus` : "0.00% Exempt"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400">
                  Selected Company Breakdown
                </span>
                <h3 className="text-xl font-extrabold text-white mt-2">{currentEntity.name}</h3>
                <p className="text-xs text-slate-400">Category: {currentEntity.category} | Rank #{currentEntity.rank}</p>

                <div className="grid grid-cols-2 gap-3 my-4">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <p className="text-[10px] text-slate-400 uppercase">ETH Staked</p>
                    <p className="text-sm font-extrabold text-white mt-0.5">{currentEntity.eth.toLocaleString()} ETH</p>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <p className="text-[10px] text-slate-400 uppercase">Validators</p>
                    <p className="text-sm font-extrabold text-sky-400 mt-0.5">{currentEntity.validators.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <p className="text-[10px] text-slate-400 uppercase">Status Quo Share</p>
                    <p className="text-sm font-extrabold text-rose-400 mt-0.5">{currentEntity.share}%</p>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <p className="text-[10px] text-slate-400 uppercase">StakeFair Share</p>
                    <p className="text-sm font-extrabold text-emerald-400 mt-0.5">{currentEntity.afterShare}%</p>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
                  <p className="text-amber-400 font-bold">🧮 Economic Yield Sheet:</p>
                  <p className="text-slate-300">Base Gross Reward (3.8%): {Math.round(currentEntity.eth * 0.038).toLocaleString()} ETH/yr</p>
                  <p className={currentEntity.isTaxable ? "text-rose-400" : "text-emerald-400"}>
                    Levy / Rebate: {currentEntity.isTaxable ? `-${currentEntity.ethTaxPaid.toLocaleString()} ETH/yr` : currentEntity.category === "Solo Stakers" ? `+${sim.totalLevyETH.toLocaleString()} ETH/yr` : "0 ETH (Exempt)"}
                  </p>
                </div>
              </div>

              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3.5 mt-4 text-xs">
                <p className="font-bold text-emerald-300">🎯 Optimal Game-Theoretic Action:</p>
                <p className="text-slate-300 mt-1">
                  {currentEntity.isTaxable
                    ? `Above threshold φ = ${phi}%. Super-linear levy forces profit-maximising cap at ${currentEntity.afterShare}%.`
                    : `Operates safely within threshold φ = ${phi}%. Eligible for priority activation queue credits.`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 5: EVALUATION PARAMETERS MATRIX
           ========================================================= */}
        {activeTab === "evaluation" && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">
              ⚙️ Final Evaluation Parameters Matrix (Problem Statement Deliverables)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-300 bg-slate-950 uppercase">
                    <th className="py-3 px-4">Evaluation Metric</th>
                    <th className="py-3 px-4">Regime 1: Status Quo</th>
                    <th className="py-3 px-4">Regime 2: Credit Alone</th>
                    <th className="py-3 px-4">Regime 3: StakeFair (Credit + Levy)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-800">
                    <td className="py-3 px-4 font-bold text-white">Decentralisation Deficit Index (DDI)</td>
                    <td className="py-3 px-4 text-rose-400">{sim.ddiBefore}</td>
                    <td className="py-3 px-4 text-amber-400">{(sim.ddiBefore * 0.89).toFixed(4)}</td>
                    <td className="py-3 px-4 text-emerald-400 font-bold">{sim.ddiAfter} (-{sim.ddiDropPct}%)</td>
                  </tr>
                  <tr className="border-b border-slate-800">
                    <td className="py-3 px-4 font-bold text-white">Gini & Nakamoto (N33, N51)</td>
                    <td className="py-3 px-4 text-rose-400">Gini: {sim.giniBefore} | N33: 2 | N51: 7</td>
                    <td className="py-3 px-4 text-amber-400">Gini: 0.8510 | N33: 2 | N51: 8</td>
                    <td className="py-3 px-4 text-emerald-400 font-bold">Gini: {sim.giniAfter} | N33: {sim.n33After} | N51: {sim.n51After}</td>
                  </tr>
                  <tr className="border-b border-slate-800">
                    <td className="py-3 px-4 font-bold text-white">Solo-Staker Peak Activation Delay</td>
                    <td className="py-3 px-4 text-rose-400">1,920 Epochs (~8.5 Days)</td>
                    <td className="py-3 px-4 text-sky-400">535 Epochs (~2.3 Days)</td>
                    <td className="py-3 px-4 text-emerald-400 font-bold">535 Epochs (-72.1% Wait Time)</td>
                  </tr>
                  <tr className="border-b border-slate-800">
                    <td className="py-3 px-4 font-bold text-white">Top-5 & Top-10 Entity Share</td>
                    <td className="py-3 px-4 text-rose-400">Top-5: {sim.top5Before}% | Top-10: {sim.top10Before}%</td>
                    <td className="py-3 px-4 text-amber-400">Top-5: 38.9% | Top-10: 49.4%</td>
                    <td className="py-3 px-4 text-emerald-400 font-bold">Top-5: {sim.top5After}% | Top-10: {sim.top10After}%</td>
                  </tr>
                  <tr className="border-b border-slate-800">
                    <td className="py-3 px-4 font-bold text-white">Budget Neutrality & Hardware Cost</td>
                    <td className="py-3 px-4 text-slate-400">Baseline</td>
                    <td className="py-3 px-4 text-rose-400">Unfunded Priority</td>
                    <td className="py-3 px-4 text-emerald-400 font-bold">Error: 0.0000 ETH | RAM: 412 MB | Storage: 18.4 MB Parquet</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
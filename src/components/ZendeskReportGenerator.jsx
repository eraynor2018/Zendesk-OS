import { useState, useCallback, useEffect, useMemo } from "react";
import { jsPDF } from "jspdf";

const INITIAL_AGENTS = [
  { name: "Red", solved: "" },
  { name: "Derick", solved: "" },
  { name: "Jacq", solved: "" },
  { name: "Emma", solved: "" },
  { name: "Nick", solved: "" },
];

const INITIAL_TRIGGERS = [
  { key: "2fa", label: "2FA Trouble", slackLabel: "2fa trouble", count: "" },
  { key: "pnad", label: "Product Not as Advertised", slackLabel: "Product not as advertised", count: "" },
  { key: "dispute", label: "Dispute Already Opened", slackLabel: "Dispute already opened auto message", count: "" },
  { key: "not_shipped", label: "Order Hasn't Shipped", slackLabel: "When will my order be shipped", count: "" },
  { key: "delayed_domestic", label: "Delayed Domestic Shipment", slackLabel: "Delayed domestic shipment", count: "" },
  { key: "delayed_intl", label: "Delayed Intl Shipment", slackLabel: "Delayed international shipment", count: "" },
];

const INITIAL_MACROS = [
  { tag: "how_to", label: "How to explanations", count: "" },
  { tag: "swap_updates", label: "Swap updates", count: "" },
  { tag: "delinquent_account", label: "Delinquent accounts", count: "" },
  { tag: "transactional", label: "Transactional", count: "" },
  { tag: "revised_label", label: "Shipping label updates", count: "" },
  { tag: "shipping", label: "Customer shipping issues", count: "" },
  { tag: "dispute", label: "Disputes", count: "" },
  { tag: "2fa", label: "2FA", count: "" },
  { tag: "account_updates", label: "Account updates", count: "" },
  { tag: "fraud", label: "Fraud", count: "" },
  { tag: "bug", label: "Bug", count: "" },
  { tag: "cashout", label: "Cashout", count: "" },
  { tag: "tariffs", label: "Tariffs", count: "" },
  { tag: "account_access", label: "Account access", count: "" },
  { tag: "w9", label: "W9", count: "" },
];

function getLastFriday(fromDate) {
  const d = new Date(fromDate);
  const day = d.getDay();
  const diff = day >= 5 ? day - 5 : day + 2;
  d.setDate(d.getDate() - diff);
  return d;
}

function getTwoFridaysBack(fromDate) {
  const lastFri = getLastFriday(fromDate);
  const twoFriBack = new Date(lastFri);
  twoFriBack.setDate(twoFriBack.getDate() - 7);
  return twoFriBack;
}

function formatDate(d) {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

function getDefaultDates() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const weekAgo = new Date(yesterday);
  weekAgo.setDate(yesterday.getDate() - 6);
  const toYMD = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { start: toYMD(weekAgo), end: toYMD(yesterday) };
}

const Section = ({ title, icon, children }) => (
  <div style={{
    background: "#fff",
    borderRadius: "10px",
    border: "1px solid #CFDCD6",
    padding: "20px 24px",
    marginBottom: "16px",
  }}>
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginBottom: "16px",
      paddingBottom: "12px",
      borderBottom: "1px solid #CFDCD6",
    }}>
      <span style={{ fontSize: "18px" }}>{icon}</span>
      <h3 style={{
        margin: 0,
        fontSize: "14px",
        fontWeight: 600,
        color: "#253C32",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}>{title}</h3>
    </div>
    {children}
  </div>
);

const InputField = ({ label, value, onChange, suffix, placeholder, small }) => (
  <div style={{ flex: small ? "0 0 auto" : 1, minWidth: small ? "100px" : "140px" }}>
    <label style={{
      display: "block",
      fontSize: "12px",
      fontWeight: 500,
      color: "#61716A",
      marginBottom: "5px",
    }}>{label}</label>
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
        placeholder={placeholder || "0"}
        style={{
          width: "100%",
          padding: "8px 12px",
          paddingRight: suffix ? "32px" : "12px",
          border: "1px solid #CFDCD6",
          borderRadius: "6px",
          fontSize: "14px",
          color: "#253C32",
          outline: "none",
          transition: "border-color 0.15s",
          background: "#fff",
          boxSizing: "border-box",
        }}
        onFocus={e => e.target.style.borderColor = "#02C874"}
        onBlur={e => e.target.style.borderColor = "#CFDCD6"}
      />
      {suffix && (
        <span style={{
          position: "absolute",
          right: "10px",
          color: "#61716A",
          fontSize: "13px",
          pointerEvents: "none",
        }}>{suffix}</span>
      )}
    </div>
  </div>
);

const InlineInput = ({ label, value, onChange, suffix, width }) => (
  <div style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "6px 0",
    borderBottom: "1px solid #f0f5f2",
  }}>
    <span style={{ fontSize: "13px", color: "#253C32" }}>{label}</span>
    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
        placeholder="0"
        style={{
          width: width || "60px",
          padding: "5px 8px",
          border: "1px solid #CFDCD6",
          borderRadius: "5px",
          fontSize: "13px",
          color: "#253C32",
          textAlign: "right",
          outline: "none",
          background: "#fff",
        }}
        onFocus={e => e.target.style.borderColor = "#02C874"}
        onBlur={e => e.target.style.borderColor = "#CFDCD6"}
      />
      {suffix && <span style={{ fontSize: "12px", color: "#61716A" }}>{suffix}</span>}
    </div>
  </div>
);

const StatCard = ({ label, value, sub }) => (
  <div style={{
    background: "#f8fffc",
    borderRadius: "8px",
    padding: "14px 16px",
    flex: 1,
    minWidth: "120px",
    border: "1px solid #e8f0ec",
  }}>
    <div style={{ fontSize: "11px", color: "#61716A", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</div>
    <div style={{ fontSize: "22px", fontWeight: 700, color: "#253C32", marginTop: "4px" }}>{value}</div>
    {sub && <div style={{ fontSize: "11px", color: "#61716A", marginTop: "2px" }}>{sub}</div>}
  </div>
);

export default function ZendeskReportGenerator() {
  const [weekStart, setWeekStart] = useState(() => getDefaultDates().start);
  const [weekEnd, setWeekEnd] = useState(() => getDefaultDates().end);
  const [createdTickets, setCreatedTickets] = useState("");
  const [solvedTickets, setSolvedTickets] = useState("");
  const [adaConversations, setAdaConversations] = useState("");
  const [adaContainment, setAdaContainment] = useState("");
  const [adaTickets, setAdaTickets] = useState("");
  const [triggers, setTriggers] = useState(INITIAL_TRIGGERS);
  const [agents, setAgents] = useState(INITIAL_AGENTS);
  const [macros, setMacros] = useState(INITIAL_MACROS);
  const [csatStart, setCsatStart] = useState("");
  const [csatEnd, setCsatEnd] = useState("");
  const [csatScore, setCsatScore] = useState("");
  const [csatGood, setCsatGood] = useState("");
  const [csatBad, setCsatBad] = useState("");
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [csatLoading, setCsatLoading] = useState(false);

  // Auto-suggest Friday-to-Friday CSAT dates when weekEnd changes
  useEffect(() => {
    if (!weekEnd) return;
    const endDate = new Date(weekEnd + "T12:00:00");
    const lastFri = getLastFriday(endDate);
    const prevFri = new Date(lastFri);
    prevFri.setDate(prevFri.getDate() - 7);
    const toYMD = (d) => d.toISOString().split("T")[0];
    setCsatStart(toYMD(prevFri));
    setCsatEnd(toYMD(lastFri));
  }, [weekEnd]);

  // Auto-sum solved tickets from agent solves
  useEffect(() => {
    const total = agents.reduce((sum, a) => sum + (parseInt(a.solved) || 0), 0);
    setSolvedTickets(total > 0 ? total.toString() : "");
  }, [agents]);

  const fetchZendeskData = useCallback(async () => {
    if (!weekStart || !weekEnd) {
      setFetchError("Please select both week start and week end dates.");
      return;
    }
    setFetchLoading(true);
    setFetchError("");
    try {
      const params = new URLSearchParams({ weekStart, weekEnd });
      const response = await fetch(`/api/zendesk-report?${params}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${response.status}`);
      }
      const data = await response.json();
      setCreatedTickets(data.createdTickets.toString());
      if (data.adaTickets !== undefined) {
        setAdaTickets(data.adaTickets.toString());
      }
      setMacros((prev) =>
        prev.map((m) => ({
          ...m,
          count:
            data.macros[m.tag] !== undefined
              ? data.macros[m.tag].toString()
              : m.count,
        }))
      );
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setFetchLoading(false);
    }
  }, [weekStart, weekEnd]);

  const fetchCsatOnly = useCallback(async () => {
    if (!csatStart || !csatEnd) {
      setFetchError("Please select both CSAT start and end dates.");
      return;
    }
    setCsatLoading(true);
    setFetchError("");
    try {
      const params = new URLSearchParams({ csatOnly: "true", csatStart, csatEnd });
      const response = await fetch(`/api/zendesk-report?${params}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${response.status}`);
      }
      const data = await response.json();
      if (data.csat) {
        setCsatScore(data.csat.score);
        setCsatGood(data.csat.good.toString());
        setCsatBad(data.csat.bad.toString());
      }
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setCsatLoading(false);
    }
  }, [csatStart, csatEnd]);

  const updateTrigger = (idx, val) => {
    const next = [...triggers];
    next[idx] = { ...next[idx], count: val };
    setTriggers(next);
  };

  const updateAgent = (idx, val) => {
    const next = [...agents];
    next[idx] = { ...next[idx], solved: val };
    setAgents(next);
  };

  const removeAgent = (idx) => {
    setAgents(agents.filter((_, i) => i !== idx));
  };

  const addAgent = () => {
    if (newAgentName.trim()) {
      setAgents([...agents, { name: newAgentName.trim(), solved: "" }]);
      setNewAgentName("");
    }
  };

  const updateMacro = (idx, val) => {
    const next = [...macros];
    next[idx] = { ...next[idx], count: val };
    setMacros(next);
  };

  const triggerSum = useMemo(() => triggers.reduce((s, t) => s + (parseInt(t.count) || 0), 0), [triggers]);
  const macroSum = useMemo(() => macros.reduce((s, m) => s + (parseInt(m.count) || 0), 0), [macros]);
  const created = parseInt(createdTickets) || 0;
  const solved = parseInt(solvedTickets) || 0;
  const automationPct = created > 0 ? (((created - solved) / created) * 100).toFixed(1) : "0.0";
  const macroCoveragePct = solved > 0 ? ((macroSum / solved) * 100).toFixed(1) : "0.0";
  const csatTotal = (parseInt(csatGood) || 0) + (parseInt(csatBad) || 0);

  const csatDateLabel = useMemo(() => {
    if (!csatEnd) return "";
    const endDate = new Date(csatEnd + "T12:00:00");
    return `through ${formatDate(endDate)}`;
  }, [csatEnd]);

  const adaDashboardUrl = useMemo(() => {
    if (!weekStart || !weekEnd) return null;
    return `https://sidelineswap.ada.support/?sd=${weekStart}&ed=${weekEnd}`;
  }, [weekStart, weekEnd]);

  const generateSlackReport = useCallback(() => {
    const activeMacros = macros.filter(m => parseInt(m.count) > 0).sort((a, b) => parseInt(b.count) - parseInt(a.count));
    const activeAgents = agents.filter(a => parseInt(a.solved) > 0).sort((a, b) => parseInt(b.solved) - parseInt(a.solved));

    let report = `Last week there were ${created.toLocaleString()} created tickets and ${solved.toLocaleString()} solved by SidelineSwap. ${automationPct}% handled by automation\n`;
    report += `* Ada engaged conversations: ${parseInt(adaConversations) ? parseInt(adaConversations).toLocaleString() : "0"}\n`;
    report += `* Ada tickets: ${parseInt(adaTickets) ? parseInt(adaTickets).toLocaleString() : "0"}\n`;
    report += `* Ada containment rate: ${adaContainment || "0"}%\n`;

    triggers.forEach(t => {
      report += `* ${t.slackLabel}: ${parseInt(t.count) || 0}\n`;
    });

    report += `Tickets solved by agent:\n`;
    activeAgents.forEach(a => {
      report += `* ${a.name}: ${parseInt(a.solved).toLocaleString()}\n`;
    });

    report += `Our most used Macros in the last 7 days were related to (KEY):\n`;
    activeMacros.forEach(m => {
      report += `* ${m.label}: ${parseInt(m.count)}\n`;
    });
    report += `* ${macroCoveragePct}% of tix\n`;

    report += `Customer satisfaction score ${csatDateLabel}\n`;
    report += `* ${csatScore || "0"}%\n`;
    report += `* ${csatTotal} ratings`;

    return report;
  }, [created, solved, automationPct, adaConversations, adaTickets, adaContainment, triggers, agents, macros, macroCoveragePct, csatScore, csatTotal, csatDateLabel]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generateSlackReport());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = useCallback(() => {
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 36;
    const colW = (pageW - margin * 2 - 24) / 2;
    let y = 36;

    const brandGreen = [2, 200, 116];
    const darkGreen = [37, 60, 50];
    const gray = [97, 113, 106];

    // Header bar
    doc.setFillColor(...darkGreen);
    doc.rect(0, 0, pageW, 44, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text("Zendesk OS", margin, 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(180, 200, 190);
    doc.text("Weekly Report", margin, 34);

    // Date range badge
    if (weekStart && weekEnd) {
      const startD = new Date(weekStart + "T12:00:00");
      const endD = new Date(weekEnd + "T12:00:00");
      const label = `${formatDate(startD)} - ${formatDate(endD)}`;
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(label, pageW - margin, 28, { align: "right" });
    }
    y = 58;

    // Section helper
    const drawSection = (title) => {
      doc.setFillColor(...brandGreen);
      doc.rect(margin, y, 3, 12, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...darkGreen);
      doc.text(title.toUpperCase(), margin + 10, y + 10);
      y += 20;
    };

    // Stat box helper
    const drawStat = (x, label, value, width) => {
      doc.setFillColor(248, 255, 252);
      doc.setDrawColor(232, 240, 236);
      doc.roundedRect(x, y, width, 34, 3, 3, "FD");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...gray);
      doc.text(label.toUpperCase(), x + 8, y + 11);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(...darkGreen);
      doc.text(String(value), x + 8, y + 27);
    };

    // ── Ticket Volume ──
    drawSection("Ticket Volume");
    const statW = (pageW - margin * 2 - 12) / 2;
    drawStat(margin, "Created Tickets", created.toLocaleString(), statW);
    drawStat(margin + statW + 12, "Solved Tickets", solved.toLocaleString(), statW);
    y += 42;

    // ── Automation ──
    drawSection("Automation");
    const adaStats = [
      { label: "Ada Conversations", value: parseInt(adaConversations) ? parseInt(adaConversations).toLocaleString() : "0" },
      { label: "Containment Rate", value: `${adaContainment || "0"}%` },
      { label: "Ada Tickets", value: parseInt(adaTickets) ? parseInt(adaTickets).toLocaleString() : "0" },
    ];
    const adaW = (pageW - margin * 2 - 24) / 3;
    adaStats.forEach((s, i) => {
      drawStat(margin + i * (adaW + 12), s.label, s.value, adaW);
    });
    y += 42;

    // Triggers
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...gray);
    doc.text("AUTO-RESPONSE TRIGGERS (7D)", margin, y + 4);
    y += 12;
    triggers.forEach((t, i) => {
      const col = i % 2;
      const xPos = margin + col * (colW + 24);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...darkGreen);
      doc.text(t.label, xPos, y + 9);
      doc.setFont("helvetica", "bold");
      doc.text(String(parseInt(t.count) || 0), xPos + colW - 4, y + 9, { align: "right" });
      if (col === 1 || i === triggers.length - 1) y += 13;
    });

    // Automation stats
    y += 4;
    const autoW2 = (pageW - margin * 2 - 12) / 2;
    drawStat(margin, "Trigger Total", triggerSum, autoW2);
    drawStat(margin + autoW2 + 12, "Automation %", `${automationPct}%`, autoW2);
    y += 42;

    // ── Agent Solves ──
    drawSection("Agent Solves");
    const activeAgents = agents.filter(a => parseInt(a.solved) > 0).sort((a, b) => parseInt(b.solved) - parseInt(a.solved));
    activeAgents.forEach((a, i) => {
      const col = i % 2;
      const xPos = margin + col * (colW + 24);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...darkGreen);
      doc.text(a.name, xPos, y + 9);
      doc.setFont("helvetica", "bold");
      doc.text(String(parseInt(a.solved).toLocaleString()), xPos + colW - 4, y + 9, { align: "right" });
      if (col === 1 || i === activeAgents.length - 1) y += 13;
    });
    y += 4;

    // ── Macro Usage ──
    drawSection("Macro Usage");
    const activeMacros = macros.filter(m => parseInt(m.count) > 0).sort((a, b) => parseInt(b.count) - parseInt(a.count));
    activeMacros.forEach((m, i) => {
      const col = i % 2;
      const xPos = margin + col * (colW + 24);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...darkGreen);
      doc.text(m.label, xPos, y + 9);
      doc.setFont("helvetica", "bold");
      doc.text(String(parseInt(m.count)), xPos + colW - 4, y + 9, { align: "right" });
      if (col === 1 || i === activeMacros.length - 1) y += 13;
    });
    y += 4;
    const macW2 = (pageW - margin * 2 - 12) / 2;
    drawStat(margin, "Macro Total", macroSum, macW2);
    drawStat(margin + macW2 + 12, "Coverage %", `${macroCoveragePct}%`, macW2);
    y += 42;

    // ── CSAT ──
    drawSection("Customer Satisfaction");
    const csW = (pageW - margin * 2 - 24) / 3;
    drawStat(margin, "CSAT Score", `${csatScore || "0"}%`, csW);
    drawStat(margin + csW + 12, "Good Ratings", csatGood || "0", csW);
    drawStat(margin + (csW + 12) * 2, "Bad Ratings", csatBad || "0", csW);
    y += 42;

    if (csatDateLabel) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...gray);
      doc.text(`Satisfaction ${csatDateLabel}  |  ${csatTotal} total ratings`, margin, y);
    }

    // Generate filename
    const fname = weekStart && weekEnd
      ? `zendesk-report-${weekStart}-to-${weekEnd}.pdf`
      : "zendesk-report.pdf";
    doc.save(fname);
  }, [weekStart, weekEnd, created, solved, adaConversations, adaContainment, adaTickets, triggers, agents, macros, triggerSum, automationPct, macroSum, macroCoveragePct, csatScore, csatGood, csatBad, csatTotal, csatDateLabel]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f4f7f5",
      fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        background: "#253C32",
        padding: "20px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: "#02C874",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
            fontWeight: 700,
            color: "#253C32",
          }}>Z</div>
          <div>
            <div style={{ color: "#fff", fontSize: "16px", fontWeight: 600 }}>Zendesk OS</div>
            <div style={{ color: "#61716A", fontSize: "11px" }}>Weekly Report Generator</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setShowPreview(!showPreview)}
            style={{
              padding: "8px 16px",
              background: showPreview ? "#02C874" : "rgba(255,255,255,0.1)",
              color: showPreview ? "#253C32" : "#fff",
              border: "none",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {showPreview ? "✓ Preview" : "Preview"}
          </button>
          <button
            onClick={handleCopy}
            style={{
              padding: "8px 16px",
              background: copied ? "#02C874" : "rgba(255,255,255,0.1)",
              color: copied ? "#253C32" : "#fff",
              border: "none",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {copied ? "✓ Copied!" : "Copy to Slack"}
          </button>
          <button
            onClick={handleDownloadPDF}
            style={{
              padding: "8px 16px",
              background: "#fff",
              color: "#253C32",
              border: "none",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            Download PDF
          </button>
        </div>
      </div>

      <div style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "24px 24px 60px",
      }}>
        {/* Date Range */}
        <div style={{
          display: "flex",
          gap: "12px",
          marginBottom: "20px",
          alignItems: "flex-end",
        }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#61716A", marginBottom: "5px" }}>Week Start</label>
            <input
              type="date"
              value={weekStart}
              onChange={e => setWeekStart(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #CFDCD6",
                borderRadius: "6px",
                fontSize: "14px",
                color: "#253C32",
                outline: "none",
                background: "#fff",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#61716A", marginBottom: "5px" }}>Week End</label>
            <input
              type="date"
              value={weekEnd}
              onChange={e => setWeekEnd(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #CFDCD6",
                borderRadius: "6px",
                fontSize: "14px",
                color: "#253C32",
                outline: "none",
                background: "#fff",
                boxSizing: "border-box",
              }}
            />
          </div>
          <button
            onClick={fetchZendeskData}
            disabled={fetchLoading || !weekStart || !weekEnd}
            style={{
              padding: "8px 20px",
              background: fetchLoading ? "#61716A" : "#02C874",
              color: fetchLoading ? "#fff" : "#253C32",
              border: "none",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: fetchLoading ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
              opacity: (!weekStart || !weekEnd) ? 0.5 : 1,
              transition: "all 0.15s",
            }}
          >
            {fetchLoading ? "Fetching..." : "Fetch Data"}
          </button>
        </div>

        {fetchError && (
          <div style={{
            background: "#fff0f0",
            border: "1px solid #ffcaca",
            borderRadius: "6px",
            padding: "10px 14px",
            marginBottom: "16px",
            fontSize: "13px",
            color: "#c00",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <span>{fetchError}</span>
            <button
              onClick={() => setFetchError("")}
              style={{
                background: "none",
                border: "none",
                color: "#c00",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "13px",
                padding: "0 0 0 12px",
              }}
            >Dismiss</button>
          </div>
        )}

        {/* Volume */}
        <Section title="Ticket Volume" icon="📊">
          <div style={{ display: "flex", gap: "12px" }}>
            <InputField label="Created Tickets" value={createdTickets} onChange={setCreatedTickets} />
            <InputField label="Solved Tickets" value={solvedTickets} onChange={setSolvedTickets} />
          </div>
        </Section>

        {/* Automation */}
        <Section title="Automation" icon="🤖">
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px", alignItems: "flex-end" }}>
            <InputField label="Ada Engaged Conversations" value={adaConversations} onChange={setAdaConversations} />
            <InputField label="Ada Containment Rate" value={adaContainment} onChange={setAdaContainment} suffix="%" />
            <InputField label="Ada Tickets" value={adaTickets} onChange={setAdaTickets} />
            {adaDashboardUrl && (
              <a
                href={adaDashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: "8px 14px",
                  background: "#f8fffc",
                  border: "1px solid #CFDCD6",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#253C32",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  transition: "border-color 0.15s",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  height: "fit-content",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#02C874"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "#CFDCD6"}
              >
                Open Ada Dashboard
                <span style={{ fontSize: "10px" }}>&#8599;</span>
              </a>
            )}
          </div>
          <div style={{ marginBottom: "8px" }}>
            <div style={{ fontSize: "12px", fontWeight: 500, color: "#61716A", marginBottom: "8px" }}>Auto-Response Triggers (7d)</div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0 24px",
            }}>
              {triggers.map((t, i) => (
                <InlineInput
                  key={t.key}
                  label={t.label}
                  value={t.count}
                  onChange={val => updateTrigger(i, val)}
                />
              ))}
            </div>
          </div>
          <div style={{
            display: "flex",
            gap: "12px",
            marginTop: "14px",
          }}>
            <StatCard label="Trigger Total" value={triggerSum} />
            <StatCard label="Automation %" value={`${automationPct}%`} sub={`(${created} - ${solved}) / ${created}`} />
          </div>
        </Section>

        {/* Agent Solves */}
        <Section title="Agent Solves" icon="👤">
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0 24px",
          }}>
            {agents.map((a, i) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 0",
                borderBottom: "1px solid #f0f5f2",
              }}>
                <span style={{ fontSize: "13px", color: "#253C32", flex: 1 }}>{a.name}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={a.solved}
                  onChange={e => updateAgent(i, e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="0"
                  style={{
                    width: "60px",
                    padding: "5px 8px",
                    border: "1px solid #CFDCD6",
                    borderRadius: "5px",
                    fontSize: "13px",
                    color: "#253C32",
                    textAlign: "right",
                    outline: "none",
                    background: "#fff",
                  }}
                  onFocus={e => e.target.style.borderColor = "#02C874"}
                  onBlur={e => e.target.style.borderColor = "#CFDCD6"}
                />
                <button
                  onClick={() => removeAgent(i)}
                  style={{
                    width: "22px",
                    height: "22px",
                    border: "none",
                    background: "transparent",
                    color: "#61716A",
                    cursor: "pointer",
                    fontSize: "14px",
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                  }}
                  title="Remove agent"
                >×</button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "12px", alignItems: "center" }}>
            <input
              type="text"
              value={newAgentName}
              onChange={e => setNewAgentName(e.target.value)}
              placeholder="Agent name..."
              onKeyDown={e => e.key === "Enter" && addAgent()}
              style={{
                padding: "6px 10px",
                border: "1px solid #CFDCD6",
                borderRadius: "5px",
                fontSize: "13px",
                color: "#253C32",
                outline: "none",
                background: "#fff",
                width: "140px",
              }}
            />
            <button
              onClick={addAgent}
              style={{
                padding: "6px 12px",
                background: "#f8fffc",
                border: "1px solid #CFDCD6",
                borderRadius: "5px",
                fontSize: "12px",
                color: "#253C32",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >+ Add</button>
            <a
              href="https://sidelineswap.zendesk.com/explore/studio#/dashboards/precanned/9425F76AF99EC760E6FDE83C5A99EE472407CBD6B0D5A3DA700AB5DDE040C541"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "6px 12px",
                background: "#f8fffc",
                border: "1px solid #CFDCD6",
                borderRadius: "5px",
                fontSize: "12px",
                fontWeight: 500,
                color: "#253C32",
                textDecoration: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                marginLeft: "auto",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#02C874"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "#CFDCD6"}
            >
              Zendesk Explore
              <span style={{ fontSize: "10px" }}>&#8599;</span>
            </a>
          </div>
        </Section>

        {/* Macros */}
        <Section title="Macro Usage" icon="🏷️">
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0 24px",
          }}>
            {macros.map((m, i) => (
              <InlineInput
                key={m.tag}
                label={m.label}
                value={m.count}
                onChange={val => updateMacro(i, val)}
              />
            ))}
          </div>
          <div style={{
            display: "flex",
            gap: "12px",
            marginTop: "14px",
          }}>
            <StatCard label="Macro Total" value={macroSum} />
            <StatCard label="Coverage %" value={`${macroCoveragePct}%`} sub={`${macroSum} / ${solved} solved`} />
          </div>
        </Section>

        {/* CSAT */}
        <Section title="Customer Satisfaction" icon="⭐">
          <div style={{ display: "flex", gap: "12px", marginBottom: "16px", alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#61716A", marginBottom: "5px" }}>CSAT Start</label>
              <input
                type="date"
                value={csatStart}
                onChange={e => setCsatStart(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #CFDCD6",
                  borderRadius: "6px",
                  fontSize: "14px",
                  color: "#253C32",
                  outline: "none",
                  background: "#fff",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#61716A", marginBottom: "5px" }}>CSAT End</label>
              <input
                type="date"
                value={csatEnd}
                onChange={e => setCsatEnd(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #CFDCD6",
                  borderRadius: "6px",
                  fontSize: "14px",
                  color: "#253C32",
                  outline: "none",
                  background: "#fff",
                  boxSizing: "border-box",
                }}
              />
            </div>
            {csatStart && csatEnd && (
              <div style={{
                fontSize: "11px",
                color: "#61716A",
                background: "#f8fffc",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #e8f0ec",
                whiteSpace: "nowrap",
              }}>
                Fri-to-Fri window
              </div>
            )}
            <button
              onClick={fetchCsatOnly}
              disabled={csatLoading || !csatStart || !csatEnd}
              style={{
                padding: "8px 16px",
                background: csatLoading ? "#61716A" : "#02C874",
                color: csatLoading ? "#fff" : "#253C32",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: csatLoading ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
                opacity: (!csatStart || !csatEnd) ? 0.5 : 1,
                transition: "all 0.15s",
              }}
            >
              {csatLoading ? "Fetching..." : "Fetch CSAT"}
            </button>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <InputField label="CSAT Score" value={csatScore} onChange={setCsatScore} suffix="%" />
            <InputField label="Good Ratings" value={csatGood} onChange={setCsatGood} />
            <InputField label="Bad Ratings" value={csatBad} onChange={setCsatBad} />
          </div>
          <div style={{ marginTop: "14px" }}>
            <StatCard label="Total Ratings" value={csatTotal} />
          </div>
        </Section>

        {/* Preview */}
        {showPreview && (
          <div style={{
            background: "#253C32",
            borderRadius: "10px",
            padding: "24px",
            marginTop: "8px",
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#02C874", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Slack Preview
              </div>
              <button
                onClick={handleCopy}
                style={{
                  padding: "6px 14px",
                  background: copied ? "#02C874" : "rgba(255,255,255,0.15)",
                  color: copied ? "#253C32" : "#fff",
                  border: "none",
                  borderRadius: "5px",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {copied ? "✓ Copied!" : "Copy"}
              </button>
            </div>
            <pre style={{
              color: "#e0e8e4",
              fontSize: "13px",
              lineHeight: "1.6",
              fontFamily: "'Lato', -apple-system, sans-serif",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              margin: 0,
            }}>
              {generateSlackReport()}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

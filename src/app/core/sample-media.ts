export interface DemoScreenSample {
  id: string;
  name: string;
  description: string;
  category: 'saas' | 'code' | 'mobile';
  duration: number; // seconds
  aspectRatio: number; // width / height
  drawFrame: (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => void;
}

/**
 * Draws a professional dark SaaS dashboard screen recording simulation
 */
function drawSaasDashboard(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  // Main canvas background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, w, h);

  // Top header bar
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, w, 56);
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 55, w, 1);

  // Brand logo & title
  ctx.fillStyle = '#6366f1';
  ctx.beginPath();
  ctx.arc(28, 28, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('Pulse Analytics', 50, 33);

  // Header Nav links
  const navs = ['Overview', 'Realtime', 'Funnels', 'Cohorts', 'Settings'];
  let navX = 200;
  ctx.font = '13px system-ui, sans-serif';
  navs.forEach((nav, idx) => {
    ctx.fillStyle = idx === 0 ? '#ffffff' : '#94a3b8';
    ctx.fillText(nav, navX, 33);
    if (idx === 0) {
      ctx.fillStyle = '#6366f1';
      ctx.fillRect(navX - 2, 53, ctx.measureText(nav).width + 4, 3);
    }
    navX += 85;
  });

  // User Profile
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.arc(w - 36, 28, 15, 0, Math.PI * 2);
  ctx.fill();

  // Left Sidebar
  const sidebarW = 210;
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 56, sidebarW, h - 56);
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(sidebarW, 56, 1, h - 56);

  const sidebarItems = ['Dashboard', 'Live Visitors', 'Conversion Rate', 'Revenue MRR', 'Server Health', 'Integrations'];
  sidebarItems.forEach((item, i) => {
    const itemY = 80 + i * 40;
    if (i === 0) {
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(12, itemY - 6, sidebarW - 24, 32);
      ctx.strokeStyle = '#4338ca';
      ctx.lineWidth = 1;
      ctx.strokeRect(12, itemY - 6, sidebarW - 24, 32);
      ctx.fillStyle = '#a5b4fc';
    } else {
      ctx.fillStyle = '#64748b';
    }
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(item, 32, itemY + 15);
  });

  // Main Content Area
  const contentX = sidebarW + 28;
  const contentY = 80;
  const contentW = w - sidebarW - 56;

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('Production Telemetry & ARR', contentX, contentY + 16);

  // Metric Cards
  const cardW = (contentW - 36) / 3;
  const cards = [
    { title: 'Monthly Recurring Revenue', value: '$128,450', change: '+18.4%', up: true },
    { title: 'Active Concurrent Users', value: `${Math.floor(2840 + Math.sin(t * 2) * 120)}`, change: '+7.2%', up: true },
    { title: 'Global P99 Latency', value: `${(42 + Math.cos(t * 3) * 3).toFixed(1)} ms`, change: '-4.1%', up: true },
  ];

  cards.forEach((card, i) => {
    const cx = contentX + i * (cardW + 18);
    const cy = contentY + 36;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(cx, cy, cardW, 90, 8);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(card.title, cx + 16, cy + 26);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(card.value, cx + 16, cy + 60);

    ctx.fillStyle = card.up ? '#10b981' : '#f43f5e';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText(card.change, cx + cardW - 60, cy + 60);
  });

  // Large Chart Area
  const chartY = contentY + 144;
  const chartH = h - chartY - 32;
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(contentX, chartY, contentW, chartH, 10);
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('Live Inbound Stream Throughput', contentX + 20, chartY + 28);

  // Chart Grid Lines
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
  ctx.lineWidth = 1;
  for (let y = chartY + 55; y < chartY + chartH - 30; y += 45) {
    ctx.beginPath();
    ctx.moveTo(contentX + 20, y);
    ctx.lineTo(contentX + contentW - 20, y);
    ctx.stroke();
  }

  // Animated Chart Wave
  ctx.beginPath();
  const points = 24;
  const stepX = (contentW - 40) / (points - 1);
  const baseline = chartY + chartH - 45;

  for (let i = 0; i < points; i++) {
    const px = contentX + 20 + i * stepX;
    const wave = Math.sin(i * 0.45 + t * 2) * 25 + Math.cos(i * 0.2 - t) * 18;
    const py = baseline - 70 - wave;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }

  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Subtle Chart Gradient Fill
  ctx.lineTo(contentX + contentW - 20, baseline);
  ctx.lineTo(contentX + 20, baseline);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, chartY + 60, 0, baseline);
  grad.addColorStop(0, 'rgba(99, 102, 241, 0.28)');
  grad.addColorStop(1, 'rgba(99, 102, 241, 0)');
  ctx.fillStyle = grad;
  ctx.fill();

  // Simulated Mouse Cursor moving naturally
  const cursorX = contentX + 160 + Math.sin(t * 0.8) * 180;
  const cursorY = chartY + 80 + Math.cos(t * 1.2) * 60;

  // Pulsing highlight at cursor
  const pulseR = 8 + Math.abs(Math.sin(t * 4)) * 6;
  ctx.beginPath();
  ctx.arc(cursorX, cursorY, pulseR, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(99, 102, 241, 0.25)';
  ctx.fill();

  // Realistic pointer arrow
  ctx.save();
  ctx.translate(cursorX, cursorY);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 16);
  ctx.lineTo(4, 12);
  ctx.lineTo(8, 20);
  ctx.lineTo(11, 19);
  ctx.lineTo(7, 11);
  ctx.lineTo(12, 11);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/**
 * Draws a VS Code TypeScript Developer Screen Recording
 */
function drawCodeIde(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  // VS Code background
  ctx.fillStyle = '#181824';
  ctx.fillRect(0, 0, w, h);

  // Activity Bar (leftmost strip)
  ctx.fillStyle = '#11111b';
  ctx.fillRect(0, 0, 48, h);

  // Sidebar (file explorer)
  ctx.fillStyle = '#1e1e2e';
  ctx.fillRect(48, 0, 180, h);
  ctx.fillStyle = '#313244';
  ctx.fillRect(228, 0, 1, h);

  ctx.fillStyle = '#a6adc8';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText('EXPLORER', 64, 28);

  const files = [
    { name: '▼ src', isDir: true, indent: 0 },
    { name: '▼ core', isDir: true, indent: 1 },
    { name: '  models.ts', isDir: false, indent: 2 },
    { name: '  renderer.ts', isDir: false, indent: 2, active: true },
    { name: '  keyframe-math.ts', isDir: false, indent: 2 },
    { name: '▼ components', isDir: true, indent: 1 },
    { name: '  timeline.ts', isDir: false, indent: 2 },
    { name: '  inspector.ts', isDir: false, indent: 2 },
  ];

  files.forEach((f, i) => {
    const fy = 54 + i * 24;
    if (f.active) {
      ctx.fillStyle = '#313244';
      ctx.fillRect(48, fy - 14, 180, 22);
      ctx.fillStyle = '#89b4fa';
    } else {
      ctx.fillStyle = f.isDir ? '#cdd6f4' : '#a6adc8';
    }
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(f.name, 60 + f.indent * 10, fy);
  });

  // Editor Tabs Header
  const editorX = 229;
  ctx.fillStyle = '#181825';
  ctx.fillRect(editorX, 0, w - editorX, 36);

  ctx.fillStyle = '#1e1e2e';
  ctx.fillRect(editorX, 0, 160, 36);
  ctx.fillStyle = '#89b4fa';
  ctx.fillRect(editorX, 34, 160, 2);
  ctx.fillStyle = '#cdd6f4';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('renderer.ts', editorX + 24, 22);

  // Code Content Area
  const codeLines = [
    { text: 'import { Keyframe, DeviceSettings } from "./models";', color: '#cba6f7' },
    { text: '', color: '#cdd6f4' },
    { text: 'export class MotionRenderer {', color: '#89b4fa' },
    { text: '  private canvas: HTMLCanvasElement;', color: '#f38ba8' },
    { text: '  private ctx: CanvasRenderingContext2D;', color: '#f38ba8' },
    { text: '', color: '#cdd6f4' },
    { text: '  public renderFrame(timestamp: number): void {', color: '#89b4fa' },
    { text: '    const zoom = this.evaluateZoom(timestamp);', color: '#fab387' },
    { text: '    const { x, y } = this.calculateFocusPoint(zoom);', color: '#a6e3a1' },
    { text: '    this.drawDeviceMockup(zoom, x, y);', color: '#89dceb' },
    { text: '    this.renderHighPrecisionAnnotations();', color: '#f9e2af' },
    { text: '  }', color: '#cdd6f4' },
    { text: '}', color: '#89b4fa' },
  ];

  // Animated typing cursor
  const typedCharCount = Math.floor((t * 12) % 40);
  const activeLineIdx = 8;

  codeLines.forEach((line, idx) => {
    const ly = 65 + idx * 24;
    // Line number
    ctx.fillStyle = '#585b70';
    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.fillText((idx + 1).toString().padStart(2, ' '), editorX + 16, ly);

    // Code line
    ctx.fillStyle = line.color;
    let displayText = line.text;
    if (idx === activeLineIdx) {
      displayText = line.text.substring(0, Math.min(line.text.length, 18 + typedCharCount));
    }
    ctx.fillText(displayText, editorX + 50, ly);

    // Blinking cursor
    if (idx === activeLineIdx && Math.floor(t * 3) % 2 === 0) {
      const charWidth = ctx.measureText(displayText).width;
      ctx.fillStyle = '#f5e0dc';
      ctx.fillRect(editorX + 50 + charWidth + 2, ly - 13, 2, 16);
    }
  });

  // Bottom Terminal Panel
  const termH = 120;
  const termY = h - termH;
  ctx.fillStyle = '#11111b';
  ctx.fillRect(editorX, termY, w - editorX, termH);
  ctx.fillStyle = '#313244';
  ctx.fillRect(editorX, termY, w - editorX, 1);

  ctx.fillStyle = '#a6adc8';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText('TERMINAL  ·  zsh', editorX + 16, termY + 20);

  ctx.fillStyle = '#a6e3a1';
  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.fillText('➜  studiomotion git:(main) ✔ npm run build', editorX + 16, termY + 44);
  ctx.fillStyle = '#89b4fa';
  ctx.fillText('✓ Compilation complete in 184ms [AOT optimized]', editorX + 16, termY + 68);
  ctx.fillStyle = '#94e2d5';
  ctx.fillText('✓ All 10 unit tests passing cleanly (100% logic coverage)', editorX + 16, termY + 90);
}

/**
 * Draws a Mobile App simulation (Crypto / NeoBank)
 */
function drawMobileApp(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  // Mobile screen background
  ctx.fillStyle = '#0a0a0c';
  ctx.fillRect(0, 0, w, h);

  // Status Bar
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('9:41', 28, 28);
  ctx.fillText('5G  100%', w - 75, 28);

  // Balance Card
  const cardW = w - 40;
  ctx.fillStyle = '#181820';
  ctx.beginPath();
  ctx.roundRect(20, 50, cardW, 140, 20);
  ctx.fill();
  ctx.strokeStyle = '#27273a';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#8888a0';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('Total Net Worth', 40, 80);

  const animatedBalance = (24850.4 + Math.sin(t) * 15.2).toFixed(2);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.fillText(`$${animatedBalance}`, 40, 120);

  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('+14.2% this month', 40, 150);

  // Action Buttons (Send, Receive, Swap, Invest)
  const actions = ['Send', 'Receive', 'Swap', 'Cards'];
  const btnW = (w - 70) / 4;
  actions.forEach((act, i) => {
    const bx = 20 + i * (btnW + 10);
    const by = 210;
    ctx.fillStyle = '#1e1e2a';
    ctx.beginPath();
    ctx.roundRect(bx, by, btnW, 55, 14);
    ctx.fill();

    ctx.fillStyle = '#6366f1';
    ctx.beginPath();
    ctx.arc(bx + btnW / 2, by + 20, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(act, bx + btnW / 2, by + 44);
    ctx.textAlign = 'start';
  });

  // Transactions List
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText('Recent Activity', 24, 300);

  const txs = [
    { name: 'Apple Store NYC', date: 'Today, 2:15 PM', amount: '-$1,299.00', color: '#ffffff' },
    { name: 'Stripe Payout', date: 'Yesterday', amount: '+$4,820.50', color: '#10b981' },
    { name: 'Starbucks Coffee', date: 'Oct 14', amount: '-$6.45', color: '#ffffff' },
    { name: 'Figma Subscription', date: 'Oct 12', amount: '-$45.00', color: '#ffffff' },
  ];

  txs.forEach((tx, idx) => {
    const ty = 340 + idx * 56;
    ctx.fillStyle = '#161622';
    ctx.beginPath();
    ctx.roundRect(20, ty - 16, cardW, 48, 12);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(tx.name, 40, ty + 8);

    ctx.fillStyle = '#71718a';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(tx.date, 40, ty + 24);

    ctx.fillStyle = tx.color;
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(tx.amount, w - 40, ty + 14);
    ctx.textAlign = 'start';
  });
}

export const SAMPLE_RECORDINGS: DemoScreenSample[] = [
  {
    id: 'saas-dashboard',
    name: 'SaaS Cloud Analytics',
    description: 'Real-time telemetry, animated throughput charts, KPI counters and smooth cursor interactions',
    category: 'saas',
    duration: 15.0,
    aspectRatio: 16 / 9,
    drawFrame: drawSaasDashboard,
  },
  {
    id: 'code-ide',
    name: 'VS Code TypeScript',
    description: 'Full code editor with syntax highlighting, live typing simulation, and build terminal',
    category: 'code',
    duration: 15.0,
    aspectRatio: 16 / 9,
    drawFrame: drawCodeIde,
  },
  {
    id: 'mobile-app',
    name: 'Mobile Crypto & Bank App',
    description: 'Portrait 9:19.5 smartphone application with live transactions and interactive cards',
    category: 'mobile',
    duration: 15.0,
    aspectRatio: 9 / 19.5,
    drawFrame: drawMobileApp,
  },
];

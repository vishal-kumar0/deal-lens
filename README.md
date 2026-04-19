# DealLens — PE Deal Diligence Dashboard

A client-side React tool for PE partners to assess a target company's financial health within 30–60 seconds.

## Features

- **Onboarding Wizard**: Select business type, revenue model, and deal type
- **CSV Upload**: Drag-and-drop with fuzzy column auto-mapping
- **Sample Data**: Pre-loaded "Growth with Emerging Pressure" scenario
- **Executive Summary**: Bain/MBB-style deal thesis with LTM KPI cards
- **Industry Benchmarks**: Research-backed thresholds for 8 business types
- **EBITDA Bridge**: Waterfall chart showing Prior LTM → Current LTM movement
- **Customer Decomposition**: Stacked bar (New/Retained/Lost) with monthly/quarterly toggle
- **Insight Engine**: Rule-based atomic signals + composite multi-metric synthesis
- **Deal-Type Adaptation**: Growth Equity / Buyout / Distressed language framing

## Tech Stack

- React (Vite)
- Recharts
- PapaParse
- No backend — 100% client-side

## Getting Started

```bash
npm install
npm run dev
```

## Deployment

Deployed on Vercel at [deal-lens.vercel.app](https://deal-lens.vercel.app)

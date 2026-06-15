#!/usr/bin/env node

/**
 * Bootstraps the GitHub issue tracker substrate for COMMENCINGTHESCOURGE.
 * 
 * Run with: GITHUB_TOKEN=your_token node scripts/bootstrap-issues.js
 */

const fs = require('fs');
const path = require('path');

const CORE_REPOS = [
  "COMMENCINGTHESCOURGE/flux-chamber",
  "COMMENCINGTHESCOURGE/aetherion-continuum",
  "COMMENCINGTHESCOURGE/hyperpoly-terrain",
  "COMMENCINGTHESCOURGE/trench-builder"
];

const STANDARD_LABELS = [
  { name: "bug", color: "d73a4a", description: "Something isn't working" },
  { name: "enhancement", color: "a2eeef", description: "New feature or request" },
  { name: "bounty", color: "0E8A16", description: "Bounty attached to this issue" },
  { name: "documentation", color: "0075ca", description: "Improvements or additions to documentation" },
  { name: "wontfix", color: "ffffff", description: "This will not be worked on" }
];

// Extracted from automation_audit.py
const FINDINGS = [
  {
    title: "local_cpu dormant — 90% — fully hands-off",
    body: "**Status:** ✅ RUNNING — every 6h via cron job 560d8130ca87\n**Type:** Hermes cron — Python on Victus CPU\n**GPU:** RX 6400 (not utilized — numpy CPU only)\n**Limit:** ~500M integers per day on CPU\n\n**Bottleneck:** CPU-bound, no GPU acceleration for numpy\n\n**Suggested fix:** Add cupy/numba GPU acceleration to use RX 6400",
    labels: ["enhancement", "compute:local_cpu", "audit-auto"]
  },
  {
    title: "kaggle_t4 dormant — 10% — manual upload + run",
    body: "**Status:** ⚠️ MANUAL — CLI push broken, requires web upload\n**Type:** Kaggle Notebook — T4 GPU\n**GPU:** NVIDIA T4 (30 hrs/week free)\n**Limit:** 30 hrs/week, 12hr max per session\n\n**Bottleneck:** kaggle kernels push returns empty API response. Kernel must be manually uploaded via web UI, then manually clicked 'Run'.\n\n**Suggested fix:** Use Kaggle SDK (kagglesdk 0.1.23 installed) Python API instead of CLI. SDK has kernels_create() and kernels_initialize(). Alternative: Kaggle REST API via curl with bearer token.",
    labels: ["bug", "compute:kaggle_t4", "audit-auto"]
  },
  {
    title: "colab_t4 dormant — 15% — auto-saves output but needs manual run",
    body: "**Status:** ⚠️ MANUAL — notebook must be uploaded, free tier kills after 90min idle\n**Type:** Google Colab — T4 GPU\n**GPU:** NVIDIA T4 (free tier)\n**Limit:** 90min idle timeout, ~12hr max continuous\n\n**Bottleneck:** Free tier auto-terminates. Colab Pro ($10/mo) allows background execution. No programmatic trigger without Colab API.\n\n**Suggested fix:** Colab Pro + background execution. Or use pyngrok/nbformat to trigger execution programmatically.",
    labels: ["enhancement", "colab", "audit-auto"]
  },
  {
    title: "lightning_ai dormant — 0% — completely dormant",
    body: "**Status:** 💤 DORMANT — litai SDK installed but not utilized\n**Type:** Lightning AI Studio — L40S/A100 GPU\n**GPU:** L40S or A100 (credits required)\n**Limit:** Credit-based, studio must be manually started\n\n**Bottleneck:** litai SDK is LLM-only (no studio management). Studio must be started via web interface. Once running, can execute Python scripts.\n\n**Suggested fix:** Automate studio launch via Lightning REST API. Run sieve as persistent background process inside studio.",
    labels: ["enhancement", "compute:lightning_ai", "audit-auto"]
  },
  {
    title: "huggingface dormant — 0% — no space deployed",
    body: "**Status:** 💤 DORMANT — API responding (200) but no space deployed\n**Type:** HuggingFace Spaces — T4/A10G GPU\n**GPU:** T4 or A10G (free tier)\n**Limit:** Free tier: 16GB RAM, no GPU persistence\n\n**Bottleneck:** No Space deployed. Would need Gradio app wrapping the sieve. Can run continuously unlike Colab free tier.\n\n**Suggested fix:** Deploy HF Space with Gradio + sieve. Continuous uptime unlike Colab.",
    labels: ["enhancement", "compute:huggingface", "audit-auto"]
  },
  {
    title: "deepseek_api dormant — 0% — not configured",
    body: "**Status:** 💤 DORMANT — could verify solutions but not compute sieve\n**Type:** DeepSeek v4-pro — LLM verification\n**GPU:** N/A (API inference)\n**Limit:** API costs, not suitable for brute-force sieving\n\n**Bottleneck:** LLMs can verify Erdos-Straus solutions but can't efficiently search for them. Use as verification node only.\n\n**Suggested fix:** Use DeepSeek to verify top-N solutions found by other nodes. Adds mathematical rigor layer.",
    labels: ["enhancement", "compute:deepseek_api", "audit-auto"]
  }
];

const AUDIT_REPO = "COMMENCINGTHESCOURGE/erdos-straus-solver";

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error("Error: GITHUB_TOKEN environment variable is required.");
  process.exit(1);
}

const headers = {
  "Authorization": `token ${token}`,
  "Accept": "application/vnd.github.v3+json",
  "User-Agent": "automation-audit-sync"
};

async function fetchGithub(endpoint, method = "GET", body = null) {
  const url = `https://api.github.com${endpoint}`;
  const options = { method, headers: { ...headers } };
  if (body) {
    options.body = JSON.stringify(body);
    options.headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.text();
    console.error(`[!] API Error ${method} ${endpoint}: ${res.status} - ${err}`);
    return null;
  }
  
  if (res.status === 204) return true; // No content
  return res.json();
}

async function enableIssues(repo) {
  console.log(`Enabling issues for ${repo}...`);
  await fetchGithub(`/repos/${repo}`, "PATCH", { has_issues: true });
}

async function standardizeLabels(repo) {
  console.log(`Standardizing labels for ${repo}...`);
  const existingLabels = await fetchGithub(`/repos/${repo}/labels`);
  if (!existingLabels) return;

  const existingNames = new Set(existingLabels.map(l => l.name));

  for (const label of STANDARD_LABELS) {
    if (existingNames.has(label.name)) {
      // Update label
      await fetchGithub(`/repos/${repo}/labels/${label.name}`, "PATCH", {
        color: label.color,
        description: label.description
      });
    } else {
      // Create label
      await fetchGithub(`/repos/${repo}/labels`, "POST", label);
    }
  }
}

async function createAuditIssues() {
  console.log(`Filing automation_audit.py findings as issues in ${AUDIT_REPO}...`);
  
  // Create any missing labels first
  for (const finding of FINDINGS) {
    for (const labelName of finding.labels) {
      if (!STANDARD_LABELS.some(l => l.name === labelName)) {
        await fetchGithub(`/repos/${AUDIT_REPO}/labels`, "POST", {
          name: labelName,
          color: "FBCA04"
        });
      }
    }
    
    console.log(` - Filing issue: ${finding.title}`);
    await fetchGithub(`/repos/${AUDIT_REPO}/issues`, "POST", {
      title: finding.title,
      body: finding.body,
      labels: finding.labels
    });
  }
}

async function main() {
  console.log("=== Bootstrapping Issue Substrate ===");
  
  // Also include AUDIT_REPO in the repos to standardize labels on
  const allRepos = [...new Set([...CORE_REPOS, AUDIT_REPO])];

  for (const repo of allRepos) {
    await enableIssues(repo);
    await standardizeLabels(repo);
  }

  await createAuditIssues();
  console.log("=== Bootstrap Complete ===");
}

main().catch(console.error);

"use client";

import { useState } from "react";
import { Download, ExternalLink, FileText, Mail, Send } from "lucide-react";

import { cn } from "@/lib/utils/classnames";

type EmailStatus =
  | { state: "idle"; message: string }
  | { state: "sending"; message: string }
  | { state: "success"; message: string }
  | { state: "error"; message: string };

export function ReportExportPanel() {
  const [recipient, setRecipient] = useState("avery@northstarlabs.com");
  const [emailStatus, setEmailStatus] = useState<EmailStatus>({
    state: "idle",
    message: "Choose how to export or share this report.",
  });

  async function handleEmailReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailStatus({ state: "sending", message: "Preparing report email." });

    try {
      const response = await fetch("/api/report/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipient }),
      });
      const payload = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to email report PDF.");
      }

      setEmailStatus({
        state: "success",
        message: payload.message ?? `Report PDF prepared for ${recipient}.`,
      });
    } catch (error) {
      setEmailStatus({
        state: "error",
        message: error instanceof Error ? error.message : "Unable to email report PDF.",
      });
    }
  }

  return (
    <section className="rounded-lg border border-[#ddd4c4] bg-[#fbf8f1] p-4 print:hidden sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#28735d]">Output</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#ece3d3] text-[#28735d]">
              <FileText className="h-4 w-4" aria-hidden="true" />
            </span>
            <h2 className="text-lg font-semibold text-[#191712]">Dashboard report</h2>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#3f3a32]">
            Review the report below, then download it as a PDF, open the HTML report in another window, or send the PDF by email.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:w-[420px]">
          <a
            href="/api/report/pdf"
            download
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#191712] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2b261f]"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download PDF
          </a>
          <a
            href="/report"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#cfc3b0] px-4 py-3 text-sm font-semibold text-[#191712] transition hover:bg-[#f1eadf]"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Open HTML
          </a>
        </div>
      </div>

      <form onSubmit={handleEmailReport} className="mt-4 rounded-md border border-[#e4dac9] bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#191712]">
          <Mail className="h-4 w-4 text-[#28735d]" aria-hidden="true" />
          Email as PDF
        </div>
        <label htmlFor="report-recipient" className="mt-3 block text-xs font-semibold uppercase tracking-[0.16em] text-[#776d5f]">
          Recipient
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="report-recipient"
            type="email"
            required
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            className="min-h-11 min-w-0 flex-1 rounded-md border border-[#d8cfbf] bg-[#fbf8f1] px-3 py-2 text-sm text-[#191712] placeholder:text-[#8d8273]"
            placeholder="founder@example.com"
          />
          <button
            type="submit"
            disabled={emailStatus.state === "sending"}
            className={cn(
              "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition",
              emailStatus.state === "sending"
                ? "bg-[#d8cfbf] text-[#5f584c]"
                : "bg-[#28735d] text-white hover:bg-[#1f5d4a]",
            )}
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {emailStatus.state === "sending" ? "Sending" : "Email PDF"}
          </button>
        </div>
        <p
          className={cn(
            "mt-3 text-sm leading-6",
            emailStatus.state === "success"
              ? "text-[#28735d]"
              : emailStatus.state === "error"
                ? "text-[#9f1239]"
                : "text-[#5f584c]",
          )}
          role={emailStatus.state === "error" ? "alert" : "status"}
        >
          {emailStatus.message}
        </p>
      </form>
    </section>
  );
}

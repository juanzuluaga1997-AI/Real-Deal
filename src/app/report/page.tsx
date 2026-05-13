import type { Metadata } from "next";

import { ReportExportPanel } from "@/components/reports/report-export-panel";
import { formatLongDate } from "@/lib/utils/dates";
import { getDashboardReport } from "@/server/reports/report-service";

export const metadata: Metadata = {
  title: "Real Deal Relationship Report",
  description: "Dashboard relationship report for Real Deal.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ReportPage() {
  const report = await getDashboardReport();

  return (
    <main className="min-h-screen bg-[#f4f8fb] px-5 py-8 text-[#001426] print:bg-white">
      <article className="mx-auto max-w-5xl rounded-lg bg-white p-6 shadow-sm print:shadow-none">
        <header className="border-b border-[#d6e3ec] pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2fb65d]">Real Deal</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">{report.title}</h1>
          <p className="mt-2 text-sm text-[#456176]">
            {report.founder.name}, {report.founder.company} | Generated {formatLongDate(report.generatedAt)}
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#183147]">{report.founder.operatingFocus}</p>
        </header>

        <div className="border-b border-[#dbe8f1] py-6">
          <ReportExportPanel />
        </div>

        <section className="grid gap-3 py-6 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Average score", report.health.averageScore],
            ["Inner circle", report.health.innerCircleCount],
            ["At risk", report.health.atRiskCount],
            ["Active campaigns", report.health.activeCampaignCount],
            ["Tracked people", report.health.trackedPeopleCount],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-[#d8e4ed] bg-[#ffffff] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7fa0b8]">{label}</p>
              <p className="mt-2 font-mono text-2xl font-semibold text-[#001426]">{value}</p>
            </div>
          ))}
        </section>

        <section className="border-t border-[#dbe8f1] py-6">
          <h2 className="text-xl font-semibold">Daily focus queue</h2>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {report.recommendations.map((recommendation) => (
              <div key={recommendation.personId} className="rounded-md border border-[#d8e4ed] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">{recommendation.personName}</h3>
                    <p className="mt-1 text-sm text-[#456176]">
                      {recommendation.personRole}, {recommendation.personCompany}
                    </p>
                  </div>
                  <p className="rounded-md bg-[#001426] px-2 py-1 text-xs font-semibold text-white">
                    {recommendation.urgency}
                  </p>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#183147]">{recommendation.reason}</p>
                <p className="mt-3 text-sm font-semibold text-[#2fb65d]">{recommendation.suggestedAction}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-[#dbe8f1] py-6">
          <h2 className="text-xl font-semibold">Active campaigns</h2>
          <div className="mt-4 space-y-3">
            {report.activeCampaigns.map((campaign) => (
              <div key={campaign.id} className="rounded-md border border-[#d8e4ed] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-semibold">{campaign.title}</h3>
                  <span className="font-mono text-sm font-semibold">Health {campaign.health}</span>
                </div>
                <p className="mt-1 text-sm text-[#456176]">{campaign.stage}</p>
                <p className="mt-3 text-sm leading-6 text-[#183147]">{campaign.objective}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-[#dbe8f1] pt-6">
          <h2 className="text-xl font-semibold">Relationships losing momentum</h2>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {report.priorityRelationships.map((person) => (
              <div key={person.id} className="rounded-md border border-[#d8e4ed] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">{person.name}</h3>
                    <p className="mt-1 text-sm text-[#456176]">
                      {person.role}, {person.company}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-semibold">Score {person.socialEquityScore.total}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#183147]">{person.recommendedNextAction}</p>
              </div>
            ))}
          </div>
        </section>
      </article>
    </main>
  );
}

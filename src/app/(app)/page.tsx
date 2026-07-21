import Link from "next/link";
import {
  AlarmClock,
  ArrowRight,
  Clock,
  History,
  Inbox,
  Ticket,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VolumeChart } from "@/components/dashboard/volume-chart";
import { StatusDonut } from "@/components/dashboard/status-donut";
import { WorkloadList } from "@/components/dashboard/workload-list";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { TicketQueueItem } from "@/components/tickets/ticket-queue-item";
import {
  getActivityFeed,
  getDashboardStats,
  getOverdueCount,
  getSlaPolicy,
  getStatusDistribution,
  getTechnicianWorkload,
  getTicketVolume,
  getTickets,
} from "@/lib/data/repository";
import { formatHours, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, volume, distribution, workload, allTickets, overdueCount, feed, slaPolicy] =
    await Promise.all([
      getDashboardStats(),
      getTicketVolume(30),
      getStatusDistribution(),
      getTechnicianWorkload(),
      getTickets(),
      getOverdueCount(),
      getActivityFeed(7),
      getSlaPolicy(),
    ]);
  const queue = allTickets
    .filter((t) => ["open", "in_progress", "waiting_on_customer"].includes(t.status))
    .slice(0, 7);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your support operation — tickets, resolution times, and team load."
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open Tickets"
          value={formatNumber(stats.openTickets)}
          delta={stats.openTicketsDelta}
          spark={stats.spark.open}
          icon={Ticket}
          invertDelta
          sparkStroke="stroke-blue-500"
          sparkFill="fill-blue-500/10"
        />
        <StatCard
          label="Avg Resolution"
          value={formatHours(stats.avgResolutionHours)}
          delta={stats.avgResolutionDelta}
          spark={stats.spark.resolution}
          icon={Clock}
          invertDelta
          sparkStroke="stroke-amber-500"
          sparkFill="fill-amber-500/10"
        />
        <StatCard
          label="Resolved (7d)"
          value={formatNumber(stats.resolved7d)}
          delta={stats.resolved7dDelta}
          spark={stats.spark.resolved}
          icon={TrendingUp}
          sparkStroke="stroke-emerald-500"
          sparkFill="fill-emerald-500/10"
        />
        <StatCard
          label="Active Customers"
          value={formatNumber(stats.activeCustomers)}
          delta={stats.activeCustomersDelta}
          spark={stats.spark.customers}
          icon={Users}
          sparkStroke="stroke-primary"
          sparkFill="fill-primary/10"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle>Ticket Volume</CardTitle>
            <CardDescription>
              Created vs. resolved over the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VolumeChart data={volume} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>By Status</CardTitle>
            <CardDescription>Current distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <StatusDonut data={distribution} />
          </CardContent>
        </Card>
      </div>

      {/* Queue + workload row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="space-y-1.5">
              <CardTitle className="flex items-center gap-2">
                Ticket Queue
                {overdueCount > 0 && (
                  <Link
                    href="/tickets?overdue=true"
                    className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-500/25 dark:bg-red-500/15 dark:text-red-300"
                  >
                    <AlarmClock className="size-3" />
                    {overdueCount} overdue
                  </Link>
                )}
              </CardTitle>
              <CardDescription>Most recent open tickets</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/tickets">
                View all
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-3">
            {queue.length > 0 ? (
              <div className="divide-y">
                {queue.map((t) => (
                  <TicketQueueItem key={t.id} ticket={t} slaHours={slaPolicy} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Inbox}
                title="Queue is clear"
                description="No open tickets right now — nice work."
              />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Technician Workload</CardTitle>
            <CardDescription>Open tickets per technician</CardDescription>
          </CardHeader>
          <CardContent>
            {workload.length > 0 ? (
              <WorkloadList rows={workload} />
            ) : (
              <EmptyState
                icon={Users}
                title="No technicians"
                description="Add technicians to see workload."
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity row */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates across your workspace</CardDescription>
        </CardHeader>
        <CardContent>
          {feed.length > 0 ? (
            <ActivityFeed items={feed} />
          ) : (
            <EmptyState
              icon={History}
              title="No activity yet"
              description="Actions across the workspace will show up here."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { PageWrapper } from "@/components/layout/page-wrapper";
import { useGetDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { 
  Wallet, 
  ShoppingBag, 
  Activity, 
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data, isLoading } = useGetDashboard();

  if (isLoading || !data) return <PageWrapper title="Dashboard"><div className="animate-pulse text-muted-foreground">Loading...</div></PageWrapper>;

  const hasPendingBalance = data.myPendingBalance > 0;

  return (
    <PageWrapper 
      title="Overview" 
      description={`Here's what's happening at home — ${data.currentMonth}.`}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-none shadow-lg shadow-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-primary-foreground/90 flex items-center gap-2 text-base font-medium">
              <Wallet className="h-5 w-5" /> My Pending Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-display font-bold">
              {formatCurrency(data.myPendingBalance)}
            </div>
            {hasPendingBalance ? (
              <p className="mt-2 text-primary-foreground/80 text-sm">You have outstanding payments.</p>
            ) : (
              <p className="mt-2 text-primary-foreground/80 text-sm flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> All caught up!
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground flex items-center gap-2 text-base font-medium">
              <ShoppingBag className="h-5 w-5 text-secondary" /> Household Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-display font-bold text-foreground">
              {formatCurrency(data.totalMonthlyExpenses)}
            </div>
            <p className="mt-2 text-muted-foreground text-sm">Shared purchases this month.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertCircle className="h-5 w-5 text-destructive" /> Actions Needed
              </CardTitle>
              {data.actionsNeeded.length > 0 && (
                <Badge variant="destructive">{data.actionsNeeded.length}</Badge>
              )}
            </div>
            <CardDescription>Tasks requiring your attention</CardDescription>
          </CardHeader>
          <CardContent>
            {data.actionsNeeded.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm">No pending actions right now.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.actionsNeeded.map((action) => (
                  <div key={action.id} className="flex items-center justify-between p-3 rounded-xl border bg-muted/30 gap-3">
                    <div className="flex gap-3 items-start min-w-0">
                      <div className="mt-2 h-2 w-2 rounded-full bg-destructive shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{action.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(action.amount)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-5 w-5 text-secondary" /> Recent Activity
            </CardTitle>
            <CardDescription>Latest updates from the house</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm">No recent activity.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {data.recentActivity.map((activity, i) => (
                  <div key={activity.id} className="flex gap-3 relative">
                    {i !== data.recentActivity.length - 1 && (
                      <div className="absolute left-3.5 top-8 bottom-[-20px] w-px bg-border" />
                    )}
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary/10 border border-secondary/20 z-10">
                      <div className="h-2 w-2 rounded-full bg-secondary" />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-sm text-foreground leading-snug">
                        <span className="font-semibold">{activity.user}</span>{" "}
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(activity.timestamp), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}

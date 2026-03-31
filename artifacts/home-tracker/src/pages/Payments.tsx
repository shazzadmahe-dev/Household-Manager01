import { PageWrapper } from "@/components/layout/page-wrapper";
import { useGetPayments, useGetMe, useMarkPaymentPaid, useVerifyPayment, useUndoPayment } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle2, AlertCircle, Clock, Undo2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export default function Payments() {
  const { data: payments = [] } = useGetPayments();
  const { data: me } = useGetMe();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'mine' | 'to_verify'>('all');

  const markPaid = useMarkPaymentPaid();
  const verify = useVerifyPayment();
  const undo = useUndoPayment();

  const handleAction = (mutation: any, id: number) => {
    mutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3"/> Pending</Badge>;
      case 'paid_unverified': return <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3"/> Awaiting Verification</Badge>;
      case 'verified': return <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3"/> Verified</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const filteredPayments = payments.filter(p => {
    if (filter === 'mine') return p.userId === me?.id;
    if (filter === 'to_verify') return p.status === 'paid_unverified' && (me?.role === 'admin' || p.referenceType === 'expense'); // simplified rule
    return true;
  }).sort((a, b) => {
    // Sort by status: pending first, then unverified, then verified
    const order = { pending: 0, paid_unverified: 1, verified: 2 };
    return order[a.status] - order[b.status];
  });

  return (
    <PageWrapper title="Payments" description="Settle up and track who owes what.">
      
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <Button 
          variant={filter === 'all' ? 'default' : 'secondary'} 
          onClick={() => setFilter('all')}
          className="rounded-full"
        >
          All Payments
        </Button>
        <Button 
          variant={filter === 'mine' ? 'default' : 'secondary'} 
          onClick={() => setFilter('mine')}
          className="rounded-full"
        >
          My Dues
        </Button>
        {me?.role === 'admin' && (
          <Button 
            variant={filter === 'to_verify' ? 'default' : 'secondary'} 
            onClick={() => setFilter('to_verify')}
            className="rounded-full"
          >
            Needs Verification
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {filteredPayments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
            No payments found for this filter.
          </div>
        ) : (
          filteredPayments.map(payment => {
            const isMine = payment.userId === me?.id;
            const canVerify = payment.status === 'paid_unverified' && (me?.role === 'admin'); // or expense creator

            return (
              <Card key={payment.id} className={`transition-all duration-300 ${isMine && payment.status === 'pending' ? 'border-destructive shadow-sm shadow-destructive/10' : ''}`}>
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-muted flex items-center justify-center font-bold text-foreground border">
                      {payment.user.displayName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base">{payment.user.displayName}</span>
                        <span className="text-muted-foreground text-sm">owes for</span>
                        <Badge variant="outline" className="capitalize">{payment.referenceType}</Badge>
                      </div>
                      <p className="text-sm font-medium mt-1">{payment.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Month: {payment.month}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full border-t sm:border-0 pt-3 sm:pt-0 mt-2 sm:mt-0">
                    <div className="text-left sm:text-right">
                      <div className="text-xl font-bold">{formatCurrency(payment.amount)}</div>
                      <div className="mt-1">{getStatusBadge(payment.status)}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Actions for the person who owes */}
                      {isMine && payment.status === 'pending' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleAction(markPaid, payment.id)}
                          isLoading={markPaid.isPending}
                          className="bg-accent text-accent-foreground hover:bg-accent/90"
                        >
                          Mark Paid
                        </Button>
                      )}

                      {/* Verify Action */}
                      {canVerify && (
                        <Button 
                          size="sm" 
                          variant="default"
                          className="bg-success hover:bg-success/90 text-success-foreground"
                          onClick={() => handleAction(verify, payment.id)}
                          isLoading={verify.isPending}
                        >
                          Verify
                        </Button>
                      )}

                      {/* Undo Action */}
                      {payment.status !== 'pending' && (me?.role === 'admin' || isMine) && (
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          title="Undo Status"
                          onClick={() => handleAction(undo, payment.id)}
                          isLoading={undo.isPending}
                        >
                          <Undo2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </div>

                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </PageWrapper>
  );
}

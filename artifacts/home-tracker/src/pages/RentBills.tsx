import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  useGetMe, useGetRentSettings, useGetBills, useCreateBill, useDeleteBill,
  useGetPayments, useMarkPaymentPaid, useVerifyPayment, useUndoPayment, useGetUsers,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Home, Wifi, Zap, Plus, Settings, Trash2, Receipt, CheckCircle2, Clock, AlertCircle, Undo2, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

type BillType = "electricity" | "wifi" | "other";

function StatusBadge({ status }: { status: string }) {
  if (status === "verified") return <Badge variant="success" className="gap-1 text-xs shrink-0"><CheckCircle2 className="h-3 w-3" />Paid</Badge>;
  if (status === "paid_unverified") return <Badge variant="warning" className="gap-1 text-xs shrink-0"><Clock className="h-3 w-3" />Awaiting</Badge>;
  return <Badge variant="destructive" className="gap-1 text-xs shrink-0"><AlertCircle className="h-3 w-3" />Pending</Badge>;
}

export default function RentBills() {
  const { data: user } = useGetMe();
  const { data: rentSettings = [] } = useGetRentSettings();
  const { data: bills = [] } = useGetBills();
  const { data: allPayments = [] } = useGetPayments();
  const { data: allUsers = [] } = useGetUsers();
  const isAdmin = user?.role === "admin";
  const canManageBills = user?.role === "admin" || user?.role === "roommate_plus";
  const queryClient = useQueryClient();

  const markPaid = useMarkPaymentPaid();
  const verify = useVerifyPayment();
  const undo = useUndoPayment();

  const [isBillDialogOpen, setIsBillDialogOpen] = useState(false);
  const createBill = useCreateBill();
  const deleteBill = useDeleteBill();

  const [billType, setBillType] = useState<BillType>("electricity");
  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billMonth, setBillMonth] = useState(format(new Date(), "yyyy-MM"));
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  // Default: all users selected when dialog opens
  useEffect(() => {
    if (isBillDialogOpen && allUsers.length > 0) {
      setSelectedUserIds(allUsers.map(u => u.id));
    }
  }, [isBillDialogOpen, allUsers]);

  const rentPayments = allPayments.filter(p => p.referenceType === "rent");
  const billPayments = allPayments.filter(p => p.referenceType === "bill");
  const totalRent = rentSettings.reduce((sum, r) => sum + r.amount, 0);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
    queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
  };

  const handleAction = (mutation: any, id: number) => {
    mutation.mutate({ id }, { onSuccess: invalidateAll });
  };

  const toggleUser = (id: number) => {
    setSelectedUserIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCreateBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) return;
    createBill.mutate(
      {
        data: {
          type: billType,
          name: billName || (billType.charAt(0).toUpperCase() + billType.slice(1)),
          amount: parseFloat(billAmount),
          month: billMonth,
          splitAmongAll: selectedUserIds.length === allUsers.length,
          ...(selectedUserIds.length < allUsers.length ? { userIds: selectedUserIds } : {}),
        } as any,
      },
      {
        onSuccess: () => {
          invalidateAll();
          setIsBillDialogOpen(false);
          setBillAmount("");
          setBillName("");
        },
      }
    );
  };

  const getIcon = (type: string) => {
    if (type === "electricity") return <Zap className="h-5 w-5 text-accent" />;
    if (type === "wifi") return <Wifi className="h-5 w-5 text-secondary" />;
    return <Home className="h-5 w-5 text-primary" />;
  };

  const perPersonPreview = billAmount && selectedUserIds.length > 0
    ? parseFloat(billAmount) / selectedUserIds.length
    : null;

  return (
    <PageWrapper title="Rent & Bills" description="Monthly recurring household expenses and payments.">
      <div className="space-y-8">

        {/* RENT SECTION */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display font-semibold flex items-center gap-2">
              <Home className="h-5 w-5 text-primary" /> Base Rent
            </h2>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => window.location.href = "/admin"} className="gap-2">
                <Settings className="h-4 w-4" /> Manage
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="bg-primary/5 border-primary/20 sm:col-span-2 lg:col-span-3">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total House Rent</p>
                  <p className="text-3xl font-display font-bold text-primary">{formatCurrency(totalRent)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Due</p>
                  <p className="text-lg font-semibold">1st of Month</p>
                </div>
              </CardContent>
            </Card>

            {rentSettings.map((rent) => {
              const payment = rentPayments.find(p => p.userId === rent.userId);
              const isMine = user?.id === rent.userId;
              return (
                <Card key={rent.id} className={isMine ? "border-primary shadow-sm" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-secondary/10 text-secondary flex items-center justify-center font-bold text-sm">
                          {rent.user.displayName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-sm">{rent.user.displayName}</span>
                      </div>
                      {isMine && <span className="text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded-full">You</span>}
                    </div>
                    <div className="text-2xl font-bold mb-3">{formatCurrency(rent.amount)}</div>
                    {payment ? (
                      <div className="flex items-center justify-between gap-2">
                        <StatusBadge status={payment.status} />
                        <div className="flex gap-1">
                          {isMine && payment.status === "pending" && (
                            <Button size="sm" className="h-7 text-xs" onClick={() => handleAction(markPaid, payment.id)} isLoading={markPaid.isPending}>Mark Paid</Button>
                          )}
                          {isAdmin && payment.status === "paid_unverified" && (
                            <Button size="sm" variant="default" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => handleAction(verify, payment.id)} isLoading={verify.isPending}>Verify</Button>
                          )}
                          {payment.status !== "pending" && (isMine || isAdmin) && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Undo" onClick={() => handleAction(undo, payment.id)}>
                              <Undo2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No payment record yet</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* BILLS SECTION */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display font-semibold flex items-center gap-2">
              <Receipt className="h-5 w-5 text-secondary" /> Monthly Bills
            </h2>
            {canManageBills && (
              <Button size="sm" onClick={() => setIsBillDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Add Bill
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bills.length === 0 ? (
              <div className="col-span-full p-8 text-center border-2 border-dashed rounded-xl bg-muted/30">
                <p className="text-muted-foreground text-sm">No bills added yet.</p>
              </div>
            ) : (
              bills.map((bill) => {
                const payments = billPayments.filter(p => p.referenceId === bill.id);
                return (
                  <Card key={bill.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                            {getIcon(bill.type)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold">{bill.name}</h3>
                            <p className="text-xs text-muted-foreground">
                              {bill.month} · {bill.splitAmongAll ? "Split equally" : `Split among ${payments.length}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-lg font-bold">{formatCurrency(bill.amount)}</span>
                          {canManageBills && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => {
                              if (confirm("Delete this bill?")) {
                                deleteBill.mutate({ id: bill.id }, { onSuccess: invalidateAll });
                              }
                            }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {payments.length > 0 && (
                        <div className="border-t pt-3 space-y-2">
                          {payments.map(p => {
                            const isMine = user?.id === p.userId;
                            return (
                              <div key={p.id} className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                                    {p.user.displayName.charAt(0)}
                                  </div>
                                  <span className="text-sm font-medium truncate">{isMine ? "You" : p.user.displayName}</span>
                                  <StatusBadge status={p.status} />
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-sm font-semibold">{formatCurrency(p.amount)}</span>
                                  {isMine && p.status === "pending" && (
                                    <Button size="sm" className="h-7 text-xs ml-1" onClick={() => handleAction(markPaid, p.id)} isLoading={markPaid.isPending}>Pay</Button>
                                  )}
                                  {(isAdmin || user?.role === "roommate_plus") && p.status === "paid_unverified" && (
                                    <Button size="sm" className="h-7 text-xs ml-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleAction(verify, p.id)} isLoading={verify.isPending}>Verify</Button>
                                  )}
                                  {p.status !== "pending" && (isMine || isAdmin) && (
                                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Undo" onClick={() => handleAction(undo, p.id)}>
                                      <Undo2 className="h-3.5 w-3.5 text-muted-foreground" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </section>
      </div>

      <Dialog open={isBillDialogOpen} onOpenChange={setIsBillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Monthly Bill</DialogTitle>
            <DialogDescription>Create a new bill and choose who to split it with.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateBill} className="space-y-4">
            <div className="space-y-2">
              <Label>Bill Type</Label>
              <select
                className="flex h-11 w-full rounded-lg border-2 border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-primary"
                value={billType}
                onChange={(e) => setBillType(e.target.value as BillType)}
              >
                <option value="electricity">Electricity</option>
                <option value="wifi">WiFi / Internet</option>
                <option value="other">Other Utilities</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Input value={billName} onChange={(e) => setBillName(e.target.value)} placeholder="e.g., ConEdison March" />
            </div>
            <div className="space-y-2">
              <Label>Total Amount</Label>
              <Input type="number" step="0.01" min="0" required value={billAmount} onChange={(e) => setBillAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Month</Label>
              <Input type="month" required value={billMonth} onChange={(e) => setBillMonth(e.target.value)} />
            </div>

            {/* Split With */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" /> Split With
              </Label>
              <div className="border-2 border-input rounded-lg p-3 space-y-2">
                {allUsers.map(u => (
                  <label key={u.id} className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5">
                    <Checkbox
                      checked={selectedUserIds.includes(u.id)}
                      onCheckedChange={() => toggleUser(u.id)}
                    />
                    <span className="text-sm font-medium">{u.displayName}</span>
                    {u.id === user?.id && <span className="text-xs text-muted-foreground">(you)</span>}
                  </label>
                ))}
                {selectedUserIds.length === 0 && (
                  <p className="text-xs text-destructive px-1">Select at least one person.</p>
                )}
              </div>
              {perPersonPreview !== null && selectedUserIds.length > 0 && (
                <p className="text-xs text-muted-foreground px-1">
                  {formatCurrency(perPersonPreview)} per person · {selectedUserIds.length} of {allUsers.length} selected
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsBillDialogOpen(false)}>Cancel</Button>
              <Button type="submit" isLoading={createBill.isPending} disabled={selectedUserIds.length === 0}>Add Bill</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}

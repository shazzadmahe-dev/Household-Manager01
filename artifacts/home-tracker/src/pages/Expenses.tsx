import { PageWrapper } from "@/components/layout/page-wrapper";
  import {
    useGetExpenses, useCreateExpense, useDeleteExpense, useGetUsers, useGetMe,
    useMarkPaymentPaid, useVerifyPayment, useUndoPayment,
  } from "@workspace/api-client-react";
  import { Card, CardContent } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
  import { Badge } from "@/components/ui/badge";
  import { formatCurrency } from "@/lib/utils";
  import { format } from "date-fns";
  import { ShoppingCart, Plus, Users, Trash2, CheckCircle2, Clock, AlertCircle, Undo2 } from "lucide-react";
  import { useState } from "react";
  import { useQueryClient } from "@tanstack/react-query";

  function PaymentStatus({ status }: { status: string }) {
    if (status === "verified") return <Badge variant="success" className="text-[10px] gap-1 px-1.5 py-0.5"><CheckCircle2 className="h-2.5 w-2.5"/>Paid</Badge>;
    if (status === "paid_unverified") return <Badge variant="warning" className="text-[10px] gap-1 px-1.5 py-0.5"><Clock className="h-2.5 w-2.5"/>Awaiting</Badge>;
    return <Badge variant="destructive" className="text-[10px] gap-1 px-1.5 py-0.5"><AlertCircle className="h-2.5 w-2.5"/>Pending</Badge>;
  }

  export default function Expenses() {
    const { data: expenses = [], isLoading } = useGetExpenses();
    const { data: users = [] } = useGetUsers();
    const { data: me } = useGetMe();
    const queryClient = useQueryClient();

    const [isAddOpen, setIsAddOpen] = useState(false);
    const createExpense = useCreateExpense();
    const deleteExpense = useDeleteExpense();
    const markPaid = useMarkPaymentPaid();
    const verify = useVerifyPayment();
    const undo = useUndoPayment();

    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [includedUsers, setIncludedUsers] = useState<number[]>([]);

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    };

    const handlePaymentAction = (mutation: any, id: number) => {
      mutation.mutate({ id }, { onSuccess: invalidate });
    };

    const handleToggleUser = (userId: number) => {
      setIncludedUsers(prev =>
        prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      );
    };

    const handleAddSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (includedUsers.length === 0) {
        alert("Please select at least one person to split with.");
        return;
      }
      createExpense.mutate(
        { data: { description, amount: parseFloat(amount), includedUserIds: includedUsers } },
        {
          onSuccess: () => {
            invalidate();
            setIsAddOpen(false);
            setDescription("");
            setAmount("");
            setIncludedUsers([]);
          }
        }
      );
    };

    const openAdd = () => {
      setIncludedUsers(users.map(u => u.id));
      setIsAddOpen(true);
    };

    const isAdminOrPlus = me?.role === "admin" || me?.role === "roommate_plus";

    return (
      <PageWrapper title="Household Expenses" description="Track shared purchases and settle up.">
        <div className="flex justify-end mb-5">
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" /> Add Expense
          </Button>
        </div>

        {expenses.length === 0 && !isLoading ? (
          <div className="text-center py-14 px-4 bg-muted/30 rounded-2xl border-2 border-dashed">
            <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <h3 className="text-lg font-display font-semibold mb-1">No expenses yet</h3>
            <p className="text-muted-foreground text-sm mb-5">Add shared purchases to split costs.</p>
            <Button onClick={openAdd}>Add First Expense</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {expenses.map((expense) => {
              const splitAmount = expense.amount / expense.includedUserIds.length;
              const canDelete = me?.role === "admin" || me?.id === expense.addedBy;
              const isExpenseCreator = me?.id === expense.addedBy;

              return (
                <Card key={expense.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    {/* Header */}
                    <div className="p-4 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold">{expense.description}</h3>
                          <Badge variant="secondary" className="font-normal text-xs">{format(new Date(expense.createdAt), "MMM d")}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Added by {expense.addedByUser.displayName} · {expense.includedUserIds.length} ways
                        </p>
                      </div>
                      <div className="flex items-start gap-2 shrink-0">
                        <div className="text-right">
                          <p className="text-xl font-bold">{formatCurrency(expense.amount)}</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(splitAmount)}/person</p>
                        </div>
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 -mt-0.5"
                            onClick={() => {
                              if (confirm("Delete this expense?")) {
                                deleteExpense.mutate({ id: expense.id }, { onSuccess: invalidate });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Per-person payment rows */}
                    <div className="border-t bg-muted/30 divide-y">
                      {expense.payments.map(p => {
                        const isMine = me?.id === p.userId;
                        const canVerifyThis = (isExpenseCreator || isAdminOrPlus) && p.status === "paid_unverified" && !isMine;
                        const canMarkPaid = isMine && p.status === "pending";
                        const canUndo = p.status !== "pending" && (isMine || isAdminOrPlus);

                        return (
                          <div key={p.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="h-7 w-7 rounded-full bg-secondary/10 flex items-center justify-center text-xs font-bold text-secondary shrink-0">
                                {p.user.displayName.charAt(0)}
                              </div>
                              <span className="text-sm font-medium truncate">
                                {isMine ? <span className="text-primary font-semibold">You</span> : p.user.displayName}
                              </span>
                              <PaymentStatus status={p.status} />
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-sm font-semibold text-muted-foreground">{formatCurrency(p.amount)}</span>
                              {canMarkPaid && (
                                <Button size="sm" className="h-7 px-3 text-xs" onClick={() => handlePaymentAction(markPaid, p.id)} isLoading={markPaid.isPending}>
                                  Mark Paid
                                </Button>
                              )}
                              {canVerifyThis && (
                                <Button size="sm" className="h-7 px-3 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => handlePaymentAction(verify, p.id)} isLoading={verify.isPending}>
                                  Verify
                                </Button>
                              )}
                              {canUndo && (
                                <Button size="icon" variant="ghost" className="h-7 w-7" title="Undo" onClick={() => handlePaymentAction(undo, p.id)}>
                                  <Undo2 className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="max-w-sm mx-auto">
            <DialogHeader>
              <DialogTitle>Add Expense</DialogTitle>
              <DialogDescription>Add a purchase and choose who to split it with.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>What did you buy?</Label>
                <Input required value={description} onChange={e => setDescription(e.target.value)} placeholder="Groceries, cleaning supplies..." />
              </div>
              <div className="space-y-1.5">
                <Label>Total Amount ($)</Label>
                <Input required type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Users className="h-4 w-4" /> Split Among</Label>
                <div className="grid grid-cols-2 gap-2">
                  {users.map(u => (
                    <label
                      key={u.id}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-colors ${includedUsers.includes(u.id) ? "border-primary bg-primary/5" : "border-border bg-background"}`}
                    >
                      <input type="checkbox" className="accent-primary w-4 h-4 shrink-0" checked={includedUsers.includes(u.id)} onChange={() => handleToggleUser(u.id)} />
                      <span className="text-sm font-medium">{u.displayName}</span>
                    </label>
                  ))}
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button type="submit" isLoading={createExpense.isPending}>Add Expense</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageWrapper>
    );
  }
  
import { PageWrapper } from "@/components/layout/page-wrapper";
  import { useGetUsers, useCreateUser, useUpdateUser, useDeleteUser, useGetRentSettings, useUpdateRentSettings, useGetMe } from "@workspace/api-client-react";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Badge } from "@/components/ui/badge";
  import { useState, useEffect } from "react";
  import { useQueryClient } from "@tanstack/react-query";
  import { Shield, UserPlus, Settings2, Save, Trash2 } from "lucide-react";

  type Role = "admin" | "roommate_plus" | "roommate";

  function RoleBadge({ role }: { role: string }) {
    if (role === "admin") return <Badge variant="default" className="text-[10px] h-5">Admin</Badge>;
    if (role === "roommate_plus") return <Badge variant="secondary" className="text-[10px] h-5 bg-amber-100 text-amber-800 border-amber-200">Roommate+</Badge>;
    return <Badge variant="outline" className="text-[10px] h-5">Roommate</Badge>;
  }

  export default function Admin() {
    const { data: me } = useGetMe();
    const { data: users = [] } = useGetUsers();
    const { data: rentSettings = [] } = useGetRentSettings();
    const queryClient = useQueryClient();

    const createUser = useCreateUser();
    const [newUsername, setNewUsername] = useState("");
    const [newDisplayName, setNewDisplayName] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newRole, setNewRole] = useState<Role>("roommate");

    const handleCreateUser = (e: React.FormEvent) => {
      e.preventDefault();
      createUser.mutate(
        { data: { username: newUsername, displayName: newDisplayName, password: newPassword, role: newRole } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/users"] });
            queryClient.invalidateQueries({ queryKey: ["/api/rent"] });
            setNewUsername(""); setNewDisplayName(""); setNewPassword("");
          }
        }
      );
    };

    const updateRent = useUpdateRentSettings();
    const [rentInputs, setRentInputs] = useState<Record<number, string>>({});

    useEffect(() => {
      if (rentSettings.length > 0) {
        const initial: Record<number, string> = {};
        rentSettings.forEach(r => { initial[r.userId] = r.amount.toString(); });
        setRentInputs(prev => Object.keys(prev).length === 0 ? initial : prev);
      }
    }, [rentSettings]);

    const handleUpdateRent = () => {
      const payload = rentSettings.map(r => ({
        userId: r.userId,
        amount: parseFloat(rentInputs[r.userId] || "0"),
        dueDay: r.dueDay
      }));
      updateRent.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/rent"] });
          queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
        }
      });
    };

    const updateUser = useUpdateUser();
    const deleteUser = useDeleteUser();

    const handleRoleChange = (userId: number, newRole: Role) => {
      updateUser.mutate({ id: userId, data: { role: newRole as any } }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/users"] })
      });
    };

    return (
      <PageWrapper title="Admin Settings" description="Manage roommates, roles, and rent amounts.">
        <div className="space-y-6">

          {/* Add Roommate */}
          <Card className="border-primary/20">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base"><UserPlus className="h-5 w-5 text-primary"/> Add Roommate</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Username</Label>
                    <Input required value={newUsername} onChange={e=>setNewUsername(e.target.value)} placeholder="login name" autoComplete="off" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Display Name</Label>
                    <Input required value={newDisplayName} onChange={e=>setNewDisplayName(e.target.value)} placeholder="shown to others" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Password</Label>
                    <Input required type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} autoComplete="new-password" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Role</Label>
                    <select
                      className="flex h-11 w-full rounded-lg border-2 border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      value={newRole} onChange={e=>setNewRole(e.target.value as Role)}
                    >
                      <option value="roommate">Roommate</option>
                      <option value="roommate_plus">Roommate+ (can add bills)</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <Button type="submit" className="w-full" isLoading={createUser.isPending}>Create Account</Button>
              </form>
            </CardContent>
          </Card>

          {/* Manage Users */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Shield className="h-5 w-5 text-secondary"/> Manage Users</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {users.map(u => (
                  <div key={u.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-semibold">{u.displayName}</span>
                        <RoleBadge role={u.role} />
                        {u.id === me?.id && <span className="text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">You</span>}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">@{u.username}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:border-primary"
                        value={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value as Role)}
                        disabled={u.id === me?.id}
                      >
                        <option value="roommate">Roommate</option>
                        <option value="roommate_plus">Roommate+</option>
                        <option value="admin">Admin</option>
                      </select>
                      {u.id !== me?.id && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => {
                          if(confirm(`Delete ${u.displayName}?`)) {
                            deleteUser.mutate({ id: u.id }, { onSuccess: () => queryClient.invalidateQueries({queryKey: ["/api/users"]})});
                          }
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Rent Configuration */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base"><Settings2 className="h-5 w-5 text-accent"/> Rent per Person</CardTitle>
                <Button size="sm" onClick={handleUpdateRent} isLoading={updateRent.isPending} className="gap-1.5 shrink-0">
                  <Save className="h-4 w-4"/> Save
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Set individual rent amounts. Saving will update all pending rent payments.</p>
              {rentSettings.map(rent => (
                <div key={rent.id} className="flex items-center gap-3 p-3 border rounded-xl bg-card">
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                    {rent.user.displayName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{rent.user.displayName}</p>
                  </div>
                  <div className="relative w-28 shrink-0">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">$</span>
                    <Input
                      type="number"
                      className="pl-7 text-base font-bold h-10"
                      value={rentInputs[rent.userId] || ""}
                      onChange={(e) => setRentInputs(prev => ({...prev, [rent.userId]: e.target.value}))}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

        </div>
      </PageWrapper>
    );
  }
  
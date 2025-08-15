"use client";

import { useEffect, useState } from "react";
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { ToolPageHeader } from "@/components/tool-page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, documentId } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";

export default function TeamSettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  // Define Team type for type safety
  type Team = {
    id: string;
    name: string;
    description: string;
    members: Array<{ userId: string; name: string; email: string; role: string }>;
    projects: string[];
    integrations: Array<{ id: string; name: string; status: string }>;
  };
  const [team, setTeam] = useState<Team | null>(null);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [editState, setEditState] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    (async () => {
      try {
        // 1) Prefer teams where current user's UID is in scalar memberIds array
        //    (array-contains works on primitives, not nested objects)
        let teamDoc: Team | null = null;
        const byMemberIdsQ = query(collection(db, "teams"), where("memberIds", "array-contains", user.uid));
        const byMemberIdsSnap = await getDocs(byMemberIdsQ);
        if (!byMemberIdsSnap.empty) {
          teamDoc = { id: byMemberIdsSnap.docs[0].id, ...byMemberIdsSnap.docs[0].data() } as Team;
        }

        // 2) Fallback: read users/{uid}.teamId and load that team
        if (!teamDoc) {
          const userDocSnap = await getDoc(doc(db, "users", user.uid));
          const teamIdFromUser = userDocSnap.exists() ? (userDocSnap.data() as any)?.teamId : undefined;
          if (typeof teamIdFromUser === "string" && teamIdFromUser) {
            const teamSnap = await getDoc(doc(db, "teams", teamIdFromUser));
            if (teamSnap.exists()) {
              teamDoc = { id: teamSnap.id, ...teamSnap.data() } as Team;
            }
          }
        }

        // 3) Legacy fallback (if your auth user object was extended elsewhere)
        if (!teamDoc && typeof (user as any).teamId === "string") {
          const docSnap = await getDoc(doc(db, "teams", (user as any).teamId));
          if (docSnap.exists()) teamDoc = { id: docSnap.id, ...docSnap.data() } as Team;
        }
        if (!teamDoc) throw new Error("Team not found");

        // Fetch only the team's projects (limit 10 per 'in' query)
        const projectIds: string[] = Array.isArray((teamDoc as any).projects) ? (teamDoc as any).projects : [];
        let allProjectsArr: any[] = [];
        if (projectIds.length > 0) {
          try {
            const chunk = <T,>(arr: T[], size: number) => arr.reduce<T[][]>((acc, _, i) => (i % size ? acc : [...acc, arr.slice(i, i + size)]), []);
            const chunks = chunk(projectIds, 10);
            for (const ids of chunks) {
              const projQ = query(collection(db, "projects"), where(documentId(), "in", ids));
              const projSnap = await getDocs(projQ);
              allProjectsArr = allProjectsArr.concat(projSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            }
          } catch (projErr) {
            console.warn("Project fetch skipped due to permissions or network:", projErr);
            // Fallback to minimal project list with IDs only
            allProjectsArr = projectIds.map(id => ({ id, name: id }));
          }
        }

        setTeam(teamDoc);
        setAllProjects(allProjectsArr);
        setEditState({
          name: (teamDoc as any).name ?? "",
          description: (teamDoc as any).description ?? "",
          members: Array.isArray((teamDoc as any).members) ? (teamDoc as any).members : [],
          projects: allProjectsArr.filter(p => Array.isArray((teamDoc as any).projects) && (teamDoc as any).projects.includes(p.id)),
          integrations: Array.isArray((teamDoc as any).integrations) ? (teamDoc as any).integrations : [],
        });
      } catch (e: any) {
        console.error("TeamSettings load error:", e);
        setError("Failed to load team data.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.uid]);

  // Handlers for editing
  const handleInputChange = (e: any) => {
    setEditState((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handleMemberRoleChange = (id: string, role: string) => {
    setEditState((prev: any) => ({
      ...prev,
      members: prev.members.map((m: any) => (m.userId === id ? { ...m, role } : m)),
    }));
  };
  const handleProjectToggle = (projectId: string) => {
    setEditState((prev: any) => {
      const exists = prev.projects.some((p: any) => p.id === projectId);
      return {
        ...prev,
        projects: exists
          ? prev.projects.filter((p: any) => p.id !== projectId)
          : [...prev.projects, allProjects.find((p) => p.id === projectId)],
      };
    });
  };
  const handleSave = async () => {
    if (!team) return;
    setSaving(true);
    setError(null);
    try {
      await updateDoc(doc(db, "teams", team.id), {
        name: editState.name,
        description: editState.description,
        members: editState.members,
        projects: editState.projects.map((p: any) => p.id),
        integrations: editState.integrations,
      });
      setTeam({ ...team, ...editState });
    } catch (e: any) {
      setError("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FeatureGate feature="team_management" requiredTier="agency" showUpgrade>
    <main className="container mx-auto py-6 space-y-8">
      <ToolPageHeader
        title="Team Settings"
        description="Configure your team's details, members, integrations, and permissions"
        badges={[
          { label: "Collaboration", variant: "secondary" },
          { label: "Enterprise", variant: "outline", className: "text-primary border-primary/40" },
        ]}
        showBreadcrumb
      />
      {loading && <div>Loading...</div>}
  {error && <div className="text-destructive-foreground">{error}</div>}
      {!loading && team && editState && (
        <>
          {/* Team Info */}
          <Card>
            <CardHeader>
              <CardTitle>Team Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Team Name</label>
                <input
                  className="input input-bordered w-full"
                  name="name"
                  value={editState.name}
                  onChange={handleInputChange}
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  className="input input-bordered w-full min-h-[60px]"
                  name="description"
                  value={editState.description}
                  onChange={handleInputChange}
                  disabled={saving}
                />
              </div>
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left py-1">Name</th>
                    <th className="text-left py-1">Email</th>
                    <th className="text-left py-1">Role</th>
                    <th className="text-left py-1">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {editState.members.map((m: any) => (
                    <tr key={m.userId} className="border-b last:border-0">
                      <td className="py-2">{m.name}</td>
                      <td>{m.email}</td>
                      <td>
                        <select
                          className="input input-sm"
                          value={m.role}
                          onChange={(e) => handleMemberRoleChange(m.userId, e.target.value)}
                          disabled={saving}
                        >
                          <option value="owner">Owner</option>
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                        </select>
                      </td>
                      <td>
                        <button className="btn btn-xs btn-error" disabled={saving}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="btn btn-sm btn-primary" disabled={saving}>Invite Member</button>
            </CardContent>
          </Card>

          {/* Project Assignment */}
          <Card>
            <CardHeader>
              <CardTitle>Project Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {allProjects.map((project) => (
                  <div key={project.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={editState.projects.some((p: any) => p.id === project.id)}
                      onChange={() => handleProjectToggle(project.id)}
                      disabled={saving}
                    />
                    <span>{project.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Permissions Matrix */}
          <Card>
            <CardHeader>
              <CardTitle>Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left py-1">Feature</th>
                    <th className="text-center py-1">Owner</th>
                    <th className="text-center py-1">Admin</th>
                    <th className="text-center py-1">Member</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: "Manage Projects" },
                    { feature: "Invite Members" },
                    { feature: "View Analytics" },
                    { feature: "Edit Settings" },
                  ].map((row) => (
                    <tr key={row.feature} className="border-b last:border-0">
                      <td className="py-2">{row.feature}</td>
                      <td className="text-center">
                        <input type="checkbox" className="checkbox" defaultChecked disabled />
                      </td>
                      <td className="text-center">
                        <input type="checkbox" className="checkbox" defaultChecked />
                      </td>
                      <td className="text-center">
                        <input type="checkbox" className="checkbox" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Integrations */}
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {editState.integrations.map((integration: any) => (
                <div key={integration.id} className="flex items-center gap-2">
                  <span className="font-medium">{integration.name}</span>
                  {integration.status === "connected" ? (
                    <span className="badge badge-success">Connected</span>
                  ) : (
                    <button className="btn btn-xs btn-primary" disabled={saving}>Connect</button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card>
            <CardHeader>
              <CardTitle>Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <button className="btn btn-sm btn-error w-full" disabled={saving}>Delete Team</button>
                <button className="btn btn-sm btn-warning w-full" disabled={saving}>Transfer Ownership</button>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </>
      )}
  </main>
  </FeatureGate>
  );
}

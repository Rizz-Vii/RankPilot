"use client";

import { FeatureGate } from "@/components/subscription/FeatureGate";
import { ToolPageHeader } from "@/components/tool-page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";

export default function TeamSettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  // Define Team type for type safety
  type Team = {
    id: string;
    name: string;
    description: string;
    members: Array<{
      userId: string;
      name: string;
      email: string;
      role: string;
    }>;
    projects: string[] | ProjectLite[];
    integrations: Array<{ id: string; name: string; status: string }>;
  };
  const [team, setTeam] = useState<Team | null>(null);
  interface ProjectLite {
    id: string;
    name?: string;
    [k: string]: unknown;
  }
  const [allProjects, setAllProjects] = useState<ProjectLite[]>([]);
  interface EditState {
    name: string;
    description: string;
    members: Team["members"];
    projects: ProjectLite[];
    integrations: Team["integrations"];
  }
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    void (async () => {
      try {
        // 1) Prefer teams where current user's UID is in scalar memberIds array
        //    (array-contains works on primitives, not nested objects)
        let teamDoc: Team | null = null;
        const byMemberIdsQ = query(
          collection(db, "teams"),
          where("memberIds", "array-contains", user.uid)
        );
        const byMemberIdsSnap = await getDocs(byMemberIdsQ);
        if (!byMemberIdsSnap.empty) {
          teamDoc = {
            id: byMemberIdsSnap.docs[0].id,
            ...byMemberIdsSnap.docs[0].data(),
          } as Team;
        }

        // 2) Fallback: read users/{uid}.teamId and load that team
        if (!teamDoc) {
          const userDocSnap = await getDoc(doc(db, "users", user.uid));
          const userData = userDocSnap.exists()
            ? (userDocSnap.data() as Record<string, unknown>)
            : undefined;
          const teamIdFromUser = userData
            ? (userData.teamId as string | undefined)
            : undefined;
          if (typeof teamIdFromUser === "string" && teamIdFromUser) {
            const teamSnap = await getDoc(doc(db, "teams", teamIdFromUser));
            if (teamSnap.exists()) {
              teamDoc = { id: teamSnap.id, ...teamSnap.data() } as Team;
            }
          }
        }

        // 3) Legacy fallback (if your auth user object was extended elsewhere)
        if (
          !teamDoc &&
          typeof (user as unknown as Record<string, unknown>).teamId ===
            "string"
        ) {
          const docSnap = await getDoc(
            doc(
              db,
              "teams",
              (user as unknown as Record<string, unknown>).teamId as string
            )
          );
          if (docSnap.exists())
            teamDoc = { id: docSnap.id, ...docSnap.data() } as Team;
        }
        if (!teamDoc) throw new Error("Team not found");

        // Fetch only the team's projects (limit 10 per 'in' query)
        const teamData = teamDoc as unknown as Record<string, unknown>;
        const projectIds: string[] = Array.isArray(teamData.projects)
          ? (teamData.projects as unknown as string[])
          : [];
        let allProjectsArr: unknown[] = [];
        if (projectIds.length > 0) {
          try {
            const chunk = <T,>(arr: T[], size: number) =>
              arr.reduce<T[][]>(
                (acc, _, i) =>
                  i % size ? acc : [...acc, arr.slice(i, i + size)],
                []
              );
            const chunks = chunk(projectIds, 10);
            for (const ids of chunks) {
              const projQ = query(
                collection(db, "projects"),
                where(documentId(), "in", ids)
              );
              const projSnap = await getDocs(projQ);
              allProjectsArr = allProjectsArr.concat(
                projSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
              );
            }
          } catch (projErr) {
            console.warn(
              "Project fetch skipped due to permissions or network:",
              projErr
            );
            // Fallback to minimal project list with IDs only
            allProjectsArr = projectIds.map((id) => ({ id, name: id }));
          }
        }

        setTeam(teamDoc);
        setAllProjects(allProjectsArr as ProjectLite[]);
        {
          const td = teamDoc as unknown as Record<string, unknown>;
          setEditState({
            name: (td.name as string) ?? "",
            description: (td.description as string) ?? "",
            members: Array.isArray(td.members)
              ? (td.members as Team["members"])
              : [],
            projects: (allProjectsArr as ProjectLite[]).filter(
              (p) =>
                Array.isArray(td.projects) &&
                (td.projects as unknown as string[]).includes(p.id)
            ) as ProjectLite[],
            integrations: Array.isArray(td.integrations)
              ? (td.integrations as Team["integrations"])
              : [],
          });
        }
      } catch (err: unknown) {
        // Keeping error logged for diagnostics (lint: variable intentionally used)
        console.error("TeamSettings load error:", err);
        setError("Failed to load team data.");
      } finally {
        setLoading(false);
      }
    })();
    // Including full user object ensures refetch on auth context change beyond UID.
  }, [user]);

  // Handlers for editing
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setEditState((prev) =>
      prev ? { ...prev, [e.target.name]: e.target.value } : prev
    );
  };
  const handleMemberRoleChange = (id: string, role: string) => {
    setEditState((prev) =>
      prev
        ? {
            ...prev,
            members: prev.members.map((m) =>
              m.userId === id ? { ...m, role } : m
            ),
          }
        : prev
    );
  };
  const handleProjectToggle = (projectId: string) => {
    setEditState((prev) => {
      if (!prev) return prev;
      const exists = prev.projects.some((p) => p.id === projectId);
      return {
        ...prev,
        projects: exists
          ? prev.projects.filter((p) => p.id !== projectId)
          : [...prev.projects, allProjects.find((p) => p.id === projectId)!],
      };
    });
  };
  const handleSave = useCallback(async () => {
    if (!team) return;
    setSaving(true);
    setError(null);
    try {
      if (!editState) return;
      await updateDoc(doc(db, "teams", team.id), {
        name: editState.name,
        description: editState.description,
        members: editState.members,
        projects: editState.projects.map((p) => p.id),
        integrations: editState.integrations,
      });
      setTeam({ ...team, ...editState } as Team);
    } catch {
      setError("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }, [team, editState]);

  return (
    <FeatureGate feature="team_management" requiredTier="agency" showUpgrade>
      <main className="container mx-auto py-6 space-y-8">
        <ToolPageHeader
          title="Team Settings"
          description="Configure your team's details, members, integrations, and permissions"
          badges={[
            { label: "Collaboration", variant: "secondary" },
            {
              label: "Enterprise",
              variant: "outline",
              className: "text-primary border-primary/40",
            },
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
                  <label className="block text-sm font-medium mb-1">
                    Team Name
                  </label>
                  <input
                    className="input input-bordered w-full"
                    name="name"
                    value={editState.name}
                    onChange={handleInputChange}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Description
                  </label>
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
                    {editState.members.map(
                      (m: {
                        userId: string;
                        name: string;
                        email: string;
                        role: string;
                      }) => (
                        <tr key={m.userId} className="border-b last:border-0">
                          <td className="py-2">{m.name}</td>
                          <td>{m.email}</td>
                          <td>
                            <select
                              className="input input-sm"
                              value={m.role}
                              onChange={(e) =>
                                handleMemberRoleChange(m.userId, e.target.value)
                              }
                              disabled={saving}
                            >
                              <option value="owner">Owner</option>
                              <option value="admin">Admin</option>
                              <option value="member">Member</option>
                            </select>
                          </td>
                          <td>
                            <button
                              className="btn btn-xs btn-error"
                              disabled={saving}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
                <button className="btn btn-sm btn-primary" disabled={saving}>
                  Invite Member
                </button>
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
                        checked={editState.projects.some(
                          (p: ProjectLite) => p.id === project.id
                        )}
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
                          <input
                            type="checkbox"
                            className="checkbox"
                            defaultChecked
                            disabled
                          />
                        </td>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            className="checkbox"
                            defaultChecked
                          />
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
                {editState.integrations.map(
                  (integration: {
                    id: string;
                    name: string;
                    status: string;
                  }) => (
                    <div
                      key={integration.id}
                      className="flex items-center gap-2"
                    >
                      <span className="font-medium">{integration.name}</span>
                      {integration.status === "connected" ? (
                        <span className="badge badge-success">Connected</span>
                      ) : (
                        <button
                          className="btn btn-xs btn-primary"
                          disabled={saving}
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  )
                )}
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card>
              <CardHeader>
                <CardTitle>Danger Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <button
                    className="btn btn-sm btn-error w-full"
                    disabled={saving}
                  >
                    Delete Team
                  </button>
                  <button
                    className="btn btn-sm btn-warning w-full"
                    disabled={saving}
                  >
                    Transfer Ownership
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                className="btn btn-primary"
                onClick={() => {
                  void handleSave();
                }}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </>
        )}
      </main>
    </FeatureGate>
  );
}

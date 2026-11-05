"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { adminService } from "@/services/admin.service";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/common/Button";
import Badge from "@/components/common/Badge";
import Modal from "@/components/common/Modal";
import EmptyState from "@/components/common/EmptyState";
import { getInitials, formatRole } from "@/lib/auth";
import {
  Users,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  Lock,
  Sparkles,
  ArrowUpDown,
  Home,
  Briefcase,
  Compass,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function AdminUsersPage() {
  const { user: currentAdmin } = useAuth();

  // Query state
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [statusModalUser, setStatusModalUser] = useState(null);
  const [roleModalUser, setRoleModalUser] = useState(null);
  const [newRole, setNewRole] = useState("PATIENT");
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchUsers = useCallback(
    async (pageToLoad = 1) => {
      try {
        setIsLoading(true);
        const res = await adminService.getUsers({
          page: pageToLoad,
          limit: 10,
          search: search.trim() || undefined,
          role: roleFilter || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
        });

        const list = res?.data || res?.users || [];
        setUsers(list);
        if (res?.pagination) {
          setPagination(res.pagination);
        }
      } catch (err) {
        console.error("Failed to load users:", err);
        toast.error("Failed to load users", {
          description: err.message || "Please check your network connection.",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [search, roleFilter, statusFilter]
  );

  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  // Handle Search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers(1);
  };

  // View user details
  const handleOpenDetails = async (user) => {
    try {
      setSelectedUser(user);
      setIsDetailsOpen(true);
      // Fetch full details with addresses
      const res = await adminService.getUserById(user.id);
      if (res?.user || res?.data) {
        setSelectedUser(res.user || res.data);
      }
    } catch (err) {
      console.error("Failed to fetch detailed user record:", err);
    }
  };

  // Status toggle confirmation
  const handleStatusToggle = async () => {
    if (!statusModalUser) return;
    try {
      setIsActionLoading(true);
      const newStatus = !statusModalUser.status;
      await adminService.updateUserStatus(statusModalUser.id, { status: newStatus });
      toast.success(
        `User ${newStatus ? "Activated" : "Deactivated"}`,
        {
          description: `${statusModalUser.name}'s account status has been updated.`,
        }
      );
      setStatusModalUser(null);
      await fetchUsers(pagination.page);
    } catch (err) {
      console.error("Status update failed:", err);
      toast.error("Failed to update status", {
        description: err.message,
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Role change confirmation
  const handleRoleChange = async () => {
    if (!roleModalUser) return;
    try {
      setIsActionLoading(true);
      await adminService.updateUserRole(roleModalUser.id, { role: newRole });
      toast.success("Role Updated", {
        description: `${roleModalUser.name}'s role changed to ${newRole}.`,
      });
      setRoleModalUser(null);
      await fetchUsers(pagination.page);
    } catch (err) {
      console.error("Role update failed:", err);
      toast.error("Failed to update role", {
        description: err.message,
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  // RBAC guard: Non-admin UI protection
  if (currentAdmin && currentAdmin.role !== "ADMIN") {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Access Restricted: Administrator Privileges Required
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            The User Management directory is strictly restricted to verified platform administrators. Your authenticated account is currently registered under role: <span className="font-bold text-slate-800">{currentAdmin.role}</span>.
          </p>
          <div className="pt-2">
            <Link href="/dashboard">
              <Button variant="primary" size="md">
                Return to Patient Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getRoleBadge = (role) => {
    switch (role) {
      case "ADMIN":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            <ShieldCheck className="w-3 h-3 text-purple-600" />
            ADMIN
          </span>
        );
      case "DOCTOR":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
            <Sparkles className="w-3 h-3 text-teal-600" />
            DOCTOR
          </span>
        );
      case "PATIENT":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
            PATIENT
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        badge="Governance & RBAC"
        title="User & Access Management"
        description="Search, inspect, and configure access permissions, account statuses, and clinical roles across the HealthSync AI ecosystem."
      />

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search users by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-20 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:outline-none focus:border-blue-500"
            >
              <option value="">All Roles</option>
              <option value="PATIENT">Patient</option>
              <option value="DOCTOR">Doctor</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive / Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-1/4" />
            <div className="space-y-3 pt-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-xl" />
              ))}
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={Users}
              title="No users found"
              description="No user records matched your search query or selected filter criteria."
              action={{
                label: "Reset Search & Filters",
                onClick: () => {
                  setSearch("");
                  setRoleFilter("");
                  setStatusFilter("all");
                },
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase tracking-wider font-bold text-slate-500">
                  <th className="py-3.5 px-6">User Account</th>
                  <th className="py-3.5 px-4">Contact Phone</th>
                  <th className="py-3.5 px-4">Assigned Role</th>
                  <th className="py-3.5 px-4">Account Status</th>
                  <th className="py-3.5 px-4">Registered Date</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {users.map((u) => {
                  const isCurrentAdmin = String(u.id) === String(currentAdmin?.id);
                  const isActive = u.status !== false;

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Name & Email */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                            {getInitials(u.name || "User")}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isCurrentAdmin && (
                                <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded font-medium border border-blue-100">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-300" />
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-4 px-4 text-slate-600">
                        {u.phone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {u.phone}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not set</span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="py-4 px-4">{getRoleBadge(u.role)}</td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Suspended
                          </span>
                        )}
                      </td>

                      {/* Registered Date */}
                      <td className="py-4 px-4 text-slate-500">
                        {u.createdAt ? (
                          new Date(u.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        ) : (
                          "---"
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View details */}
                          <button
                            onClick={() => handleOpenDetails(u)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Inspect user details and addresses"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Change role */}
                          <button
                            onClick={() => {
                              setRoleModalUser(u);
                              setNewRole(u.role || "PATIENT");
                            }}
                            disabled={isCurrentAdmin}
                            className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            title={
                              isCurrentAdmin
                                ? "Cannot alter your own admin role"
                                : "Change user role"
                            }
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>

                          {/* Status toggle */}
                          <button
                            onClick={() => setStatusModalUser(u)}
                            disabled={isCurrentAdmin}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                              isActive
                                ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={
                              isCurrentAdmin
                                ? "Cannot suspend your own admin account"
                                : isActive
                                ? "Deactivate user account"
                                : "Activate user account"
                            }
                          >
                            {isActive ? (
                              <UserX className="w-4 h-4" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {users.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <p>
              Showing{" "}
              <span className="font-semibold text-slate-800">
                {(pagination.page - 1) * pagination.limit + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-slate-800">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-800">
                {pagination.total}
              </span>{" "}
              registered users
            </p>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchUsers(pagination.page - 1)}
                disabled={pagination.page <= 1 || isLoading}
                className="px-2.5"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>

              <span className="px-3 py-1 text-slate-700 font-semibold bg-slate-50 rounded-lg border border-slate-200">
                {pagination.page} / {pagination.totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchUsers(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || isLoading}
                className="px-2.5"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* User Details Drawer / Modal */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title="Clinical User Dossier"
        description="Comprehensive account profile and registered diagnostic sample collection addresses."
        maxWidth="max-w-2xl"
      >
        {selectedUser && (
          <div className="space-y-5">
            {/* User Profile Header */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shrink-0">
                {getInitials(selectedUser.name || "User")}
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-slate-900 truncate">
                    {selectedUser.name}
                  </h4>
                  {getRoleBadge(selectedUser.role)}
                </div>
                <p className="text-xs text-slate-500">{selectedUser.email}</p>
                <p className="text-[11px] text-slate-400">
                  User ID: #{selectedUser.id} • Registered:{" "}
                  {selectedUser.createdAt
                    ? new Date(selectedUser.createdAt).toLocaleDateString()
                    : "---"}
                </p>
              </div>
            </div>

            {/* Profile Attributes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white border border-slate-200/80">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">
                  Phone
                </span>
                <span className="font-semibold text-slate-800">
                  {selectedUser.phone || "Not provided"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200/80">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">
                  Date of Birth
                </span>
                <span className="font-semibold text-slate-800">
                  {selectedUser.dateOfBirth || "Not provided"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200/80">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">
                  Gender
                </span>
                <span className="font-semibold text-slate-800">
                  {selectedUser.gender || "Not specified"}
                </span>
              </div>
            </div>

            {/* Registered Addresses */}
            <div className="space-y-2.5">
              <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>Registered Collection Addresses ({selectedUser.addresses?.length || 0})</span>
              </h5>

              {selectedUser.addresses && selectedUser.addresses.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedUser.addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="p-3 rounded-xl border border-slate-200/80 bg-white text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">
                          {addr.fullName} ({addr.addressType})
                        </span>
                        {addr.isDefault && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            Default Address
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600">
                        {addr.addressLine1}
                        {addr.addressLine2 ? `, ${addr.addressLine2}` : ""},{" "}
                        {addr.city}, {addr.state} — {addr.pincode}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Phone: {addr.phone}
                        {addr.landmark ? ` • Landmark: ${addr.landmark}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 text-center text-xs text-slate-400 border border-slate-100">
                  This user has not registered any sample collection addresses yet.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDetailsOpen(false)}
              >
                Close Dossier
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Role Change Modal */}
      <Modal
        isOpen={!!roleModalUser}
        onClose={() => !isActionLoading && setRoleModalUser(null)}
        title="Modify Access Role"
        maxWidth="max-w-md"
      >
        {roleModalUser && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Update authorization role for{" "}
              <span className="font-bold text-slate-900">{roleModalUser.name}</span>.
              This modifies their system privileges immediately.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">
                Select Platform Role:
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:border-blue-500"
              >
                <option value="PATIENT">PATIENT (Standard Diagnostic Patient)</option>
                <option value="DOCTOR">DOCTOR (Clinical Practitioner)</option>
                <option value="ADMIN">ADMIN (Platform Administrator)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRoleModalUser(null)}
                disabled={isActionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRoleChange}
                isLoading={isActionLoading}
              >
                Confirm Role Update
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Status Toggle Modal */}
      <Modal
        isOpen={!!statusModalUser}
        onClose={() => !isActionLoading && setStatusModalUser(null)}
        title={
          statusModalUser?.status !== false
            ? "Deactivate User Account"
            : "Reactivate User Account"
        }
        maxWidth="max-w-md"
      >
        {statusModalUser && (
          <div className="space-y-4">
            <div
              className={`flex items-start gap-3 p-3.5 rounded-2xl text-xs ${
                statusModalUser.status !== false
                  ? "bg-rose-50 border border-rose-100 text-rose-800"
                  : "bg-emerald-50 border border-emerald-100 text-emerald-800"
              }`}
            >
              <AlertTriangle
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  statusModalUser.status !== false
                    ? "text-rose-600"
                    : "text-emerald-600"
                }`}
              />
              <div>
                <p className="font-semibold">
                  {statusModalUser.status !== false
                    ? `Deactivate ${statusModalUser.name}?`
                    : `Reactivate ${statusModalUser.name}?`}
                </p>
                <p className="mt-0.5 opacity-90">
                  {statusModalUser.status !== false
                    ? "The user will immediately be locked out from logging in and accessing clinical APIs."
                    : "The user will regain standard access to their patient account."}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStatusModalUser(null)}
                disabled={isActionLoading}
              >
                Cancel
              </Button>
              <Button
                variant={statusModalUser.status !== false ? "danger" : "primary"}
                size="sm"
                onClick={handleStatusToggle}
                isLoading={isActionLoading}
              >
                {statusModalUser.status !== false ? "Deactivate Account" : "Reactivate Account"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}


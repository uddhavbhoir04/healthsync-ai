"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/common/Button";
import Badge from "@/components/common/Badge";
import Modal from "@/components/common/Modal";
import EmptyState from "@/components/common/EmptyState";
import { usersService } from "@/services/users.service";
import {
  MapPin,
  Plus,
  Home,
  Briefcase,
  Compass,
  Star,
  CheckCircle2,
  Trash2,
  Edit2,
  AlertTriangle,
  Phone,
  Building,
  Navigation,
} from "lucide-react";
import { toast } from "sonner";

const addressFormSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^[+]?[0-9\s\-()]{7,20}$/, "Enter a valid phone number (7-20 digits)"),
  addressType: z.enum(["HOME", "WORK", "OTHER"]),
  addressLine1: z.string().trim().min(3, "Address line 1 is required").max(255),
  addressLine2: z.string().trim().max(255).optional().or(z.literal("")),
  city: z.string().trim().min(2, "City is required").max(100),
  state: z.string().trim().min(2, "State is required").max(100),
  pincode: z.string().trim().min(3, "Pincode is required").max(20),
  landmark: z.string().trim().max(255).optional().or(z.literal("")),
  isDefault: z.boolean().optional().default(false),
});

export default function AddressesPage() {
  const [addresses, setAddresses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [settingDefaultId, setSettingDefaultId] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(addressFormSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      addressType: "HOME",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      pincode: "",
      landmark: "",
      isDefault: false,
    },
  });

  const fetchAddresses = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await usersService.getAddresses();
      const list = res?.data || res?.addresses || [];
      setAddresses(list);
    } catch (err) {
      console.error("Failed to load addresses:", err);
      toast.error("Failed to load addresses", {
        description: err.message || "Please refresh the page to try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const handleOpenAddModal = () => {
    setEditingAddress(null);
    reset({
      fullName: "",
      phone: "",
      addressType: "HOME",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      pincode: "",
      landmark: "",
      isDefault: addresses.length === 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (addr) => {
    setEditingAddress(addr);
    reset({
      fullName: addr.fullName || "",
      phone: addr.phone || "",
      addressType: addr.addressType || "HOME",
      addressLine1: addr.addressLine1 || "",
      addressLine2: addr.addressLine2 || "",
      city: addr.city || "",
      state: addr.state || "",
      pincode: addr.pincode || "",
      landmark: addr.landmark || "",
      isDefault: !!addr.isDefault,
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (values) => {
    try {
      setIsSubmitting(true);
      const payload = {
        fullName: values.fullName.trim(),
        phone: values.phone.trim(),
        addressType: values.addressType,
        addressLine1: values.addressLine1.trim(),
        addressLine2: values.addressLine2?.trim() || null,
        city: values.city.trim(),
        state: values.state.trim(),
        pincode: values.pincode.trim(),
        landmark: values.landmark?.trim() || null,
        isDefault: !!values.isDefault,
      };

      if (editingAddress) {
        await usersService.updateAddress(editingAddress.id, payload);
        toast.success("Address Updated", {
          description: "Your address details have been successfully saved.",
        });
      } else {
        await usersService.createAddress(payload);
        toast.success("Address Added", {
          description: "New collection address has been registered.",
        });
      }

      setIsModalOpen(false);
      setEditingAddress(null);
      await fetchAddresses();
    } catch (err) {
      console.error("Save address failed:", err);
      toast.error("Failed to save address", {
        description: err.message || "Please verify your information.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetDefault = async (addressId) => {
    try {
      setSettingDefaultId(addressId);
      await usersService.setDefaultAddress(addressId);
      toast.success("Default Address Set", {
        description: "Future diagnostic sample collections will use this address by default.",
      });
      await fetchAddresses();
    } catch (err) {
      console.error("Set default failed:", err);
      toast.error("Failed to update default address", {
        description: err.message,
      });
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      setIsDeleting(true);
      await usersService.deleteAddress(deleteConfirmId);
      toast.success("Address Deleted", {
        description: "The address has been removed from your profile.",
      });
      setDeleteConfirmId(null);
      await fetchAddresses();
    } catch (err) {
      console.error("Delete address failed:", err);
      toast.error("Failed to delete address", {
        description: err.message,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "WORK":
        return <Briefcase className="w-3.5 h-3.5 text-indigo-600" />;
      case "OTHER":
        return <Compass className="w-3.5 h-3.5 text-amber-600" />;
      case "HOME":
      default:
        return <Home className="w-3.5 h-3.5 text-blue-600" />;
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case "WORK":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
            <Briefcase className="w-3 h-3" /> Work
          </span>
        );
      case "OTHER":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
            <Compass className="w-3 h-3" /> Other
          </span>
        );
      case "HOME":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
            <Home className="w-3 h-3" /> Home
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          badge="Sample Collection Logistics"
          title="My Addresses"
          description="Manage home and work addresses used by certified phlebotomists for specimen collection and report delivery."
        />

        <Button
          variant="primary"
          size="md"
          onClick={handleOpenAddModal}
          className="font-semibold shadow-xs shrink-0 self-start sm:self-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Address
        </Button>
      </div>

      {/* Address Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-20 bg-slate-200 rounded-full" />
                <div className="h-5 w-16 bg-slate-100 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-3/4 bg-slate-200 rounded" />
                <div className="h-3 w-full bg-slate-100 rounded" />
                <div className="h-3 w-2/3 bg-slate-100 rounded" />
              </div>
              <div className="h-8 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : addresses.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <EmptyState
            icon={MapPin}
            title="No addresses registered yet"
            description="Add your home, office, or secondary address so clinical phlebotomists can visit you for blood test sample collection."
            action={{
              label: "Add Your First Address",
              onClick: handleOpenAddModal,
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {addresses.map((addr) => {
            const isDefault = !!addr.isDefault;
            return (
              <div
                key={addr.id}
                className={`relative flex flex-col justify-between p-6 rounded-3xl bg-white border transition-all duration-200 shadow-xs hover:shadow-md ${
                  isDefault
                    ? "border-blue-500 ring-2 ring-blue-500/10"
                    : "border-slate-200/90 hover:border-slate-300"
                }`}
              >
                <div>
                  {/* Top Header: Type & Default Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      {getTypeBadge(addr.addressType)}
                    </div>

                    {isDefault ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                        <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                        Default Address
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSetDefault(addr.id)}
                        disabled={settingDefaultId === addr.id}
                        className="text-[11px] text-slate-500 hover:text-blue-600 font-medium transition-colors cursor-pointer"
                      >
                        {settingDefaultId === addr.id ? "Updating..." : "Set as Default"}
                      </button>
                    )}
                  </div>

                  {/* Recipient info */}
                  <h3 className="text-sm font-bold text-slate-900 mb-0.5">
                    {addr.fullName}
                  </h3>

                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mb-3">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{addr.phone}</span>
                  </p>

                  {/* Address lines */}
                  <div className="space-y-1 text-xs text-slate-600 border-t border-slate-100 pt-3">
                    <p className="font-medium text-slate-800">
                      {addr.addressLine1}
                    </p>
                    {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                    <p className="text-slate-500">
                      {addr.city}, {addr.state} — {addr.pincode}
                    </p>
                    {addr.landmark && (
                      <p className="text-[11px] text-slate-400 italic flex items-center gap-1 pt-1">
                        <Navigation className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>Landmark: {addr.landmark}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditModal(addr)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Edit address"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(addr.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete address"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {!isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDefault(addr.id)}
                      disabled={settingDefaultId === addr.id}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Use as Default
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Address Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={editingAddress ? "Edit Collection Address" : "Add New Collection Address"}
        description="Provide accurate location details so our certified nurse/phlebotomist can locate your residence smoothly."
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Contact Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Alex Morgan"
                {...register("fullName")}
                className={`w-full text-xs p-2.5 rounded-xl border bg-white focus:outline-none focus:border-blue-500 ${
                  errors.fullName ? "border-rose-400 bg-rose-50/20" : "border-slate-200"
                }`}
              />
              {errors.fullName && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.fullName.message}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Contact Phone <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                placeholder="+1 (555) 000-0000"
                {...register("phone")}
                className={`w-full text-xs p-2.5 rounded-xl border bg-white focus:outline-none focus:border-blue-500 ${
                  errors.phone ? "border-rose-400 bg-rose-50/20" : "border-slate-200"
                }`}
              />
              {errors.phone && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.phone.message}</p>
              )}
            </div>

            {/* Address Type */}
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Address Category
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "HOME", label: "Home", icon: Home },
                  { value: "WORK", label: "Work / Office", icon: Briefcase },
                  { value: "OTHER", label: "Other", icon: Compass },
                ].map(({ value, label, icon: Icon }) => (
                  <label
                    key={value}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs font-medium has-checked:border-blue-600 has-checked:bg-blue-50 has-checked:text-blue-700 has-checked:font-semibold"
                  >
                    <input
                      type="radio"
                      value={value}
                      {...register("addressType")}
                      className="sr-only"
                    />
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Address Line 1 */}
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Address Line 1 (Street, Flat/Building) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Apartment 4B, 742 Evergreen Terrace"
                {...register("addressLine1")}
                className={`w-full text-xs p-2.5 rounded-xl border bg-white focus:outline-none focus:border-blue-500 ${
                  errors.addressLine1 ? "border-rose-400 bg-rose-50/20" : "border-slate-200"
                }`}
              />
              {errors.addressLine1 && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.addressLine1.message}</p>
              )}
            </div>

            {/* Address Line 2 */}
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Address Line 2 (Area, Colony, Optional)
              </label>
              <input
                type="text"
                placeholder="West Springfield Sector 9"
                {...register("addressLine2")}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* City */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                City <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Springfield"
                {...register("city")}
                className={`w-full text-xs p-2.5 rounded-xl border bg-white focus:outline-none focus:border-blue-500 ${
                  errors.city ? "border-rose-400 bg-rose-50/20" : "border-slate-200"
                }`}
              />
              {errors.city && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.city.message}</p>
              )}
            </div>

            {/* State */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                State / Region <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Oregon"
                {...register("state")}
                className={`w-full text-xs p-2.5 rounded-xl border bg-white focus:outline-none focus:border-blue-500 ${
                  errors.state ? "border-rose-400 bg-rose-50/20" : "border-slate-200"
                }`}
              />
              {errors.state && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.state.message}</p>
              )}
            </div>

            {/* Pincode */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Postal Pincode / ZIP <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="97477"
                {...register("pincode")}
                className={`w-full text-xs p-2.5 rounded-xl border bg-white focus:outline-none focus:border-blue-500 ${
                  errors.pincode ? "border-rose-400 bg-rose-50/20" : "border-slate-200"
                }`}
              />
              {errors.pincode && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.pincode.message}</p>
              )}
            </div>

            {/* Landmark */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Nearby Landmark
              </label>
              <input
                type="text"
                placeholder="Near Central Memorial Hospital"
                {...register("landmark")}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Is Default Checkbox */}
          <div className="pt-2">
            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                {...register("isDefault")}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="font-semibold">
                Set as primary default address for lab test bookings
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              className="font-semibold"
            >
              {editingAddress ? "Save Changes" : "Create Address"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => !isDeleting && setDeleteConfirmId(null)}
        title="Delete Address"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-800 text-xs">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Are you sure you want to delete this address?</p>
              <p className="text-rose-700/90 mt-0.5">
                If this is your default address, another saved address will automatically be selected as your new primary address.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDeleteConfirmId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleDelete}
              isLoading={isDeleting}
              className="font-semibold"
            >
              Delete Address
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


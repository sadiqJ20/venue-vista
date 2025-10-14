import { createContext, useContext, useState, ReactNode } from "react";
import { sendBookingNotification } from "@/lib/emailNotifications";

type EmailStatus = { success: boolean; message: string } | null;

interface UseEmailNotificationsValue {
  emailStatus: EmailStatus;
  setEmailStatus: (status: EmailStatus) => void;
  notifyHODNewBooking: (booking: any) => Promise<void>;
  notifyPrincipalApproval: (booking: any) => Promise<void>;
  notifyPROApproval: (booking: any) => Promise<void>;
  notifyFacultyFinalApproval: (booking: any) => Promise<void>;
  notifyFacultyRejection: (booking: any, reason: string) => Promise<void>;
}

const Ctx = createContext<UseEmailNotificationsValue | undefined>(undefined);

export const EmailNotificationsProvider = ({ children }: { children: ReactNode }) => {
  const [emailStatus, setEmailStatus] = useState<EmailStatus>(null);

  const wrap = async (fn: () => Promise<boolean>) => {
    try {
      const ok = await fn();
      setEmailStatus({ success: ok, message: ok ? "Email sent" : "Email failed" });
    } catch (e: any) {
      setEmailStatus({ success: false, message: e?.message || "Email failed" });
    }
  };

  const value: UseEmailNotificationsValue = {
    emailStatus,
    setEmailStatus,
    notifyHODNewBooking: async (booking: any) => wrap(() => sendBookingNotification(booking, "Faculty", "Pending")),
    notifyPrincipalApproval: async (booking: any) => wrap(() => sendBookingNotification(booking, "HOD", "Approved")),
    notifyPROApproval: async (booking: any) => wrap(() => sendBookingNotification(booking, "Principal", "Approved")),
    notifyFacultyFinalApproval: async (booking: any) => wrap(() => sendBookingNotification(booking, "PRO", "Approved")),
    notifyFacultyRejection: async (booking: any, reason: string) => wrap(() => sendBookingNotification(booking, "HOD", "Rejected", reason)),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useEmailNotifications = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useEmailNotifications must be used within EmailNotificationsProvider");
  return ctx;
};



import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useHallAvailability } from "@/hooks/useHallAvailability";
import { useEmailNotifications } from "@/hooks/useEmailNotifications";
import { sendBookingNotification } from "@/lib/emailNotifications";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Hall {
    id: string;
    name: string;
    block: string;
    type: string;
    capacity: number;
}

interface BookingFormProps {
    hall: Hall;
    onClose: () => void;
    onSuccess: () => void;
}

const alphaOnly = (value: string) => value.replace(/[^a-zA-Z\s]/g, "");
const alphaCommaOnly = (value: string) => value.replace(/[^a-zA-Z,\s]/g, "");
const digitsOnly = (value: string) => value.replace(/\D/g, "");
const toTodayYMD = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split("T")[0];
};
const isTimeWithinWindow = (time: string) => time >= "08:00" && time <= "18:00";

const BookingForm = ({ hall, onClose, onSuccess }: BookingFormProps) => {
    // Safely use useAuth with a fallback
const auth = useAuth();
const profile = auth?.profile;
    const { toast } = useToast();
    const { checkHallAvailability, getHallAvailabilityStatus } = useHallAvailability();
    const { notifyHODNewBooking, emailStatus, setEmailStatus } = useEmailNotifications();
    const [loading, setLoading] = useState(false);
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | undefined>(undefined);
    const [availabilityMsg, setAvailabilityMsg] = useState<string>("");
    const [confirmOpen, setConfirmOpen] = useState(false);
    const formRef = useState<HTMLFormElement | null>(null)[0];

    // Show email status feedback
    useEffect(() => {
        if (emailStatus) {
            if (emailStatus.success) {
                toast({
                    title: "📨 Email sent successfully",
                    description: emailStatus.message,
                    variant: "default"
                });
            } else {
                toast({
                    title: "⚠️ Failed to send email",
                    description: emailStatus.message,
                    variant: "destructive"
                });
            }
            setEmailStatus(null);
        }
    }, [emailStatus, setEmailStatus, toast]);

    const [formData, setFormData] = useState({
        organizerName: '',
        facultyName: '',
        facultyPhone: '',
        institutionType: '',
        guestLecturesCount: 0,
        guestLectureNames: '',
        eventName: '',
        description: '',
        eventDate: '',
        startTime: '',
        endTime: '',
        attendeesCount: 1,
        requiredAC: false,
        requiredMic: false,
        requiredProjector: false,
        requiredAudioSystem: false
    });

    const validateForm = (): boolean => {
        // Names: letters and spaces only
        if (!formData.organizerName.trim() || /[^a-zA-Z\s]/.test(formData.organizerName)) {
            toast({ title: "Invalid organizer name", description: "Use letters and spaces only.", variant: "destructive" });
            return false;
        }
        if (!formData.eventName.trim() || /[^a-zA-Z\s]/.test(formData.eventName)) {
            toast({ title: "Invalid event name", description: "Use letters and spaces only.", variant: "destructive" });
            return false;
        }
        if ((formData.facultyName || profile?.name || '').toString().trim() === '') {
            toast({ title: "Invalid faculty name", description: "Faculty name is required.", variant: "destructive" });
            return false;
        }

        // Phone: digits only 7-15
        const phone = (formData.facultyPhone || (profile as any)?.mobile_number || '').toString();
        const phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits.length < 7 || phoneDigits.length > 15) {
            toast({ title: "Invalid phone number", description: "Enter a valid phone number (7-15 digits).", variant: "destructive" });
            return false;
        }

        // Attendees: at least 1 and not exceeding hall capacity
        if (!formData.attendeesCount || formData.attendeesCount < 1) {
            toast({ title: "Invalid attendees", description: "Attendees must be at least 1.", variant: "destructive" });
            return false;
        }
        if (formData.attendeesCount > hall.capacity) {
            toast({ title: "Exceeds hall capacity", description: `Number of attendees (${formData.attendeesCount}) exceeds the hall capacity of ${hall.capacity}. Please select a larger hall or reduce attendees.`, variant: "destructive" });
            return false;
        }

        // Date: today or future
        if (!formData.eventDate || formData.eventDate < toTodayYMD()) {
            toast({ title: "Invalid date", description: "Choose today or a future date.", variant: "destructive" });
            return false;
        }

        // Time window and ordering
        if (!isTimeWithinWindow(formData.startTime) || !isTimeWithinWindow(formData.endTime)) {
            toast({ title: "Invalid time", description: "Time must be between 08:00 and 18:00.", variant: "destructive" });
            return false;
        }
        if (formData.startTime >= formData.endTime) {
            toast({ title: "Invalid time range", description: "End time must be after start time.", variant: "destructive" });
            return false;
        }

        // Guest lecturers count non-negative
        if (formData.guestLecturesCount < 0) {
            toast({ title: "Invalid guest lecturer count", description: "Value cannot be negative.", variant: "destructive" });
            return false;
        }

        return true;
    };

    const recheckAvailability = async () => {
        // Only check when required fields present
        if (!hall?.id || !formData.eventDate || !formData.startTime || !formData.endTime) {
            setIsAvailable(undefined);
            setAvailabilityMsg("");
            return;
        }
        if (!validateForm()) return; // basic guards like time window
        try {
            setCheckingAvailability(true);
            const status = await getHallAvailabilityStatus(hall.id, formData.eventDate, formData.startTime, formData.endTime);
            setIsAvailable(status.available);
            setAvailabilityMsg(status.reason);
        } catch (e) {
            setIsAvailable(undefined);
            setAvailabilityMsg("Could not verify availability. Try again.");
        } finally {
            setCheckingAvailability(false);
        }
    };

    useEffect(() => {
        // Debounce checks on date/time changes
        const t = setTimeout(recheckAvailability, 300);
        return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hall?.id, formData.eventDate, formData.startTime, formData.endTime]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Open confirmation dialog first
        if (!validateForm()) return;
        setConfirmOpen(true);
    };

    const performSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!profile) return;

        if (!validateForm()) return;

        // Final availability check before submit
        setCheckingAvailability(true);
        const availableNow = await checkHallAvailability(hall.id, formData.eventDate, formData.startTime, formData.endTime);
        setCheckingAvailability(false);
        if (!availableNow) {
            toast({ title: "Hall not available", description: "This hall is already booked for the selected slot. Please choose a different time.", variant: "destructive" });
            setIsAvailable(false);
            setAvailabilityMsg("Hall is not available for the requested time slot");
            return;
        }

        setLoading(true);
        try {
            // First, fetch the HOD's details from the database
            let hodName = 'HOD not assigned'; // Default value
            
            if (profile.hod_id) {
                try {
                    const { data: hodData, error: hodError } = await supabase
                        .from('profiles')
                        .select('name, role')
                        .eq('id', profile.hod_id)
                        .single();
                    
                    if (!hodError && hodData?.name) {
                        hodName = hodData.name;
                        console.log('Fetched HOD name:', hodName);
                    } else {
                        console.warn('HOD not found in profiles:', hodError);
                    }
                } catch (error) {
                    console.error('Error fetching HOD details:', error);
                }
            } else {
                console.warn('No HOD ID found in profile');
            }

            // Create sanitized booking payload
            const bookingPayload = {
                faculty_id: profile.id,
                hall_id: hall.id,
                faculty_name: (formData.facultyName || profile.name).trim(),
                faculty_phone: (formData.facultyPhone || (profile as any)?.mobile_number).toString().replace(/\D/g, ''),
                organizer_name: formData.organizerName.trim(),
                institution_type: formData.institutionType as any,
                guest_lectures_count: formData.guestLecturesCount,
                guest_lecture_names: formData.guestLectureNames,
                event_name: formData.eventName.trim(),
                description: formData.description.trim(),
                department: profile.department!,
                // Set HOD information
                hod_id: profile.hod_id,
                hod_name: hodName,
                event_date: formData.eventDate,
                start_time: formData.startTime,
                end_time: formData.endTime,
                attendees_count: formData.attendeesCount,
                required_ac: formData.requiredAC,
                required_mic: formData.requiredMic,
                required_projector: formData.requiredProjector,
                required_audio_system: formData.requiredAudioSystem
            };

            console.log('Submitting booking payload:', bookingPayload);

            const { error } = await supabase.from('bookings').insert(bookingPayload);

            if (error) throw error;

            console.log('Booking submitted successfully');

            // Send email notification using unified function
            try {
                // Create a booking object for the email function
                const bookingForEmail = {
                    faculty_id: profile.id,
                    faculty_name: (formData.facultyName || profile.name).trim(),
                    faculty_phone: (formData.facultyPhone || (profile as any)?.mobile_number).toString().replace(/\D/g, ''),
                    department: profile.department!,
                    event_name: formData.eventName.trim(),
                    event_date: formData.eventDate,
                    start_time: formData.startTime,
                    end_time: formData.endTime,
                    attendees_count: formData.attendeesCount,
                    halls: { name: hall.name }
                };

                const emailSuccess = await sendBookingNotification(bookingForEmail, "Faculty", "Pending");

                if (emailSuccess) {
                    toast({
                        title: "Success",
                        description: "Booking request submitted successfully! Email notification sent to HOD.",
                        variant: "default"
                    });
                } else {
                    toast({
                        title: "Success",
                        description: "Booking request submitted successfully! Email notification failed, but HOD will see it in the system.",
                        variant: "default"
                    });
                }
            } catch (emailError) {
                console.error('Email notification error:', emailError);
                toast({
                    title: "Success",
                    description: "Booking request submitted successfully! Email notification failed, but HOD will see it in the system.",
                    variant: "default"
                });
            }

            onSuccess();
        } catch (error: any) {
            console.error('Booking submission error:', error);
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const todayYMD = toTodayYMD();

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
                <DialogHeader>
                    <DialogTitle>Book {hall.name}</DialogTitle>
                    <DialogDescription>
                        Provide event details and equipment needs. HOD, Principal and PRO will see this request.
                    </DialogDescription>
                </DialogHeader>

                <form id="booking-form" onSubmit={handleSubmit} className="space-y-4">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label>Organizer Name</Label>
                            <Input
                                value={formData.organizerName}
                                onChange={(e) => setFormData({ ...formData, organizerName: alphaOnly(e.target.value) })}
                                inputMode="text"
                                pattern="[A-Za-z\s]+"
                                required
                            />
                        </div>
                        <div>
                            <Label>Institution Type</Label>
                            <Select value={formData.institutionType} onValueChange={(value) => setFormData({ ...formData, institutionType: value })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select institution" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="School">School</SelectItem>
                                    <SelectItem value="Diploma">Diploma</SelectItem>
                                    <SelectItem value="Polytechnic">Polytechnic</SelectItem>
                                    <SelectItem value="Engineering">Engineering</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Event Name</Label>
                            <Input
                                value={formData.eventName}
                                onChange={(e) => setFormData({ ...formData, eventName: alphaOnly(e.target.value) })}
                                inputMode="text"
                                pattern="[A-Za-z\s]+"
                                required
                            />
                        </div>
                        <div>
                            <Label>No. of Attendees (Max: {hall.capacity})</Label>
                            <Input
                                type="number"
                                min={1}
                                max={hall.capacity}
                                value={formData.attendeesCount}
                                onChange={(e) => {
                                    const value = parseInt(e.target.value) || 1;
                                    const clampedValue = Math.min(Math.max(1, value), hall.capacity);
                                    setFormData({ ...formData, attendeesCount: clampedValue });
                                }}
                                className="no-spinner"
                                required
                            />
                        </div>

                        <div className="md:col-span-2">
                            <Label>Description</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Brief description about the event"
                                rows={3}
                                required
                            />
                        </div>

                        <div>
                            <Label>Faculty Name</Label>
                            <Input
                                value={formData.facultyName || profile?.name || ''}
                                onChange={(e) => setFormData({ ...formData, facultyName: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <Label>Faculty Phone Number</Label>
                            <Input
                                type="tel"
                                inputMode="numeric"
                                pattern="[0-9]{7,15}"
                                value={digitsOnly(formData.facultyPhone || (profile?.mobile_number ?? ''))}
                                onChange={(e) => setFormData({ ...formData, facultyPhone: digitsOnly(e.target.value) })}
                                required
                            />
                        </div>

                        <div>
                            <Label>Event Date</Label>
                            <Input
                                type="date"
                                min={todayYMD}
                                value={formData.eventDate}
                                onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label>Start Time</Label>
                                <Input
                                    type="time"
                                    min="08:00"
                                    max="18:00"
                                    value={formData.startTime}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        setFormData({ ...formData, startTime: v });
                                    }}
                                    required
                                />
                            </div>
                            <div>
                                <Label>End Time</Label>
                                <Input
                                    type="time"
                                    min="08:00"
                                    max="18:00"
                                    value={formData.endTime}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        setFormData({ ...formData, endTime: v });
                                    }}
                                    required
                                />
                            </div>
                        </div>

                        {isAvailable === false && (
                            <div className="md:col-span-2">
                                <Alert variant="destructive">
                                    <AlertTitle>Hall not available</AlertTitle>
                                    <AlertDescription>
                                        {availabilityMsg || 'The selected date and time conflict with an existing booking. Please try a different slot.'}
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}

                        <div>
                            <Label>No. of Guest Lecturers</Label>
                            <Input
                                type="number"
                                min={0}
                                value={formData.guestLecturesCount}
                                onChange={(e) => setFormData({ ...formData, guestLecturesCount: Math.max(0, parseInt(e.target.value) || 0) })}
                                className="no-spinner"
                            />
                        </div>
                        <div>
                            <Label>Guest Lecturer Names</Label>
                            <Input
                                value={formData.guestLectureNames}
                                onChange={(e) => setFormData({ ...formData, guestLectureNames: alphaCommaOnly(e.target.value) })}
                                placeholder="Comma separated names (optional)"
                            />
                        </div>
                    </div>

                    <div>
                        <Label>Required Systems</Label>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    checked={formData.requiredAC}
                                    onCheckedChange={(checked) => setFormData({ ...formData, requiredAC: !!checked })}
                                />
                                <Label>AC</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    checked={formData.requiredMic}
                                    onCheckedChange={(checked) => setFormData({ ...formData, requiredMic: !!checked })}
                                />
                                <Label>Microphone</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    checked={formData.requiredProjector}
                                    onCheckedChange={(checked) => setFormData({ ...formData, requiredProjector: !!checked })}
                                />
                                <Label>Projector</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    checked={formData.requiredAudioSystem}
                                    onCheckedChange={(checked) => setFormData({ ...formData, requiredAudioSystem: !!checked })}
                                />
                                <Label>Audio System</Label>
                            </div>
                        </div>
                    </div>

                    <Button type="submit" className="w-full rounded-2xl" disabled={loading || checkingAvailability || isAvailable === false}>
                        {loading ? "Submitting..." : (checkingAvailability ? "Checking availability..." : "Submit Booking Request")}
                    </Button>
                </form>

                <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                    <AlertDialogContent className="rounded-2xl">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirm booking?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Please confirm you want to submit this booking request for {hall.name} on {formData.eventDate} from {formData.startTime} to {formData.endTime}.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Review</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => {
                                    setConfirmOpen(false);
                                    // Proceed with actual submission
                                    performSubmit();
                                }}
                            >
                                Confirm
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DialogContent>
        </Dialog>
    );
};

export default BookingForm;
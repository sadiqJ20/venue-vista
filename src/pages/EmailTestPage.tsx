import { useState } from "react";
import { sendTestEmail } from "@/integrations/emailjs/sendTestEmail";
import PMCHeader from "@/components/PMCHeader";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const EmailTestPage = () => {
  const { toast } = useToast();
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("Test Email from Venue Vista");
  const [message, setMessage] = useState("Hello! This is a test email sent from the Email Test page.");
  const [isSending, setIsSending] = useState(false);
  // Booking-style fields
  const [facultyName, setFacultyName] = useState("fac");
  const [facultyContact, setFacultyContact] = useState("08270045519");
  const [department, setDepartment] = useState("IT");
  const [hallName, setHallName] = useState("East Auditorium");
  const [eventName, setEventName] = useState("Sample Event");
  const [eventDate, setEventDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [startTime, setStartTime] = useState("11:55");
  const [endTime, setEndTime] = useState("12:00");
  const [decision, setDecision] = useState("Pending");
  const [decisionBy, setDecisionBy] = useState("HOD");
  const [comments, setComments] = useState("Please review and approve/reject this booking request.");
  const defaultActionUrl = typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : '/dashboard';
  const [actionUrl, setActionUrl] = useState(defaultActionUrl);

  const handleSend = async () => {
    if (!toEmail) {
      toast({ title: "Recipient email required", description: "Enter a valid email address.", variant: "destructive" });
      return;
    }
    try {
      setIsSending(true);
      await sendTestEmail({
        recipientEmail: toEmail,
        subject,
        message,
        recipientName: facultyName,
        faculty_name: facultyName,
        faculty_contact: facultyContact,
        department,
        hall_name: hallName,
        event_name: eventName,
        event_date: eventDate,
        start_time: startTime,
        end_time: endTime,
        decision,
        decision_taken_by: decisionBy,
        comments,
        action_url: actionUrl,
      });

      toast({ title: "Email sent", description: `Test email sent to ${toEmail}.` });
    } catch (err: unknown) {
      const description = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Failed to send email", description, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/pmc-bg.webp')",
          backgroundAttachment: 'fixed',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-white/40 backdrop-blur-sm"></div>
      </div>

      <PMCHeader />

      <div className="container mx-auto px-6 py-16 pt-48 relative z-20 flex-1">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-card border border-border rounded-card bg-card/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Email Test</CardTitle>
              <CardDescription className="text-center">
                Send a test email using your EmailJS configuration.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="to-email">Recipient Email</Label>
                  <Input
                    id="to-email"
                    type="email"
                    placeholder="recipient@example.com"
                    value={toEmail}
                    onChange={(e) => setToEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="faculty-name">Faculty Name</Label>
                    <Input id="faculty-name" value={facultyName} onChange={(e) => setFacultyName(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="faculty-contact">Faculty Contact</Label>
                    <Input id="faculty-contact" value={facultyContact} onChange={(e) => setFacultyContact(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input id="department" value={department} onChange={(e) => setDepartment(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="hall-name">Hall Name</Label>
                    <Input id="hall-name" value={hallName} onChange={(e) => setHallName(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="event-name">Event Name</Label>
                    <Input id="event-name" value={eventName} onChange={(e) => setEventName(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="event-date">Event Date</Label>
                    <Input id="event-date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="start-time">Start Time</Label>
                    <Input id="start-time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="end-time">End Time</Label>
                    <Input id="end-time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="decision">Decision</Label>
                    <Input id="decision" value={decision} onChange={(e) => setDecision(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="decision-by">Decision Taken By</Label>
                    <Input id="decision-by" value={decisionBy} onChange={(e) => setDecisionBy(e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="comments">Comments</Label>
                    <Textarea id="comments" rows={3} value={comments} onChange={(e) => setComments(e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="action-url">Action URL</Label>
                    <Input id="action-url" value={actionUrl} onChange={(e) => setActionUrl(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    rows={6}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleSend} disabled={isSending} className="bg-primary hover:bg-primary-hover">
                    {isSending ? "Sending..." : "Send Test Email"}
                  </Button>
                  <Button variant="outline" onClick={() => window.history.back()}>
                    Go Back
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default EmailTestPage;



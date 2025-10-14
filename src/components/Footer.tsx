import { useState, useEffect } from "react";
import { X, Github, Linkedin, Mail, ExternalLink, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import "./Footer.css";

const Footer = () => {
  const [isTeamVisible, setIsTeamVisible] = useState(false);
  const [contactEmail, setContactEmail] = useState("");

  const teamMembers = [
    {
      id: 1,
      name: "SADIQ J",
      // Place actual file at public/team/WhatsApp Image 2025-10-09 at 12.56.16_4ebea132.jpg
      photo: "/team/WhatsApp%20Image%202025-10-09%20at%2012.56.16_4ebea132.jpg",
      fallback: "https://ui-avatars.com/api/?name=SADIQ+J&background=0D8ABC&color=fff&size=128",
      social: {
        github: "https://github.com/sadiqJ20",
        linkedin: "http://linkedin.com/in/sadiq-j-a96294231",
        email: "mailto:sadiqj8227@gmail.com"
      }
    },
    {
      id: 2,
      name: "SAHANA G",
      // Place actual file at public/team/WhatsApp Image 2025-10-09 at 12.56.17_99f4bf7a.jpg
      photo: "/team/WhatsApp%20Image%202025-10-09%20at%2012.56.17_99f4bf7a.jpg",
      fallback: "https://ui-avatars.com/api/?name=SAHANA+G&background=0D8ABC&color=fff&size=128",
      social: {
        github: "https://github.com/sahanagovindraj",
        linkedin: "https://www.linkedin.com/in/sahanagovind30/",
        email: "mailto:sahanagovindr@gmail.com"
      }
    },
    {
      id: 3,
      name: "SUMA N~",
      // Place actual file at public/team/WhatsApp Image 2025-10-09 at 12.56.18_ee9db047.jpg
      photo: "/team/WhatsApp%20Image%202025-10-09%20at%2012.56.18_ee9db047.jpg",
      fallback: "https://ui-avatars.com/api/?name=SUMA+M&background=0D8ABC&color=fff&size=128",
      social: {
        github: "https://github.com/suma-dev-12",
        linkedin: "https://www.linkedin.com/in/nsuma",
        email: "mailto:ss0988175@gmail.com"
      }
    },
    {
      id: 4,
      name: "SANGATAMIL M",
      photo: "/team/WhatsApp%20Image%202025-10-09%20at%2014.12.27_c86cdfe1.jpg",
      fallback: "https://ui-avatars.com/api/?name=Member+4&background=0D8ABC&color=fff&size=128",
      social: {
        github: "https://github.com/sangatamil1912m-lab",
        linkedin: "https://www.linkedin.com/in/sangatamil-m-625102278",
        email: "mailto:sangatamil1912m@gmail.com"
      }
    },
    {
      id: 5,
      name: "THAMILARASU A",
      photo: "/team/WhatsApp%20Image%202025-10-09%20at%2014.12.27_cb01a3bc.jpg",
      fallback: "https://ui-avatars.com/api/?name=Member+5&background=0D8ABC&color=fff&size=128",
      social: {
        github: "https://github.com/innovator-alt",
        linkedin: "https://www.linkedin.com/in/thamilarasu-a-57917a278",
        email: "mailto:thamilarasua0@gmail.com"
      }
    }
  ];

  // Close team cards when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isTeamVisible && !target.closest('.team-cards-container') && !target.closest('.innovators-hub-link')) {
        setIsTeamVisible(false);
      }
    };

    if (isTeamVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent body scroll when team cards are open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isTeamVisible]);

  return (
    <>
      {/* Footer */}
      <footer className="bg-white/90 backdrop-blur-sm border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <p className="text-gray-600 text-sm">
              © 2025 Seminar App | Developed by{" "}
              <button
                onClick={() => setIsTeamVisible(true)}
                className="innovators-hub-link text-primary hover:text-primary-hover font-semibold transition-colors duration-200 cursor-pointer relative group"
                title="Click to view the team!"
              >
                Innovators Hub
                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                  Click to view the team!
                </span>
              </button>
              <span className="mx-2 text-gray-400">|</span>
              <span className="font-semibold text-black">IT DEPT</span>
            </p>
            {/* Removed subtitle line as requested */}
          </div>
        </div>
      </footer>

      {/* Floating Team Cards */}
      {isTeamVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          
          {/* Team Cards Container */}
          <div className="team-cards-container relative w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-white rounded-t-2xl p-6 shadow-lg border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Meet the Innovators Hub Team
                  </h2>
                  <p className="text-gray-600">
                    The brilliant minds behind the Seminar Hall Booking System
                  </p>
                </div>
                <Button
                  onClick={() => setIsTeamVisible(false)}
                  variant="outline"
                  size="sm"
                  className="hover:bg-gray-100 hover:text-red-600 focus-visible:ring-red-400 rounded-full p-2 transition-colors"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Team Cards Grid */}
            <div className="bg-white p-6 rounded-b-2xl shadow-lg">
              <div className="flex justify-center gap-4 overflow-x-auto">
                {teamMembers.map((member, index) => (
                  <div
                    key={member.id}
                    className="team-card rounded-xl p-6 transition-all duration-300 transform hover:-translate-y-1 bg-white"
                    style={{
                      animationDelay: `${index * 100}ms`,
                      animation: 'slideInUp 0.5s ease-out forwards'
                    }}
                  >
                    <div className="flex flex-col items-center text-center">
                      {/* Member Photo (floating above card) */}
                      <div className="relative mb-4 -mt-8 bg-white p-1 rounded-full">
                        <img
                          src={member.photo}
                          alt={member.name}
                          className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-xl"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            const anyMember = member as unknown as { fallback?: string };
                            if (anyMember.fallback && target.src !== anyMember.fallback) {
                              target.src = anyMember.fallback;
                            }
                          }}
                        />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                          <div className="w-3 h-3 bg-white rounded-full"></div>
                        </div>
                      </div>

                      {/* Member Info */}
                      <h3 className={`${member.id >= 4 ? "text-lg" : "text-xl"} font-bold text-gray-900 mb-4 whitespace-nowrap`}>{member.name}</h3>

                      {/* Social Links */}
                      <div className="flex space-x-3">
                        <Button
                          size="sm"
                          className="bg-black text-white hover:bg-black/90 hover:scale-110 transition-all duration-200"
                          onClick={() => window.open(member.social.github, '_blank')}
                        >
                          <Github className="h-4 w-4 text-white" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-black text-white hover:bg-black/90 hover:scale-110 transition-all duration-200"
                          onClick={() => window.open(member.social.linkedin, '_blank')}
                        >
                          <Linkedin className="h-4 w-4 text-white" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-black text-white hover:bg-black/90 hover:scale-110 transition-all duration-200"
                          onClick={() => window.open(`mailto:${member.social.email}`, '_blank')}
                        >
                          <Mail className="h-4 w-4 text-white" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Contact / Subscribe Section */}
              <div className="mt-10 rounded-xl p-6 bg-gradient-to-r from-gray-50 to-gray-100">
                <div className="max-w-2xl mx-auto text-center space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Have questions or want to collaborate? Reach out to us!
                  </h3>
                  <form
                    className="flex flex-col sm:flex-row items-center gap-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!contactEmail) return;
                      window.location.href = `mailto:theinnovatorshub2@gmail.com?subject=Enquiry%20from%20Seminar%20App&body=Hello%2C%0D%0A%0D%0AMy%20email%3A%20${encodeURIComponent(contactEmail)}%0D%0A%0D%0A`;
                    }}
                  >
                    <Input
                      type="email"
                      placeholder="yourname@example.com"
                      className="flex-1 bg-white border-gray-300"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      required
                    />
                    <Button type="submit" className="whitespace-nowrap">
                      Send Email
                    </Button>
                  </form>
                  <p className="text-xs text-gray-500">
                    We respect your privacy. No spam ever.
                  </p>
                  
                </div>
              </div>

              {/* Call to Action */}
              <div className="mt-6 text-center">
                <Button
                  onClick={() => window.open('https://innovatorshub.com', '_blank')}
                  className="bg-gradient-to-r from-primary to-secondary hover:from-primary-hover hover:to-secondary-hover text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Visit Innovators Hub
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Footer;

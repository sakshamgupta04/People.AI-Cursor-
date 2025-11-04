import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { UserProfile } from "@/pages/Users";
import PersonalityPieChart from "./PersonalityPieChart";
import FitmentScoreGauge from "./FitmentScoreGauge";
import { format } from "date-fns";
import { toast } from "@/components/ui/use-toast";

const RetentionRing = ({ label, value, color }: { label: string; value: number; color: string }) => {
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" stroke="#e5e7eb" strokeWidth="8" fill="none" />
        <circle
          cx="50"
          cy="50"
          r="42"
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
        />
        <text x="50" y="52" textAnchor="middle" fontSize="14" fill="#111827">{value}%</text>
      </svg>
      <div className="mt-1 text-sm font-medium text-gray-800">{label}</div>
    </div>
  );
};

interface UserDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
}

export default function UserDetailsDialog({ isOpen, onClose, user }: UserDetailsDialogProps) {
  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[70vw] w-[95vw] p-0 h-[90vh] overflow-hidden">
        <DialogHeader className="p-1 border-b sticky top-0 bg-white z-10">
          <DialogTitle className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>Candidate Profile</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-5rem)] w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 p-8">
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                <div className="aspect-square w-full max-w-[250px] bg-gray-100 rounded-lg flex items-center justify-center">
                  {user.profileImage ? (
                    <img src={user.profileImage} alt="Profile" className="w-full h- object-cover rounded-lg" />
                  ) : (
                    <span className="text-gray-400">Profile Image</span>
                  )}
                </div>

                <div className="space-y-3 flex-1">
                  <h3 className="text-3xl font-semibold">{user.name}</h3>
                  <p className="text-gray-500 text-lg">{user.email}</p>
                  <div className="pt-2">
                    <div className="inline-block bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                      {user.jobRole}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-5 bg-gray-50 p-1 rounded-lg">
                <div>
                  <h4 className="font-medium text-lg">Experience:</h4>
                  <p className="text-base">{user.experience}</p>
                </div>
                <div>
                  <h4 className="font-medium text-lg">Education:</h4>
                  <p className="text-base">{user.education}</p>
                </div>
                <div>
                  <h4 className="font-medium text-lg">About Me:</h4>
                  <p className="text-base text-gray-600">{user.about}</p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="bg-white rounded-lg border border-gray-200 p-2 shadow-sm">
                <h3 className="text-2xl font-semibold mb-1 text-center">AI Generated Fitment Score</h3>
                <div className="w-full max-w-[200px] mx-auto">
                  <FitmentScoreGauge score={user.score} />
                </div>

                <div className="mt-3">
                  <h4 className="font-medium text-center mb-1 text-lg">Score Breakdown</h4>
                  <div className="space-y-1 px-5">
                    <div className="flex justify-between">
                      <span className="font-medium">Longevity Score:</span>
                      <span>{(user.score * 0.3).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Achievements Score:</span>
                      <span>{(user.score * 0.4).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Psychometric Score:</span>
                      <span>{(user.score * 0.3).toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {user.personalityScores && (
                <div className="bg-white rounded-lg border border-gray-200 p-2 shadow-sm space-y-1">
                  <h4 className="text-2xl font-semibold text-center">Personality Assessment</h4>
                  <div className="w-full h-[300px] max-w-[400px] mx-auto">
                    <PersonalityPieChart scores={user.personalityScores} />
                  </div>

                  <div className="mt-6 space-y-2 max-w-md mx-auto">
                    <div className="flex justify-between text-sm">
                      <span>Extroversion</span>
                      <span>{user.personalityScores.extraversion}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Agreeableness</span>
                      <span>{user.personalityScores.agreeableness}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Openness</span>
                      <span>{user.personalityScores.openness}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Neuroticism</span>
                      <span>{user.personalityScores.neuroticism}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Conscientiousness</span>
                      <span>{user.personalityScores.conscientiousness}%</span>
                    </div>

                  </div>
                </div>
              )}

              {/* Retention Analysis */}
              <div className="bg-white rounded-lg border border-gray-200 p-2 shadow-sm space-y-3">
                <h4 className="text-2xl font-semibold text-center">Retention Analysis</h4>
                <div className="grid grid-cols-3 gap-6 place-items-center">
                  <div className="text-center">
                    <div className="text-sm text-gray-500 mb-2">4 weeks</div>
                    <RetentionRing label="Possible" value={80} color="#f59e0b" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500 mb-2">8 weeks</div>
                    <RetentionRing label="Likely" value={88} color="#22c55e" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500 mb-2">12 weeks</div>
                    <RetentionRing label="Yes" value={96} color="#16a34a" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
        <div className="p-4 border-t bg-white flex justify-center">
          <Button
            onClick={() => {
              const base = window.location.origin;
              if (user.id) {
                const url = `${base}/api/resumes/${user.id}/file`;
                window.open(url, '_blank', 'noopener,noreferrer');
                return;
              }
              if (user.file_url) {
                const resumeUrl = user.file_url.startsWith('http')
                  ? user.file_url.replace('/api/api/', '/api/')
                  : `${base}${user.file_url.startsWith('/') ? '' : '/'}${user.file_url}`;
                window.open(resumeUrl, '_blank', 'noopener,noreferrer');
              } else {
                toast({
                  title: "Resume not available",
                  description: "This user doesn't have a resume uploaded.",
                  variant: "destructive"
                });
              }
            }}
            className="w-full max-w-md bg-blue-500 hover:bg-blue-600 text-white"
            disabled={!user.id && !user.file_url}
          >
            {user.id || user.file_url ? "View Resume" : "No Resume Available"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
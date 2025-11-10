
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import FitmentScoreGauge from "@/components/users/FitmentScoreGauge";
import PersonalityPieChart from "@/components/users/PersonalityPieChart";
import RetentionAnalysis from "@/components/users/RetentionAnalysis";
import { Candidate } from "./CandidateScores";
import axios from "axios";
import { useEffect, useState } from "react";
import { apiConfig } from "@/config/api.config";

interface CandidateDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate | null;
}

type Profile = {
  id: string;
  name: string;
  email: string;
  score: number;
  jobRole?: string;
  experience?: string;
  education?: string;
  about?: string;
  personalityScores?: {
    extraversion: number;
    agreeableness: number;
    openness: number;
    neuroticism: number;
    conscientiousness: number;
  };
  file_url?: string;
};


export default function CandidateDetailsDialog({ isOpen, onClose, candidate }: CandidateDetailsProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [retentionData, setRetentionData] = useState<any>(null);
  useEffect(() => {
    const load = async () => {
      if (!candidate?.id) { setProfile(null); setRetentionData(null); return; }
      try {
        const res = await axios.get(`${apiConfig.baseUrl}/resumes/${candidate.id}`);
        const r = res.data?.data || res.data;
        const p: Profile = {
          id: r.id,
          name: r.name || candidate.name,
          email: r.email || candidate.email,
          score: r.fitment_score ?? candidate.fitment_score ?? 0,
          jobRole: r.best_fit_for || candidate.expectedRole || 'Not Specified',
          experience: typeof r.longevity_years === 'number' ? `${r.longevity_years} years` : (candidate.experience || 'No experience'),
          education: Array.isArray(r.education) && r.education[0] ? `${r.education[0].degree} in ${r.education[0].field || ''} from ${r.education[0].institution || ''}`.trim() : '',
          about: r.summary || '',
          personalityScores: {
            extraversion: r.extraversion || 0,
            agreeableness: r.agreeableness || 0,
            openness: r.openness || 0,
            neuroticism: r.neuroticism || 0,
            conscientiousness: r.conscientiousness || 0,
          },
          file_url: r.file_url,
        };
        setProfile(p);
        // Extract retention data from resume
        console.log('CandidateDetailsDialog - Resume data:', r);
        if (r.retention_analysis) {
          let parsedRetentionData = r.retention_analysis;
          // Handle string format
          if (typeof parsedRetentionData === 'string') {
            try {
              parsedRetentionData = JSON.parse(parsedRetentionData);
            } catch (e) {
              console.error('Error parsing retention_analysis:', e);
              parsedRetentionData = null;
            }
          }

          // Ensure we have a valid object
          if (parsedRetentionData && typeof parsedRetentionData === 'object') {
            // Ensure component scores are populated from database columns if missing in JSONB
            if (!parsedRetentionData.component_scores) {
              parsedRetentionData.component_scores = {};
            }
            parsedRetentionData.component_scores = {
              stability: parsedRetentionData.component_scores.stability ?? r.retention_stability_score ?? 0,
              personality: parsedRetentionData.component_scores.personality ?? r.retention_personality_score ?? 0,
              engagement: parsedRetentionData.component_scores.engagement ?? r.retention_engagement_score ?? 0,
              fitment_factor: parsedRetentionData.component_scores.fitment_factor ?? r.retention_fitment_factor ?? 0,
              institution_quality: parsedRetentionData.component_scores.institution_quality ?? r.retention_institution_quality ?? undefined
            };
            // Ensure required fields exist
            parsedRetentionData.retention_score = parsedRetentionData.retention_score ?? r.retention_score ?? 0;
            parsedRetentionData.retention_risk = parsedRetentionData.retention_risk ?? (r.retention_risk || 'Medium');
            parsedRetentionData.risk_flags = parsedRetentionData.risk_flags || [];
            parsedRetentionData.flag_count = parsedRetentionData.flag_count ?? parsedRetentionData.risk_flags?.length ?? 0;
            parsedRetentionData.insights = parsedRetentionData.insights || [];
            console.log('CandidateDetailsDialog - Parsed retention data:', parsedRetentionData);
            setRetentionData(parsedRetentionData);
          } else {
            console.warn('CandidateDetailsDialog - Invalid retention_analysis format');
            setRetentionData(null);
          }
        } else if (r.retention_score !== null && r.retention_score !== undefined) {
          // If retention_analysis is not stored, construct it from individual fields
          // Use component scores from database columns if available
          setRetentionData({
            retention_score: r.retention_score,
            retention_risk: r.retention_risk || 'Medium',
            risk_description: r.retention_risk === 'Low'
              ? 'Low Risk - High retention likelihood'
              : r.retention_risk === 'High'
                ? 'High Risk - Intervention recommended'
                : 'Medium Risk - Monitor and support',
            component_scores: {
              stability: r.retention_stability_score ?? 0,
              personality: r.retention_personality_score ?? 0,
              engagement: r.retention_engagement_score ?? 0,
              fitment_factor: r.retention_fitment_factor ?? 0,
              institution_quality: r.retention_institution_quality ?? undefined
            },
            risk_flags: [],
            flag_count: 0,
            insights: []
          });
        } else {
          setRetentionData(null);
        }
      } catch {
        setProfile({
          id: candidate.id,
          name: candidate.name,
          email: candidate.email,
          score: candidate.fitment_score,
        });
        setRetentionData(null);
      }
    };
    if (isOpen) load();
  }, [isOpen, candidate]);

  if (!candidate) return null;

  const resumeHref = profile?.id ? `${window.location.origin}/api/resumes/${profile.id}/file` : undefined;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[70vw] w-[95vw] p-0 h-[90vh] overflow-hidden">
        <DialogHeader className="p-4 border-b bg-white">
          <DialogTitle className="text-xl">Candidate Profile</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[calc(90vh-8rem)] w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                <div className="aspect-square w-full max-w-[250px] bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400">Profile Image</span>
                </div>
                <div className="space-y-3 flex-1">
                  <h3 className="text-3xl font-semibold">{profile?.name || candidate.name}</h3>
                  <p className="text-gray-500 text-lg">{profile?.email || candidate.email}</p>
                  <div className="pt-2">
                    <div className="inline-block bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                      {profile?.jobRole || 'Not Specified'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <h4 className="font-medium text-lg">Experience:</h4>
                  <p className="text-base">{profile?.experience || 'No experience'}</p>
                </div>
                <div>
                  <h4 className="font-medium text-lg">Education:</h4>
                  <p className="text-base">{profile?.education || ''}</p>
                </div>
                <div>
                  <h4 className="font-medium text-lg">About Me:</h4>
                  <p className="text-base text-gray-600">{profile?.about || 'No summary available'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <h3 className="text-2xl font-semibold mb-2 text-center">AI Generated Fitment Score</h3>
                <div className="w-full max-w-[220px] mx-auto">
                  <FitmentScoreGauge score={profile?.score ?? candidate.fitment_score} />
                </div>
              </div>

              {profile?.personalityScores && (
                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm space-y-4">
                  <h4 className="text-2xl font-semibold text-center">Personality Assessment</h4>
                  <div className="w-full h-[300px] max-w-[420px] mx-auto">
                    <PersonalityPieChart scores={profile.personalityScores} />
                  </div>
                  <div className="mt-2 space-y-2 max-w-md mx-auto">
                    <div className="flex justify-between text-sm"><span>Extroversion</span><span>{profile.personalityScores.extraversion}%</span></div>
                    <div className="flex justify-between text-sm"><span>Agreeableness</span><span>{profile.personalityScores.agreeableness}%</span></div>
                    <div className="flex justify-between text-sm"><span>Openness</span><span>{profile.personalityScores.openness}%</span></div>
                    <div className="flex justify-between text-sm"><span>Neuroticism</span><span>{profile.personalityScores.neuroticism}%</span></div>
                    <div className="flex justify-between text-sm"><span>Conscientiousness</span><span>{profile.personalityScores.conscientiousness}%</span></div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <RetentionAnalysis retentionData={retentionData} />
              </div>
            </div>
          </div>
        </ScrollArea>
        <div className="p-4 border-t bg-white flex justify-center">
          <Button className="w-full max-w-md bg-blue-500 hover:bg-blue-600 text-white" onClick={() => resumeHref && window.open(resumeHref, '_blank', 'noopener,noreferrer')} disabled={!resumeHref}>
            {resumeHref ? 'View Resume' : 'No Resume Available'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

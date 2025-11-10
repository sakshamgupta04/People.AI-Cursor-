import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import FitmentScoreGauge from "@/components/users/FitmentScoreGauge";
import PersonalityPieChart from "@/components/users/PersonalityPieChart";
import RetentionAnalysis from "@/components/users/RetentionAnalysis";
import type { UserProfile } from "./Users";

const API_BASE_URL = import.meta.env.PROD
    ? import.meta.env.VITE_PROD_API_BASE_URL
    : import.meta.env.VITE_DEV_API_BASE_URL || 'http://localhost:5000/api';

const mapResumeToUserProfile = (resume: any): UserProfile => ({
    id: resume.id || '',
    name: resume.name || 'Unknown',
    email: resume.email || '',
    score: resume.fitment_score || 0,
    jobRole: resume.best_fit_for || 'Not Specified',
    experience: typeof resume.longevity_years === 'number' ? `${resume.longevity_years} years` : 'No experience',
    education: Array.isArray(resume.education) && resume.education[0]
        ? `${resume.education[0].degree} in ${resume.education[0].field || ''} from ${resume.education[0].institution || ''}`.trim()
        : '',
    about: resume.summary || 'No summary available',
    profileImage: '',
    personalityScores: {
        extraversion: resume.extraversion || 0,
        agreeableness: resume.agreeableness || 0,
        openness: resume.openness || 0,
        neuroticism: resume.neuroticism || 0,
        conscientiousness: resume.conscientiousness || 0
    },
    status: resume.status || 'pending',
    phone: resume.phone || '',
    address: resume.address || '',
    summary: resume.summary || '',
    best_fit_for: resume.best_fit_for || '',
    created_at: resume.created_at || new Date().toISOString(),
    fitment_score: resume.fitment_score || 0,
    skills: Array.isArray(resume.skills) ? resume.skills : [],
    candidate_type: resume.candidate_type,
    file_url: resume.file_url,
});

/**
 * Extract and normalize retention data from resume
 * Handles both JSONB retention_analysis and individual column data
 */
const extractRetentionData = (resume: any): any | null => {
    // Check if we have any retention data at all
    const hasRetentionScore = resume.retention_score !== null && resume.retention_score !== undefined;
    const hasRetentionAnalysis = resume.retention_analysis !== null && resume.retention_analysis !== undefined;

    if (!hasRetentionScore && !hasRetentionAnalysis) {
        console.log('[extractRetentionData] No retention data found');
        return null;
    }

    // Parse retention_analysis JSONB if it exists
    let parsedAnalysis = null;
    if (resume.retention_analysis) {
        try {
            if (typeof resume.retention_analysis === 'string') {
                parsedAnalysis = JSON.parse(resume.retention_analysis);
            } else if (typeof resume.retention_analysis === 'object') {
                parsedAnalysis = resume.retention_analysis;
            }
        } catch (e) {
            console.error('[extractRetentionData] Error parsing retention_analysis:', e);
        }
    }

    // Build retention data object
    // Priority: Individual columns > JSONB data > Defaults
    const retentionData: any = {
        retention_score: Number(resume.retention_score) || Number(parsedAnalysis?.retention_score) || 0,
        retention_risk: resume.retention_risk || parsedAnalysis?.retention_risk || 'Medium',
        risk_description: parsedAnalysis?.risk_description || (
            resume.retention_risk === 'Low'
                ? 'Low Risk - High retention likelihood'
                : resume.retention_risk === 'High'
                    ? 'High Risk - Intervention recommended'
                    : 'Medium Risk - Monitor and support'
        ),
        component_scores: {
            stability: Number(resume.retention_stability_score) || Number(parsedAnalysis?.component_scores?.stability) || 0,
            personality: Number(resume.retention_personality_score) || Number(parsedAnalysis?.component_scores?.personality) || 0,
            engagement: Number(resume.retention_engagement_score) || Number(parsedAnalysis?.component_scores?.engagement) || 0,
            fitment_factor: Number(resume.retention_fitment_factor) || Number(parsedAnalysis?.component_scores?.fitment_factor) || 0,
            institution_quality: resume.retention_institution_quality !== undefined
                ? Number(resume.retention_institution_quality)
                : parsedAnalysis?.component_scores?.institution_quality !== undefined
                    ? Number(parsedAnalysis.component_scores.institution_quality)
                    : undefined
        },
        risk_flags: Array.isArray(parsedAnalysis?.risk_flags) ? parsedAnalysis.risk_flags : [],
        flag_count: parsedAnalysis?.flag_count || parsedAnalysis?.risk_flags?.length || 0,
        insights: Array.isArray(parsedAnalysis?.insights) ? parsedAnalysis.insights : [],
        tier_details: parsedAnalysis?.tier_details || undefined
    };

    console.log('[extractRetentionData] Extracted retention data:', retentionData);
    return retentionData;
};

export default function CandidateProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [retentionData, setRetentionData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadCandidateData = async () => {
            if (!id) {
                setError('Invalid candidate ID');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                console.log(`[CandidateProfile] Fetching resume data for ID: ${id}`);

                // Fetch resume data from API (which queries Supabase)
                const response = await axios.get(`${API_BASE_URL}/resumes/${id}`);

                // Handle response structure
                const resume = response.data?.data || response.data;

                if (!resume) {
                    setError('Resume not found');
                    setLoading(false);
                    return;
                }

                console.log('[CandidateProfile] Resume data received:', {
                    id: resume.id,
                    name: resume.name,
                    email: resume.email,
                    hasRetentionScore: resume.retention_score !== null && resume.retention_score !== undefined,
                    hasRetentionAnalysis: !!resume.retention_analysis,
                    retentionScore: resume.retention_score,
                    retentionRisk: resume.retention_risk,
                    componentScores: {
                        stability: resume.retention_stability_score,
                        personality: resume.retention_personality_score,
                        engagement: resume.retention_engagement_score,
                        fitment_factor: resume.retention_fitment_factor
                    }
                });

                // Map resume to user profile
                setUser(mapResumeToUserProfile(resume));

                // Extract retention data
                const extractedRetentionData = extractRetentionData(resume);
                setRetentionData(extractedRetentionData);

                console.log('[CandidateProfile] Retention data set:', extractedRetentionData);

            } catch (err: any) {
                console.error('[CandidateProfile] Error loading candidate:', err);
                const errorMessage = err.response?.data?.error
                    || err.response?.data?.message
                    || err.message
                    || 'Failed to load candidate data';
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        loadCandidateData();
    }, [id]);

    if (loading) {
        return (
            <div className="page-container flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading candidate profile...</p>
                </div>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="page-container">
                <div className="p-4">
                    <Button variant="ghost" onClick={() => navigate(-1)}>Back</Button>
                </div>
                <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
                    <div className="text-center">
                        <p className="text-red-600 text-lg font-semibold mb-2">{error || 'Candidate not found'}</p>
                        <Button onClick={() => navigate(-1)}>Go Back</Button>
                    </div>
                </div>
            </div>
        );
    }

    const openResume = () => {
        const base = window.location.origin;
        if (user.id) {
            window.open(`${base}/api/resumes/${user.id}/file`, '_blank', 'noopener,noreferrer');
            return;
        }
        if (user.file_url) {
            const url = user.file_url.startsWith('http')
                ? user.file_url
                : `${base}${user.file_url.startsWith('/') ? '' : '/'}${user.file_url}`;
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <div className="page-container">
            <div className="p-4">
                <Button variant="ghost" onClick={() => navigate(-1)}>Back</Button>
            </div>
            <ScrollArea className="h-[calc(100vh-6rem)] w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                    {/* Left Column - Candidate Info */}
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                            <div className="aspect-square w-full max-w-[250px] bg-gray-100 rounded-lg flex items-center justify-center">
                                {user.profileImage ? (
                                    <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover rounded-lg" />
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

                        <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                            <div>
                                <h4 className="font-medium text-lg">Experience:</h4>
                                <p className="text-base">{user.experience}</p>
                            </div>
                            <div>
                                <h4 className="font-medium text-lg">Education:</h4>
                                <p className="text-base">{user.education || 'Not specified'}</p>
                            </div>
                            <div>
                                <h4 className="font-medium text-lg">About Me:</h4>
                                <p className="text-base text-gray-600">{user.about}</p>
                            </div>
                            <Button className="w-full" onClick={openResume} disabled={!user.id && !user.file_url}>
                                {user.id || user.file_url ? 'View Resume' : 'No Resume Available'}
                            </Button>
                        </div>
                    </div>

                    {/* Right Column - Scores and Analysis */}
                    <div className="space-y-6">
                        {/* Fitment Score */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                            <h3 className="text-2xl font-semibold mb-2 text-center">AI Generated Fitment Score</h3>
                            <div className="w-full max-w-[220px] mx-auto">
                                <FitmentScoreGauge score={user.score} />
                            </div>
                        </div>

                        {/* Personality Assessment */}
                        {user.personalityScores && (
                            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm space-y-4">
                                <h4 className="text-2xl font-semibold text-center">Personality Assessment</h4>
                                <div className="w-full h-[300px] max-w-[420px] mx-auto">
                                    <PersonalityPieChart scores={user.personalityScores} />
                                </div>
                            </div>
                        )}

                        {/* Retention Analysis */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                            <RetentionAnalysis retentionData={retentionData} />
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}

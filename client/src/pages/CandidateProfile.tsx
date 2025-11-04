import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import FitmentScoreGauge from "@/components/users/FitmentScoreGauge";
import PersonalityPieChart from "@/components/users/PersonalityPieChart";
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

function RetentionRing({ label, value, color }: { label: string; value: number; color: string }) {
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
}

export default function CandidateProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`${API_BASE_URL}/resumes/${id}`);
                const resume = res.data?.data || res.data;
                setUser(mapResumeToUserProfile(resume));
            } catch (e) {
                setError('Failed to load candidate');
            } finally {
                setLoading(false);
            }
        };
        if (id) load();
    }, [id]);

    if (loading) return (<div className="page-container">Loading...</div>);
    if (error || !user) return (<div className="page-container">{error || 'Not found'}</div>);

    const openResume = () => {
        const base = window.location.origin;
        if (user.id) {
            window.open(`${base}/api/resumes/${user.id}/file`, '_blank', 'noopener,noreferrer');
            return;
        }
        if (user.file_url) {
            const url = user.file_url.startsWith('http') ? user.file_url : `${base}${user.file_url.startsWith('/') ? '' : '/'}${user.file_url}`;
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
                    <div className="space-y-6">
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

                        <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
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
                            <Button className="w-full" onClick={openResume} disabled={!user.id && !user.file_url}>
                                {user.id || user.file_url ? 'View Resume' : 'No Resume Available'}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                            <h3 className="text-2xl font-semibold mb-2 text-center">AI Generated Fitment Score</h3>
                            <div className="w-full max-w-[220px] mx-auto">
                                <FitmentScoreGauge score={user.score} />
                            </div>
                        </div>

                        {user.personalityScores && (
                            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm space-y-4">
                                <h4 className="text-2xl font-semibold text-center">Personality Assessment</h4>
                                <div className="w-full h-[300px] max-w-[420px] mx-auto">
                                    <PersonalityPieChart scores={user.personalityScores} />
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm space-y-4">
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
        </div>
    );
}

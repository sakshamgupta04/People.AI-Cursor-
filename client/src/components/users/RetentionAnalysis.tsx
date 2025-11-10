import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FitmentScoreGauge from "./FitmentScoreGauge";

interface RetentionAnalysisProps {
    retentionData: any | null;
}

// Circular progress ring component for component scores
const ComponentScoreRing = ({ label, value, color }: { label: string; value: number; color: string }) => {
    const circumference = 2 * Math.PI * 42;
    const safeValue = Math.max(0, Math.min(100, value || 0));
    const offset = circumference - (safeValue / 100) * circumference;

    return (
        <div className="flex flex-col items-center w-full">
            <svg width="100" height="100" viewBox="0 0 100 100" className="mb-2">
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
                <text x="50" y="52" textAnchor="middle" fontSize="14" fill="#111827" fontWeight="600">
                    {Math.round(safeValue)}
                </text>
            </svg>
            <div className="text-xs font-medium text-gray-800 text-center px-1 leading-tight">{label}</div>
        </div>
    );
};

// Get color based on score
const getComponentColor = (score: number): string => {
    const safeScore = Math.max(0, Math.min(100, score || 0));
    if (safeScore >= 70) return "#22c55e"; // green-500
    if (safeScore >= 50) return "#f59e0b"; // amber-500
    return "#ef4444"; // red-500
};

export default function RetentionAnalysis({ retentionData }: RetentionAnalysisProps) {
    // Debug: Always log what we receive
    console.log('[RetentionAnalysis] Received data:', retentionData);
    console.log('[RetentionAnalysis] Data type:', typeof retentionData);
    console.log('[RetentionAnalysis] Is null?:', retentionData === null);
    console.log('[RetentionAnalysis] Is undefined?:', retentionData === undefined);

    // If no data at all, show message
    if (!retentionData || retentionData === null || retentionData === undefined) {
        return (
            <Card className="bg-white border-gray-200">
                <CardHeader>
                    <CardTitle className="text-2xl font-semibold text-center">Retention Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-gray-500 py-4">Retention analysis not available</p>
                    <p className="text-center text-xs text-gray-400 mt-2">Complete the personality test to generate retention analysis</p>
                </CardContent>
            </Card>
        );
    }

    // Extract data with safe defaults
    const retentionScore = Number(retentionData.retention_score) || 0;
    const retentionRisk = retentionData.retention_risk || 'Medium';
    const componentScores = retentionData.component_scores || {};

    // Get component scores with defaults
    const stability = Number(componentScores.stability) || 0;
    const personality = Number(componentScores.personality) || 0;
    const engagement = Number(componentScores.engagement) || 0;
    const fitmentFactor = Number(componentScores.fitment_factor) || 0;

    // Component data array
    const components = [
        { label: "Job Stability", score: stability },
        { label: "Personality Fit", score: personality },
        { label: "Professional Engagement", score: engagement },
        { label: "Fitment Factor", score: fitmentFactor }
    ];

    // Build analysis text
    const buildAnalysisText = (): string => {
        let text = `RETENTION ANALYSIS SUMMARY\n${'='.repeat(60)}\n\n`;
        text += `Retention Score: ${retentionScore.toFixed(2)}/100\n`;
        text += `Risk Level: ${retentionRisk}\n`;
        text += `\n${retentionData.risk_description || `Risk Description: ${retentionRisk} Risk`}\n\n`;

        text += `COMPONENT BREAKDOWN:\n`;
        text += `• Job Stability: ${stability.toFixed(2)}/100\n`;
        text += `• Personality Fit: ${personality.toFixed(2)}/100\n`;
        text += `• Professional Engagement: ${engagement.toFixed(2)}/100\n`;
        text += `• Fitment Factor: ${fitmentFactor.toFixed(2)}/100\n`;

        if (componentScores.institution_quality !== undefined) {
            text += `• Institution Quality: ${Number(componentScores.institution_quality).toFixed(2)}/100\n`;
        }

        // Risk flags
        const riskFlags = Array.isArray(retentionData.risk_flags) ? retentionData.risk_flags : [];
        const flagCount = retentionData.flag_count || riskFlags.length || 0;

        text += `\nRISK FLAGS: ${flagCount}\n`;
        if (riskFlags.length > 0) {
            riskFlags.forEach((flag: string, idx: number) => {
                text += `  ${idx + 1}. ${flag}\n`;
            });
        } else {
            text += `  ✓ No significant risk flags identified\n`;
        }

        // Insights/Recommendations
        const insights = Array.isArray(retentionData.insights) ? retentionData.insights : [];
        text += `\nKEY RECOMMENDATIONS:\n`;
        if (insights.length > 0) {
            insights.forEach((insight: string, idx: number) => {
                const cleanInsight = String(insight).replace(/^[→⚡⚠️✅]\s*/, '');
                text += `  ${idx + 1}. ${cleanInsight}\n`;
            });
        } else {
            text += `  No specific recommendations available.\n`;
        }

        return text;
    };

    const analysisText = buildAnalysisText();

    console.log('[RetentionAnalysis] Processed data:', {
        retentionScore,
        retentionRisk,
        components,
        hasAnalysisText: !!analysisText
    });

    return (
        <div className="space-y-4">
            {/* Retention Score Gauge */}
            <Card className="bg-white border-gray-200">
                <CardHeader className="pb-3">
                    <CardTitle className="text-2xl font-semibold text-center mb-4">Retention Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="w-full max-w-[220px] mx-auto">
                        <FitmentScoreGauge score={retentionScore} />
                    </div>
                </CardContent>
            </Card>

            {/* Component Scores as Circular Meters */}
            <Card className="bg-white border-gray-200">
                <CardContent className="pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 place-items-center py-4">
                        {components.map((component, index) => (
                            <div key={index} className="text-center w-full">
                                <ComponentScoreRing
                                    label={component.label}
                                    value={component.score}
                                    color={getComponentColor(component.score)}
                                />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Detailed Analysis Text */}
            <Card className="bg-white border-gray-200">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-bold text-gray-800">Detailed Retention Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
                            {analysisText}
                        </pre>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

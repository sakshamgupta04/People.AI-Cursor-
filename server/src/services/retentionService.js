// Enhanced Retention Risk Scorer with Institution Tier Analysis
// Rule-based system with educational background consideration

/**
 * Calculate retention risk based on multiple factors including institution tiers
 * Uses research-backed indicators without requiring ML training
 */
class RetentionScorer {
    constructor() {
        this.riskCategories = {
            Low: 'Low Risk - High retention likelihood',
            Medium: 'Medium Risk - Monitor and support',
            High: 'High Risk - Intervention recommended'
        };
    }

    /**
     * Calculate institution quality score (0-5) based on UG and PG tiers
     * UG: 2% weightage, PG: 3% weightage (total 5% from 30% job stability)
     */
    calculateInstitutionTierScore(candidateData) {
        // Only use tiers 1, 2, 3, or null (null if empty/not provided)
        // If tier is 4, 5, or invalid, treat as tier 3
        let ugTier = candidateData.ug_tier;
        let pgTier = candidateData.pg_tier;

        // Normalize tiers: only 1, 2, 3 are valid; anything else becomes 3 or null
        if (ugTier !== null && ugTier !== undefined) {
            if (ugTier < 1 || ugTier > 3) {
                ugTier = 3; // Treat invalid tiers as tier 3
            }
        } else {
            ugTier = null; // Empty/invalid becomes null
        }

        if (pgTier !== null && pgTier !== undefined) {
            if (pgTier < 1 || pgTier > 3) {
                pgTier = 3; // Treat invalid tiers as tier 3
            }
        } else {
            pgTier = null; // Empty/invalid becomes null
        }

        // UG tier scoring (out of 2%)
        // If null, score is 0 (empty institution)
        let ugScore = 0;
        if (ugTier === 1) {
            ugScore = 2.0;
        } else if (ugTier === 2) {
            ugScore = 1.0;
        } else if (ugTier === 3) {
            ugScore = 0.5;
        } else {
            // null (empty) = 0
            ugScore = 0.0;
        }

        // PG tier scoring (out of 3%)
        // If null, score is 0 (empty institution)
        let pgScore = 0;
        if (pgTier === 1) {
            pgScore = 3.0;
        } else if (pgTier === 2) {
            pgScore = 2.0;
        } else if (pgTier === 3) {
            pgScore = 1.0;
        } else {
            // null (empty) = 0
            pgScore = 0.0;
        }

        // Total institution score (out of 5%)
        const totalTierScore = ugScore + pgScore;

        // Convert to 0-100 scale for component scoring
        // 5% becomes 100 when achieved
        const tierScoreNormalized = (totalTierScore / 5.0) * 100;

        return tierScoreNormalized;
    }

    /**
     * Calculate job stability indicator (0-100)
     * Now 25% based on tenure/job changes, 5% based on institution tiers
     * Total: 30% for job stability component
     */
    calculateJobStabilityScore(candidateData) {
        const longevity = candidateData.longevity_years ?? 0;
        const uniqueJobs = candidateData.number_of_unique_designations ?? candidateData.number_of_jobs ?? 1;

        // Average tenure per job
        const avgTenure = longevity / Math.max(uniqueJobs, 1);

        // Pure stability scoring (25% of total weight)
        let pureStability = 0;
        if (avgTenure >= 4) { // Very stable (4+ years per job)
            pureStability = 100;
        } else if (avgTenure >= 2.5) { // Stable (2.5-4 years)
            pureStability = 80;
        } else if (avgTenure >= 1.5) { // Moderate (1.5-2.5 years)
            pureStability = 60;
        } else if (avgTenure >= 1) { // Concerning (1-1.5 years)
            pureStability = 40;
        } else { // High risk (<1 year per job)
            pureStability = 20;
        }

        // Institution tier score (5% of total weight)
        const tierScore = this.calculateInstitutionTierScore(candidateData);

        // Combined stability score (weighted average)
        // 25% pure stability + 5% tier = 30% total job stability
        const combinedStability = (pureStability * 0.833) + (tierScore * 0.167);
        // 0.833 = 25/30, 0.167 = 5/30

        return combinedStability;
    }

    /**
     * Calculate retention likelihood from personality (0-100)
     * Research shows Conscientiousness and Agreeableness are PRIMARY predictors
     */
    calculatePersonalityRetentionScore(big5Scores) {
        // Extract scores (0-40 range from normalized Big5 test)
        // But we receive scores in -50 to 50 range, need to normalize
        const normalizeScore = (score) => {
            if (score === null || score === undefined || isNaN(Number(score))) return 20;
            const clamped = Math.max(-50, Math.min(50, Number(score)));
            return Math.round(((clamped + 50) / 100) * 40);
        };

        const conscientiousness = normalizeScore(big5Scores.conscientiousness);
        const agreeableness = normalizeScore(big5Scores.agreeableness);
        const neuroticism = normalizeScore(big5Scores.neuroticism);

        // Normalize to 0-100
        const conscientiousnessNorm = (conscientiousness / 40) * 100;
        const agreeablenessNorm = (agreeableness / 40) * 100;
        const neuroticismNorm = ((40 - neuroticism) / 40) * 100; // Inverted (low = good)

        // Weighted combination (research-based weights)
        const personalityRetention = (
            conscientiousnessNorm * 0.50 +  // 50% - Most important
            agreeablenessNorm * 0.35 +      // 35% - Second most important  
            neuroticismNorm * 0.15           // 15% - Emotional stability
        );

        return personalityRetention;
    }

    /**
     * Calculate professional engagement indicator (0-100)
     * Based on development activities and achievements
     */
    calculateEngagementScore(candidateData) {
        const workshops = candidateData.workshops_count ?? candidateData.workshops ?? 0;
        const trainings = candidateData.trainings_count ?? candidateData.trainings ?? 0;
        const papers = candidateData.research_papers_count ?? candidateData.total_papers ?? 0;
        const patents = candidateData.patents_count ?? candidateData.total_patents ?? 0;
        const achievements = candidateData.achievements_count ?? candidateData.achievements ?? 0;
        const experience = candidateData.average_experience ?? candidateData.longevity_years ?? 1;

        // Calculate activity rate (normalized by experience)
        const activityRate = (workshops + trainings + papers * 2 + patents * 3 + achievements) / Math.max(experience, 1);

        // Scoring
        let engagement = 0;
        if (activityRate >= 5) { // Highly engaged
            engagement = 100;
        } else if (activityRate >= 3) { // Very engaged
            engagement = 85;
        } else if (activityRate >= 2) { // Engaged
            engagement = 70;
        } else if (activityRate >= 1) { // Moderately engaged
            engagement = 55;
        } else { // Low engagement
            engagement = 40;
        }

        return engagement;
    }

    /**
     * Adjust retention based on fitment score and category
     * Higher fitment = higher retention likelihood
     */
    calculateFitmentFactor(fitmentScore, category) {
        // Category-specific thresholds
        if (category === 'Experienced') {
            if (fitmentScore >= 75) {
                return 100;
            } else if (fitmentScore >= 60) {
                return 80;
            } else if (fitmentScore >= 45) {
                return 60;
            } else {
                return 40;
            }
        } else { // Fresher/Inexperienced
            if (fitmentScore >= 70) {
                return 100;
            } else if (fitmentScore >= 55) {
                return 80;
            } else if (fitmentScore >= 40) {
                return 60;
            } else {
                return 40;
            }
        }
    }

    /**
     * Identify specific retention risk flags including institution tier analysis
     */
    identifyRiskFlags(candidateData, big5Scores) {
        const flags = [];
        const normalizeScore = (score) => {
            if (score === null || score === undefined || isNaN(Number(score))) return 20;
            const clamped = Math.max(-50, Math.min(50, Number(score)));
            return Math.round(((clamped + 50) / 100) * 40);
        };

        // Job hopping
        const uniqueJobs = candidateData.number_of_unique_designations ?? candidateData.number_of_jobs ?? 0;
        const longevity = candidateData.longevity_years ?? 0;
        if (uniqueJobs >= 4 && longevity / Math.max(uniqueJobs, 1) < 1.5) {
            flags.push('Job Hopper Pattern - Frequent transitions detected');
        }

        // Short average tenure
        const avgTenure = longevity / Math.max(uniqueJobs, 1);
        if (avgTenure < 1.5) {
            flags.push(`Short Average Tenure - ${avgTenure.toFixed(1)} years per job`);
        }

        // Low engagement
        const workshops = candidateData.workshops_count ?? candidateData.workshops ?? 0;
        const trainings = candidateData.trainings_count ?? candidateData.trainings ?? 0;
        const papers = candidateData.research_papers_count ?? candidateData.total_papers ?? 0;

        if (workshops + trainings < 2 && papers === 0) {
            flags.push('Low Professional Development Activity');
        }

        // Low conscientiousness (major retention predictor)
        const conscientiousness = normalizeScore(big5Scores.conscientiousness);
        if (conscientiousness < 20) {
            flags.push('Low Conscientiousness Score - Primary retention risk factor');
        } else if (conscientiousness < 25) {
            flags.push('Below Average Conscientiousness - Monitor commitment levels');
        }

        // High neuroticism
        const neuroticism = normalizeScore(big5Scores.neuroticism);
        if (neuroticism > 30) {
            flags.push('High Emotional Instability - May need wellness support');
        }

        // Low agreeableness
        const agreeableness = normalizeScore(big5Scores.agreeableness);
        if (agreeableness < 20) {
            flags.push('Low Agreeableness - Team fit may be challenging');
        }

        // Low fitment
        const fitment = candidateData.fitment_score ?? 0;
        if (fitment < 45) {
            flags.push(`Low Overall Fitment (${fitment.toFixed(1)}/100) - Poor role match`);
        }

        return flags;
    }

    /**
     * Generate actionable insights based on retention analysis including tier considerations
     */
    generateRetentionInsights(retentionData, candidateData) {
        const insights = [];
        const riskLevel = retentionData.retention_risk;
        const riskScore = retentionData.retention_score;
        const flags = retentionData.risk_flags;

        // Get tier information (normalize to 1-3 or null)
        let ugTier = candidateData.ug_tier;
        let pgTier = candidateData.pg_tier;

        // Normalize: only 1, 2, 3 are valid; anything else becomes 3 or null
        if (ugTier !== null && ugTier !== undefined) {
            if (ugTier < 1 || ugTier > 3) ugTier = 3;
        } else {
            ugTier = null;
        }

        if (pgTier !== null && pgTier !== undefined) {
            if (pgTier < 1 || pgTier > 3) pgTier = 3;
        } else {
            pgTier = null;
        }

        const tierScore = retentionData.component_scores.institution_quality;

        // Risk-based recommendations
        if (riskLevel === 'High') {
            insights.push('⚠️ HIGH RETENTION RISK - Immediate intervention recommended');
            insights.push('→ Schedule comprehensive onboarding with dedicated mentor');
            insights.push('→ Weekly check-ins for first 3 months, bi-weekly for next 3 months');
            insights.push('→ Assess role alignment and create personalized development plan');
            insights.push('→ Consider probation extension with clear performance metrics');
        } else if (riskLevel === 'Medium') {
            insights.push('⚡ MEDIUM RETENTION RISK - Active monitoring advised');
            insights.push('→ Provide clear 6-12 month career progression roadmap');
            insights.push('→ Encourage participation in skill development programs');
            insights.push('→ Monthly one-on-ones to assess job satisfaction');
            insights.push('→ Assign challenging projects to increase engagement');
        } else { // Low risk
            insights.push('✅ LOW RETENTION RISK - Strong retention indicators');
            insights.push('→ Leverage for team stability and peer mentorship roles');
            insights.push('→ Consider for long-term strategic projects');
            insights.push('→ Fast-track for leadership development programs');
        }

        // Institution tier-specific insights
        if (tierScore < 40) {
            insights.push('→ Educational Background: Provide structured learning paths and certification support');
        } else if (tierScore >= 80) {
            insights.push('→ Educational Background: Premier institution graduate - high expectations likely');
        }

        // Only tiers 1, 2, 3 exist now (no tier 4 or 5)
        if (ugTier === 3 || pgTier === 3) {
            insights.push('→ Skill Development: Offer mentorship from senior team members');
            insights.push('→ Training Priority: Invest in upskilling and technical training programs');
        }

        if ((ugTier !== null && ugTier <= 2) || (pgTier !== null && pgTier <= 2)) {
            insights.push('→ High Potential: Premier institution background - provide challenging work');
        }

        // Flag-specific insights
        if (flags.some(flag => flag.includes('Job Hopper'))) {
            insights.push('→ Career Goals: Discuss long-term career vision in first week');
            insights.push('→ Engagement: Create 2-year milestones to build commitment');
        }

        if (flags.some(flag => flag.includes('Short Average Tenure'))) {
            insights.push('→ Retention Strategy: Identify growth opportunities early');
            insights.push('→ Red Flag: Past pattern suggests risk - monitor closely');
        }

        if (flags.some(flag => flag.includes('Low Professional Development'))) {
            insights.push('→ Development: Allocate annual training budget and track usage');
            insights.push('→ Engagement: Encourage conference attendance and workshops');
        }

        if (flags.some(flag => flag.includes('Low Conscientiousness'))) {
            insights.push('→ Management Style: Needs clear structure, deadlines, and accountability');
            insights.push('→ Environment: Thrives with defined processes and regular feedback');
        }

        if (flags.some(flag => flag.includes('High Emotional Instability'))) {
            insights.push('→ Support: Consider EAP (Employee Assistance Program) enrollment');
            insights.push('→ Wellness: Promote stress management resources and work-life balance');
        }

        if (flags.some(flag => flag.includes('Low Overall Fitment'))) {
            insights.push('→ Critical: Assess alternative roles within organization');
            insights.push('→ Decision Point: May not be suitable for current position');
        }

        // Score-based priority
        if (riskScore < 50) {
            insights.push(`→ Priority Level: CRITICAL (Score: ${riskScore.toFixed(1)}/100) - Requires immediate attention`);
        } else if (riskScore < 65) {
            insights.push(`→ Priority Level: HIGH (Score: ${riskScore.toFixed(1)}/100) - Active engagement needed`);
        } else {
            insights.push(`→ Priority Level: STANDARD (Score: ${riskScore.toFixed(1)}/100) - Regular practices sufficient`);
        }

        return insights;
    }

    /**
     * Calculate comprehensive retention risk assessment with institution tier analysis
     */
    calculateRetentionRisk(candidateData, fitmentScore, big5Scores, category) {
        // Calculate component scores
        const stabilityScore = this.calculateJobStabilityScore(candidateData); // Now includes tier
        const personalityScore = this.calculatePersonalityRetentionScore(big5Scores);
        const engagementScore = this.calculateEngagementScore(candidateData);
        const fitmentFactor = this.calculateFitmentFactor(fitmentScore, category);

        // Get institution tier score separately for reporting
        const institutionQuality = this.calculateInstitutionTierScore(candidateData);

        // Weighted retention score (0-100)
        // Stability (30%) now internally includes: pure stability (25%) + institution tiers (5%)
        const retentionScore = (
            stabilityScore * 0.30 +      // 30% - Job history (includes 5% tier)
            personalityScore * 0.35 +    // 35% - Personality (strongest predictor)
            engagementScore * 0.20 +     // 20% - Professional engagement
            fitmentFactor * 0.15         // 15% - Overall fitment
        );

        // Determine risk category
        let riskLevel = 'Low';
        if (retentionScore >= 70) {
            riskLevel = 'Low';
        } else if (retentionScore >= 50) {
            riskLevel = 'Medium';
        } else {
            riskLevel = 'High';
        }

        // Identify risk flags
        const riskFlags = this.identifyRiskFlags(candidateData, big5Scores);

        // Compile results
        const result = {
            retention_score: Math.round(retentionScore * 100) / 100,
            retention_risk: riskLevel,
            risk_description: this.riskCategories[riskLevel],
            component_scores: {
                stability: Math.round(stabilityScore * 100) / 100,  // Includes tier component
                personality: Math.round(personalityScore * 100) / 100,
                engagement: Math.round(engagementScore * 100) / 100,
                fitment_factor: Math.round(fitmentFactor * 100) / 100,
                institution_quality: Math.round(institutionQuality * 100) / 100  // Separate for visibility
            },
            tier_details: {
                ug_tier: (() => {
                    const tier = candidateData.ug_tier;
                    if (tier !== null && tier !== undefined && tier >= 1 && tier <= 3) return tier;
                    return null;
                })(),
                pg_tier: (() => {
                    const tier = candidateData.pg_tier;
                    if (tier !== null && tier !== undefined && tier >= 1 && tier <= 3) return tier;
                    return null;
                })(),
                ug_institute: candidateData.ug_institute_name ?? candidateData.ug_institute ?? 'Unknown',
                pg_institute: candidateData.pg_institute_name ?? candidateData.pg_institute ?? 'None',
                tier_score_contribution: Math.round(institutionQuality * 0.05 * 100) / 100  // 5% of total
            },
            risk_flags: riskFlags,
            flag_count: riskFlags.length
        };

        // Generate insights with tier context
        result.insights = this.generateRetentionInsights(result, candidateData);

        return result;
    }

    /**
     * Generate human-readable summary with tier analysis
     */
    getRetentionSummary(retentionData) {
        const score = retentionData.retention_score;
        const risk = retentionData.retention_risk;
        const flags = retentionData.flag_count;
        const tierDetails = retentionData.tier_details;

        let summary = `\nRETENTION ANALYSIS SUMMARY\n${'='.repeat(60)}\n`;
        summary += `Retention Score: ${score}/100\n`;
        summary += `Risk Level: ${risk}\n`;
        summary += `Risk Flags: ${flags}\n\n`;
        summary += `${retentionData.risk_description}\n\n`;
        summary += `COMPONENT BREAKDOWN:\n`;
        summary += `• Job Stability (incl. tiers): ${retentionData.component_scores.stability}/100\n`;
        summary += `• Personality Fit: ${retentionData.component_scores.personality}/100\n`;
        summary += `• Professional Engagement: ${retentionData.component_scores.engagement}/100\n`;
        summary += `• Fitment Factor: ${retentionData.component_scores.fitment_factor}/100\n\n`;
        summary += `EDUCATIONAL BACKGROUND ANALYSIS:\n`;
        summary += `• UG Institution: ${tierDetails.ug_institute} (Tier ${tierDetails.ug_tier})\n`;
        summary += `• PG Institution: ${tierDetails.pg_institute} (Tier ${tierDetails.pg_tier})\n`;
        summary += `• Institution Quality Score: ${retentionData.component_scores.institution_quality}/100\n`;
        summary += `• Tier Contribution to Overall Score: ${tierDetails.tier_score_contribution}/100\n\n`;
        summary += `RISK FLAGS:\n`;

        if (retentionData.risk_flags && retentionData.risk_flags.length > 0) {
            retentionData.risk_flags.forEach(flag => {
                summary += `  ⚠ ${flag}\n`;
            });
        } else {
            summary += `  ✓ No significant risk flags identified\n`;
        }

        summary += `\nKEY RECOMMENDATIONS:\n`;
        retentionData.insights.slice(0, 8).forEach((insight, idx) => {
            summary += `  ${idx + 1}. ${insight}\n`;
        });

        return summary;
    }
}

// Export singleton instance
export const retentionScorer = new RetentionScorer();
export default retentionScorer;


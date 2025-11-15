// Fitment scoring service ported from provided Python logic

/**
 * Normalize Big5 scores from app scale (-50..50) to model scale (0..40)
 */
const normalizeBig5ForModel = (val) => {
    if (val === null || val === undefined || isNaN(Number(val))) return 0;
    const clamped = Math.max(-50, Math.min(50, Number(val)));
    return Math.round(((clamped + 50) / 100) * 40);
};

export const categorizeCandidate = (longevityYears, averageExperience) => {
    const ly = Number(longevityYears ?? 0);
    const ae = Number(averageExperience ?? 0);
    if (ly >= 5 && ae >= 3) return 'Experienced';
    if (ly > 1 && ae > 1) return 'Inexperienced';
    return 'Fresher';
};

const scoreLongevity = (val) => (val >= 6 ? 100 : val >= 4 ? 75 : val >= 1 ? 50 : 20);
const scoreAvgExp = (val) => (val >= 3 ? 100 : val >= 1.8 ? 75 : val >= 1 ? 50 : 20);
const scoreWorkshops = (val) => (val >= 12.73 ? 100 : val >= 7 ? 75 : val >= 3 ? 50 : 20);
const scoreTrainings = (val) => (val >= 12.90 ? 100 : val >= 7 ? 75 : val >= 3 ? 50 : 20);
const scorePapers = (val) => (val >= 1.18 ? 100 : val >= 0.5 ? 75 : val >= 0.2 ? 50 : 0);
const scorePatents = (val) => (val >= 0.04 ? 100 : 0);
const scoreAchievements = (val) => (val >= 7.54 ? 100 : val >= 4 ? 75 : val >= 1 ? 50 : 0);
const scoreBooks = (val) => (val >= 0.81 ? 100 : 0);
const scoreState = (val) => (val === 1 ? 100 : 0);
const scoreJobs = (val) => (val >= 0.17 ? 100 : 0);
const scoreInstitute = (val) => (val === 1 ? 100 : 0);

export const calculateDatasetScore = (data) => {
    const scores = {};
    scores.longevity = scoreLongevity(Number(data.longevity_years || 0)) * 0.30;
    scores.avg_exp = scoreAvgExp(Number(data.average_experience || 0)) * 0.30;
    scores.workshops = scoreWorkshops(Number(data.workshops_count || 0)) * 0.045;
    scores.trainings = scoreTrainings(Number(data.trainings_count || 0)) * 0.045;
    scores.papers = scorePapers(Number(data.research_papers_count || 0)) * 0.05;
    scores.patents = scorePatents(Number(data.patents_count || 0)) * 0.07;
    scores.achievements = scoreAchievements(Number(data.achievements_count || 0)) * 0.04;
    scores.books = scoreBooks(Number(data.books_count || 0)) * 0.02;
    scores.state = scoreState((data.is_jk ? 1 : 0)) * 0.02;
    scores.jobs = scoreJobs(Number(data.number_of_jobs || 0)) * 0.01;
    scores.ug = scoreInstitute(data.ug_institute ? 1 : 0) * 0.02;
    scores.pg = scoreInstitute(data.pg_institute ? 1 : 0) * 0.03;
    scores.phd = scoreInstitute(data.phd_institute ? 1 : 0) * 0.05;
    return Object.values(scores).reduce((a, b) => a + b, 0);
};

export const scaleDatasetScore = (rawScore, category) => {
    // Experienced: dataset 70, Big5 30; Fresher/Inexperienced: dataset 30, Big5 70
    return category === 'Experienced' ? (rawScore / 100) * 70 : (rawScore / 100) * 30;
};

export const calculateBig5Score = (big5Data, category) => {
    const O = normalizeBig5ForModel(big5Data?.openness);
    const C = normalizeBig5ForModel(big5Data?.conscientiousness);
    const E = normalizeBig5ForModel(big5Data?.extraversion);
    const A = normalizeBig5ForModel(big5Data?.agreeableness);
    const N = normalizeBig5ForModel(big5Data?.neuroticism);

    const toBucket = (x, buckets) => {
        if (x <= 10) return buckets[0];
        if (x <= 20) return buckets[1];
        if (x <= 30) return buckets[2];
        return buckets[3];
    };

    const scores = {
        O: toBucket(O, [0.25, 0.50, 0.75, 1.0]),
        C: toBucket(C, [0.25, 0.50, 0.75, 1.0]),
        E: toBucket(E, [0.50, 0.75, 1.0, 0.75]),
        A: toBucket(A, [0.25, 0.50, 1.0, 0.75]),
        N: toBucket(N, [1.0, 0.75, 0.50, 0.25])
    };

    // Big5 weight: 30 for Experienced, 70 for Fresher/Inexperienced
    const weightPerTrait = (category === 'Experienced' ? 30 : 70) / 5;
    const total = Object.values(scores).reduce((sum, v) => sum + v * weightPerTrait, 0);
    return { trait_scores: scores, total_score: total, weight_per_trait: weightPerTrait };
};

export const calculateOverallFitment = (candidateData, big5Data) => {
    const category = categorizeCandidate(candidateData.longevity_years || 0, candidateData.average_experience || 0);
    const rawDataset = calculateDatasetScore(candidateData);
    const datasetScaled = scaleDatasetScore(rawDataset, category);
    const big5 = calculateBig5Score(big5Data || {}, category);
    const overall = datasetScaled + big5.total_score;
    return {
        category,
        raw_dataset_score: Math.round(rawDataset * 100) / 100,
        fitment_score: Math.round(datasetScaled * 100) / 100,
        big5_score: Math.round(big5.total_score * 100) / 100,
        big5_trait_scores: big5.trait_scores,
        overall_fitment_score: Math.round(overall * 100) / 100
    };
};




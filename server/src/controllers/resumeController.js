import { supabase } from '../config/supabase.js';
import { calculateOverallFitment } from '../services/fitmentService.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Upload file to Supabase Storage
const uploadFileToStorage = async (file) => {
  console.log('Starting file upload:', file.originalname);

  try {
    if (!file || !file.path) {
      throw new Error('No file or file path provided');
    }

    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    const filePath = `resumes/${fileName}`;

    console.log('Preparing to upload file to Supabase:', {
      originalName: file.originalname,
      tempPath: file.path,
      size: file.size,
      mimeType: file.mimetype,
      destinationPath: filePath
    });

    // Note: Bucket 'resume' should be created manually in Supabase dashboard
    console.log('Assuming bucket "resume" exists (create it manually in Supabase dashboard if not)');

    // Read the file as a buffer
    console.log('Reading file from disk...');
    const fileBuffer = fs.readFileSync(file.path);

    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('File is empty or could not be read');
    }

    console.log('Uploading file to Supabase...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('resume')
      .upload(filePath, fileBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.mimetype,
        duplex: 'half'
      });

    if (uploadError) {
      console.error('Error uploading file to Supabase:', uploadError);

      // Provide specific error messages for common issues
      if (uploadError.message.includes('Bucket not found')) {
        throw new Error('Storage bucket "resume" not found. Please create it in your Supabase dashboard under Storage.');
      }
      if (uploadError.message.includes('row-level security policy')) {
        throw new Error('Storage permissions error. Please check your Supabase RLS policies or use a service role key instead of anon key.');
      }

      throw new Error(`File upload failed: ${uploadError.message}`);
    }

    console.log('File uploaded successfully, getting public URL...');
    const { data: { publicUrl } } = supabase.storage
      .from('resume')
      .getPublicUrl(filePath);

    // Clean up the temporary file
    try {
      console.log('Cleaning up temporary file...');
      fs.unlinkSync(file.path);
      console.log('Temporary file removed');
    } catch (cleanupError) {
      console.error('Error cleaning up temporary file:', cleanupError);
      // Don't fail the request if cleanup fails
    }

    const result = {
      original_filename: file.originalname,
      file_path: filePath,
      file_url: publicUrl,
      file_size: file.size,
      mime_type: file.mimetype,
      uploaded_at: new Date().toISOString()
    };

    console.log('File upload completed successfully:', result);
    return result;
  } catch (error) {
    console.error('Error in file upload process:', {
      error: error.message,
      stack: error.stack,
      file: file ? {
        originalname: file.originalname,
        path: file.path,
        size: file?.size,
        mimetype: file?.mimetype
      } : 'No file info'
    });
    throw error;
  }
};

// Get all resumes with pagination
export const getResumes = async (req, res) => {
  try {
    console.log('Fetching all resumes...');

    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { data: resumes, error, count } = await supabase
      .from('resumes')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Get API base URL from app.locals
    const apiBaseUrl = req.app.locals.API_BASE_URL || 'http://localhost:5000';

    // Transform the data to include full file URLs
    const resumesWithUrls = resumes.map(resume => ({
      ...resume,
      file_url: resume.file_path ? `${apiBaseUrl}/resumes/${resume.id}/file` : null
    }));

    res.json({
      success: true,
      data: resumesWithUrls,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error getting resumes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Search resumes
export const searchResumes = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const { data, error } = await supabase
      .from('resumes')
      .select('*')
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,skills.cs.{"${query}"}`);

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error searching resumes:', error);
    res.status(500).json({ error: 'Failed to search resumes' });
  }
};

// Get a specific resume by ID
export const getResumeById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ success: false, error: 'Resume not found' });
    }

    // Get API base URL from app.locals
    const apiBaseUrl = req.app.locals.API_BASE_URL || 'http://localhost:5000';

    // Add full file URL
    data.file_url = data.file_path ? `${apiBaseUrl}/resumes/${data.id}/file` : null;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getting resume:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create a new resume
export const createResume = async (req, res) => {
  console.log('=== Starting createResume ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('Request file:', req.file ? {
    fieldname: req.file.fieldname,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    path: req.file.path
  } : 'No file uploaded');

  try {
    let resumeData = {};

    // Parse the JSON data from the form data
    if (req.body.data) {
      try {
        console.log('Parsing resume data from request body');
        resumeData = typeof req.body.data === 'string'
          ? JSON.parse(req.body.data)
          : req.body.data;

        // If personalInfo exists, extract its fields to the root level
        if (resumeData.personalInfo) {
          const { personalInfo, ...rest } = resumeData;
          resumeData = {
            ...personalInfo,
            ...rest
          };
        }

        console.log('Processed resume data:', JSON.stringify(resumeData, null, 2));
      } catch (e) {
        console.error('Error parsing resume data:', {
          error: e.message,
          stack: e.stack,
          data: req.body.data
        });
        return res.status(400).json({
          success: false,
          error: 'Invalid resume data format',
          message: e.message,
          details: e.message
        });
      }
    } else {
      console.log('No resume data found in request body');
      // Try to get data from request body directly if not in data field
      const { data: bodyData, file, ...rest } = req.body;
      if (Object.keys(rest).length > 0) {
        resumeData = rest;
        console.log('Using data from request body:', JSON.stringify(resumeData, null, 2));
      }
    }

    // Handle file upload if present (save locally for now)
    if (req.file) {
      console.log('Processing file upload to local storage...');
      try {
        const localFileAbsolute = req.file.path; // e.g., server/uploads/filename.ext
        const fileName = path.basename(localFileAbsolute);
        const relativePath = `uploads/${fileName}`; // store relative to server root

        resumeData.original_filename = req.file.originalname;
        resumeData.file_path = relativePath;
        resumeData.file_url = `/api/resumes/temp/${fileName}`; // will be overridden to id-based URL after insert
        resumeData.file_size = req.file.size;
        resumeData.mime_type = req.file.mimetype;
      } catch (error) {
        console.error('Error saving file locally:', {
          error: error.message,
          stack: error.stack,
          file: req.file ? {
            originalname: req.file.originalname,
            path: req.file.path,
            size: req.file.size
          } : 'No file info'
        });
        return res.status(500).json({
          success: false,
          error: 'Failed to save file locally',
          message: error.message,
          details: error.message
        });
      }
    } else {
      console.log('No file uploaded with the request');
    }

    // Map and validate resume data to match database schema
    const mappedResumeData = {
      // Personal info (required fields)
      name: resumeData.name || resumeData.personalInfo?.name || '',
      email: resumeData.email || resumeData.personalInfo?.email || '',
      phone: resumeData.phone || resumeData.personalInfo?.phone || null,
      address: resumeData.address || resumeData.personalInfo?.address || null,
      summary: resumeData.summary || resumeData.personalInfo?.summary || null,

      // Arrays (JSONB fields)
      education: resumeData.education || [],
      experience: resumeData.experience || [],
      skills: resumeData.skills || [],
      achievements: resumeData.achievements || [],
      projects: resumeData.projects || [],
      research_papers: resumeData.research_papers || [],
      patents: resumeData.patents || [],
      books: resumeData.books || [],
      trainings: resumeData.trainings || [],
      workshops: resumeData.workshops || [],

      // Education institutes
      ug_institute: resumeData.ug_institute || resumeData.UG_InstituteName || null,
      pg_institute: resumeData.pg_institute || resumeData.PG_InstituteName || null,
      phd_institute: resumeData.phd_institute || (resumeData.PhD_Institute ? String(resumeData.PhD_Institute) : null),

      // Metadata and analytics
      longevity_years: resumeData.longevity_years || resumeData.Longevity_Years || 0,
      number_of_jobs: resumeData.number_of_jobs || resumeData.No_of_Jobs || 0,
      average_experience: resumeData.average_experience || resumeData.Experience_Average || 0,
      skills_count: resumeData.skills_count || resumeData.Skills_No || 0,
      achievements_count: resumeData.achievements_count || resumeData.Achievements_No || 0,
      trainings_count: resumeData.trainings_count || resumeData.Trainings_No || 0,
      workshops_count: resumeData.workshops_count || resumeData.Workshops_No || 0,
      projects_count: resumeData.projects_count || resumeData.Projects_No || 0,
      research_papers_count: resumeData.research_papers_count || resumeData.Research_Papers_No || 0,
      patents_count: resumeData.patents_count || resumeData.Patents_No || 0,
      books_count: resumeData.books_count || resumeData.Books_No || 0,
      is_jk: Boolean(resumeData.is_jk || resumeData.State_JK || false),
      best_fit_for: resumeData.best_fit_for || resumeData.Best_Fit_For || null,

      // File info (if uploaded)
      ...(resumeData.original_filename && { original_filename: resumeData.original_filename }),
      ...(resumeData.file_path && { file_path: resumeData.file_path }),
      ...(resumeData.file_url && { file_url: resumeData.file_url }),
      ...(resumeData.file_size && { file_size: resumeData.file_size }),
      ...(resumeData.mime_type && { mime_type: resumeData.mime_type }),
      personality_analysis_completed: false
    };

    // Validate required fields
    if (!mappedResumeData.name || !mappedResumeData.email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Name and email are required fields',
        details: 'Name and email are required fields'
      });
    }

    console.log('Inserting resume data into database...', JSON.stringify(mappedResumeData, null, 2));
    const { data: insertedData, error: dbError } = await supabase
      .from('resumes')
      .insert([mappedResumeData])
      .select();

    if (dbError) {
      console.error('Database insert error details:', {
        error: dbError,
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint,
        code: dbError.code
      });
      const errorMsg = `Database operation failed: ${dbError.message}${dbError.details ? ` - ${dbError.details}` : ''}${dbError.hint ? ` (Hint: ${dbError.hint})` : ''}`;
      throw new Error(errorMsg);
    }

    if (!insertedData || insertedData.length === 0) {
      throw new Error('No data returned from database after insert');
    }

    console.log('Resume created successfully:', JSON.stringify(insertedData[0], null, 2));

    // Get API base URL from app.locals
    const apiBaseUrl = req.app.locals.API_BASE_URL || 'http://localhost:5000';

    // Add file URL to the response
    const responseData = {
      ...insertedData[0],
      file_url: insertedData[0].file_path
        ? `${apiBaseUrl}/resumes/${insertedData[0].id}/file`
        : null
    };

    res.status(201).json({
      success: true,
      message: 'Resume created successfully',
      data: responseData
    });
  } catch (error) {
    console.error('Unexpected error in createResume:', {
      error: error.message,
      stack: error.stack,
      request: {
        method: req.method,
        url: req.originalUrl,
        headers: req.headers,
        body: req.body,
        file: req.file ? {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size
        } : null
      }
    });

    const errorResponse = {
      success: false,
      error: 'Failed to create resume',
      message: error.message || 'An unknown error occurred',
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
        details: error.details
      })
    };

    console.error('Sending error response:', errorResponse);
    res.status(500).json(errorResponse);
  } finally {
    console.log('=== End of createResume ===');
  }
};

// Update a resume
export const updateResume = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Handle file upload if present
    if (req.file) {
      const fileData = await uploadFileToStorage(req.file);
      updateData.file_data = fileData;
    }

    const { data, error } = await supabase
      .from('resumes')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    res.json(data[0]);
  } catch (error) {
    console.error('Error updating resume:', error);
    res.status(500).json({ error: 'Failed to update resume' });
  }
};

// Delete a resume
export const deleteResume = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('resumes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting resume:', error);
    res.status(500).json({ error: 'Failed to delete resume' });
  }
};

// Update personality test results by email
export const updatePersonalityTestResults = async (req, res) => {
  try {
    const { email, extraversion, agreeableness, conscientiousness, neuroticism, openness } = req.body;
    console.log('[PersonalityTest] Incoming update for:', email);

    // Validate required fields
    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
        message: 'Email parameter is missing or empty'
      });
    }

    // Validate scores are numbers
    const scores = {
      extraversion: parseInt(extraversion),
      agreeableness: parseInt(agreeableness),
      conscientiousness: parseInt(conscientiousness),
      neuroticism: parseInt(neuroticism),
      openness: parseInt(openness)
    };

    if (
      isNaN(scores.extraversion) ||
      isNaN(scores.agreeableness) ||
      isNaN(scores.conscientiousness) ||
      isNaN(scores.neuroticism) ||
      isNaN(scores.openness)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid score format',
        message: 'All scores must be valid numbers'
      });
    }

    // Update data matching database column names
    // Use lowercase snake_case columns
    const updateData = {
      extraversion: scores.extraversion,
      agreeableness: scores.agreeableness,
      conscientiousness: scores.conscientiousness,
      neuroticism: scores.neuroticism,
      openness: scores.openness,
      personality_analysis_completed: true
    };

    console.log('Updating personality test results:', {
      email: email.toLowerCase().trim(),
      scores: updateData
    });

    // Update the resume record matching the email
    const { data, error } = await supabase
      .from('resumes')
      .update(updateData)
      .eq('email', email.toLowerCase().trim())
      .select();

    if (error) {
      console.error('Database update error:', error);
      return res.status(500).json({
        success: false,
        error: 'Database operation failed',
        message: error.message
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Resume not found',
        message: `No resume found with email: ${email}`
      });
    }

    // Recompute fitment using current record and new Big5 scores
    const record = data[0];
    console.log('[PersonalityTest] Recomputing fitment for:', record.email);
    const fitment = calculateOverallFitment(
      {
        longevity_years: record.longevity_years,
        average_experience: record.average_experience,
        workshops_count: record.workshops_count,
        trainings_count: record.trainings_count,
        research_papers_count: record.research_papers_count,
        patents_count: record.patents_count,
        achievements_count: record.achievements_count,
        books_count: record.books_count,
        is_jk: record.is_jk,
        number_of_jobs: record.number_of_jobs,
        ug_institute: record.ug_institute,
        pg_institute: record.pg_institute,
        phd_institute: record.phd_institute
      },
      {
        extraversion: scores.extraversion,
        agreeableness: scores.agreeableness,
        conscientiousness: scores.conscientiousness,
        neuroticism: scores.neuroticism,
        openness: scores.openness
      }
    );

    const overall = fitment.overall_fitment_score;
    const personalityScore = Math.round(fitment.big5_score);
    // Normalize candidate_type to Title Case among allowed values
    const allowedTypes = new Set(['Experienced', 'Intermediate', 'Fresher']);
    const normalizedType = typeof fitment.category === 'string'
      ? (() => {
        const t = fitment.category.trim().toLowerCase();
        if (t === 'experienced') return 'Experienced';
        if (t === 'intermediate' || t === 'inexperienced') return 'Intermediate';
        if (t === 'fresher') return 'Fresher';
        return 'Fresher';
      })()
      : 'Fresher';
    const candidateType = allowedTypes.has(normalizedType) ? normalizedType : 'Fresher';

    const { data: updated, error: updError } = await supabase
      .from('resumes')
      .update({
        fitment_score: overall,
        profile_score: Math.round(overall),
        personality_score: personalityScore,
        candidate_type: candidateType
      })
      .eq('email', email.toLowerCase().trim())
      .select();

    if (updError) {
      console.error('Error updating fitment fields:', updError);
      return res.status(500).json({
        success: false,
        error: 'Database operation failed',
        message: updError.message || 'Failed to update fitment fields'
      });
    }

    console.log('Successfully updated personality test results and fitment:', updated?.[0] || record);
    res.status(200).json({
      success: true,
      message: 'Personality test results updated and fitment computed successfully',
      data: updated?.[0] || record
    });
  } catch (error) {
    console.error('Unexpected error updating personality test results:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred'
    });
  }
};

// Get resume file by ID
export const getResumeFile = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Getting file for resume ID: ${id}`);

    // Get resume data from database
    const { data, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ success: false, error: 'Resume not found' });
    }

    // Check if file path exists
    if (!data.file_path) {
      return res.status(404).json({ success: false, error: 'No file associated with this resume' });
    }

    console.log(`File path in database: ${data.file_path}`);

    // 1) Try to serve from local uploads if path is local
    const maybeLocal = data.file_path.includes('uploads/') || data.file_path.includes('uploads\\');
    if (maybeLocal) {
      const localPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../', data.file_path);
      try {
        if (fs.existsSync(localPath)) {
          const ext = path.extname(localPath).toLowerCase();
          let contentType = 'application/octet-stream';
          if (ext === '.pdf') contentType = 'application/pdf';
          else if (ext === '.doc') contentType = 'application/msword';
          else if (ext === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          else if (ext === '.txt') contentType = 'text/plain';

          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Disposition', `inline; filename="${path.basename(localPath)}"`);
          const stream = fs.createReadStream(localPath);
          stream.pipe(res);
          return;
        }
      } catch (e) {
        console.warn('Local file read failed, falling back to storage:', e.message);
      }
    }

    // 2) Fallback: Download the file from Supabase Storage
    try {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('resume')
        .download(data.file_path);

      if (downloadError) {
        console.error('Error downloading file from Supabase:', downloadError);
        return res.status(404).json({ success: false, error: 'File not found in storage' });
      }

      if (!fileData) {
        return res.status(404).json({ success: false, error: 'File data is empty' });
      }

      const ext = path.extname(data.file_path).toLowerCase();
      let contentType = 'application/octet-stream';
      if (ext === '.pdf') contentType = 'application/pdf';
      else if (ext === '.doc') contentType = 'application/msword';
      else if (ext === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      else if (ext === '.txt') contentType = 'text/plain';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${path.basename(data.file_path)}"`);
      const buffer = await fileData.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (e) {
      console.error('Error serving file:', e);
      res.status(500).json({ success: false, error: e.message });
    }
  } catch (error) {
    console.error('Error getting resume file:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ================================
// Configuration
// ================================
const CONFIG = {
  API_BASE_URL: "http://localhost:8000" || HTML_URLS,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  LOADING_MESSAGES: [
    "Initializing analysis...",
    "Reading your resume...",
    "Analyzing job requirements...",
    "Comparing skills and experience...",
    "Identifying gaps and opportunities...",
    "Generating recommendations...",
    "Finalizing results...",
  ],
};

// ================================
// Global State
// ================================
let currentAnalysisData = null;
let resumeFile = null;
let loadingInterval = null;

// ================================
// DOM Elements
// ================================
const elements = {
  // Form
  form: document.getElementById("analyzerForm"),
  resumeInput: document.getElementById("resumeFile"),
  resumeUploadArea: document.getElementById("resumeUploadArea"),
  resumePreview: document.getElementById("resumePreview"),
  resumeFileName: document.getElementById("resumeFileName"),
  resumeFileSize: document.getElementById("resumeFileSize"),
  removeResumeBtn: document.getElementById("removeResume"),
  jobDescription: document.getElementById("jobDescription"),
  charCount: document.getElementById("charCount"),
  analyzeBtn: document.getElementById("analyzeBtn"),
  resetBtn: document.getElementById("resetBtn"),

  // Loading
  uploadCard: document.getElementById("uploadCard"),
  loadingContainer: document.getElementById("loadingContainer"),
  loadingMessage: document.getElementById("loadingMessage"),
  progressFill: document.getElementById("progressFill"),

  // Error
  errorAlert: document.getElementById("errorAlert"),
  errorMessage: document.getElementById("errorMessage"),

  // Results
  resultsContainer: document.getElementById("resultsContainer"),
  scoreNumber: document.getElementById("scoreNumber"),
  scoreProgressCircle: document.getElementById("scoreProgressCircle"),
  scoreInterpretation: document.getElementById("scoreInterpretation"),
  missingSkillsContainer: document.getElementById("missingSkillsContainer"),
  missingSkillsEmpty: document.getElementById("missingSkillsEmpty"),
  suggestionsContainer: document.getElementById("suggestionsContainer"),
  recommendedSkillsContainer: document.getElementById(
    "recommendedSkillsContainer",
  ),
  detailedAnalysis: document.getElementById("detailedAnalysis"),
};

// ================================
// Initialization
// ================================
document.addEventListener("DOMContentLoaded", () => {
  initializeEventListeners();
  updateCharCount();
});

function initializeEventListeners() {
  // File upload
  elements.resumeUploadArea.addEventListener("click", () =>
    elements.resumeInput.click(),
  );
  elements.resumeInput.addEventListener("change", handleFileSelect);
  elements.removeResumeBtn.addEventListener("click", removeFile);

  // Drag and drop
  elements.resumeUploadArea.addEventListener("dragover", handleDragOver);
  elements.resumeUploadArea.addEventListener("dragleave", handleDragLeave);
  elements.resumeUploadArea.addEventListener("drop", handleDrop);

  // Job description character count
  elements.jobDescription.addEventListener("input", updateCharCount);

  // Form submission
  elements.form.addEventListener("submit", handleFormSubmit);
  elements.resetBtn.addEventListener("click", resetForm);

  // Smooth scroll
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", handleNavClick);
  });
}

// ================================
// File Upload Handlers
// ================================
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    validateAndSetFile(file);
  }
}

function handleDragOver(e) {
  e.preventDefault();
  elements.resumeUploadArea.classList.add("dragover");
}

function handleDragLeave(e) {
  e.preventDefault();
  elements.resumeUploadArea.classList.remove("dragover");
}

function handleDrop(e) {
  e.preventDefault();
  elements.resumeUploadArea.classList.remove("dragover");

  const file = e.dataTransfer.files[0];
  if (file) {
    validateAndSetFile(file);
  }
}

function validateAndSetFile(file) {
  // Validate file type
  if (file.type !== "application/pdf") {
    showError("Please upload a PDF file only.");
    return;
  }

  // Validate file size
  if (file.size > CONFIG.MAX_FILE_SIZE) {
    showError(
      `File size must be less than ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB.`,
    );
    return;
  }

  // Set file
  resumeFile = file;

  // Update UI
  elements.resumeFileName.textContent = file.name;
  elements.resumeFileSize.textContent = formatFileSize(file.size);
  elements.resumeUploadArea.style.display = "none";
  elements.resumePreview.style.display = "flex";
}

function removeFile() {
  resumeFile = null;
  elements.resumeInput.value = "";
  elements.resumeUploadArea.style.display = "block";
  elements.resumePreview.style.display = "none";
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

// ================================
// Character Counter
// ================================
function updateCharCount() {
  const count = elements.jobDescription.value.length;
  elements.charCount.textContent = count.toLocaleString();
}

// ================================
// Form Submission
// ================================
async function handleFormSubmit(e) {
  e.preventDefault();

  // Validate
  if (!resumeFile) {
    showError("Please upload a resume PDF file.");
    return;
  }

  const jobDescText = elements.jobDescription.value.trim();
  if (!jobDescText) {
    showError("Please enter a job description.");
    return;
  }

  if (jobDescText.length < 50) {
    showError("Job description is too short. Please provide more details.");
    return;
  }

  // Hide error and results
  hideError();
  hideResults();

  // Show loading
  showLoading();

  // Prepare form data
  const formData = new FormData();
  formData.append("resume", resumeFile);
  formData.append("job_description_text", jobDescText);

  try {
    // Call API
    const response = await fetch(`${CONFIG.API_BASE_URL}/analyze-text`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    // Hide loading
    hideLoading();

    if (data.success) {
      currentAnalysisData = data;
      displayResults(data);
      scrollToResults();
    } else {
      showError(data.error || "Analysis failed. Please try again.");
    }
  } catch (error) {
    hideLoading();

    if (error.name === "TypeError" && error.message.includes("fetch")) {
      showError(
        "Unable to connect to the API server. Please ensure the backend is running on " +
          CONFIG.API_BASE_URL,
      );
    } else {
      showError("An unexpected error occurred: " + error.message);
    }

    console.error("Analysis error:", error);
  }
}

// ================================
// Loading State
// ================================
function showLoading() {
  elements.uploadCard.style.display = "none";
  elements.loadingContainer.style.display = "block";
  elements.analyzeBtn.disabled = true;

  // Animated loading messages
  let messageIndex = 0;
  let progress = 0;

  loadingInterval = setInterval(() => {
    messageIndex = (messageIndex + 1) % CONFIG.LOADING_MESSAGES.length;
    elements.loadingMessage.textContent = CONFIG.LOADING_MESSAGES[messageIndex];

    progress = Math.min(progress + 100 / CONFIG.LOADING_MESSAGES.length, 95);
    elements.progressFill.style.width = progress + "%";
  }, 2000);
}

function hideLoading() {
  if (loadingInterval) {
    clearInterval(loadingInterval);
    loadingInterval = null;
  }

  elements.progressFill.style.width = "100%";

  setTimeout(() => {
    elements.loadingContainer.style.display = "none";
    elements.uploadCard.style.display = "block";
    elements.analyzeBtn.disabled = false;
    elements.progressFill.style.width = "0%";
  }, 500);
}

// ================================
// Error Handling
// ================================
function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorAlert.style.display = "flex";
  elements.errorAlert.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function hideError() {
  elements.errorAlert.style.display = "none";
}

function closeError() {
  hideError();
}

// ================================
// Results Display
// ================================
function displayResults(data) {
  // Show results container
  elements.resultsContainer.style.display = "block";

  // Display match score
  displayMatchScore(data.match_score);

  // Display missing skills
  displayMissingSkills(data.missing_skills);

  // Display improvement suggestions
  displaySuggestions(data.improvement_suggestions);

  // Display recommended skills
  displayRecommendedSkills(data.recommended_skills);

  // Display detailed analysis
  displayDetailedAnalysis(data.raw_analysis);
}

function displayMatchScore(score) {
  // Default to 0 if score is null
  const scoreValue = score || 0;

  // Animate score number
  animateNumber(elements.scoreNumber, 0, scoreValue, 1500);

  // Animate circular progress
  const circumference = 2 * Math.PI * 90; // radius = 90
  const offset = circumference - (scoreValue / 100) * circumference;

  setTimeout(() => {
    elements.scoreProgressCircle.style.strokeDashoffset = offset;
  }, 100);

  // Score interpretation
  let interpretation = "";
  let interpretationClass = "";

  if (scoreValue >= 80) {
    interpretation =
      "🎉 Excellent match! Your resume aligns very well with the job requirements.";
    interpretationClass = "excellent";
  } else if (scoreValue >= 60) {
    interpretation =
      "👍 Good match! You meet most of the requirements with some areas for improvement.";
    interpretationClass = "good";
  } else if (scoreValue >= 40) {
    interpretation =
      "⚠️ Moderate match. Consider enhancing your resume to better align with the job.";
    interpretationClass = "moderate";
  } else {
    interpretation =
      "⚡ Low match. Significant improvements needed to meet job requirements.";
    interpretationClass = "low";
  }

  elements.scoreInterpretation.textContent = interpretation;
  elements.scoreInterpretation.className = `score-interpretation ${interpretationClass}`;
}

function displayMissingSkills(skills) {
  elements.missingSkillsContainer.innerHTML = "";

  if (!skills || skills.length === 0) {
    elements.missingSkillsContainer.style.display = "none";
    elements.missingSkillsEmpty.style.display = "block";
    return;
  }

  elements.missingSkillsContainer.style.display = "flex";
  elements.missingSkillsEmpty.style.display = "none";

  skills.forEach((skill) => {
    const tag = document.createElement("span");
    tag.className = "skill-tag";
    tag.textContent = skill.trim();
    elements.missingSkillsContainer.appendChild(tag);
  });
}

function displaySuggestions(suggestions) {
  elements.suggestionsContainer.innerHTML = "";

  if (!suggestions || suggestions.length === 0) {
    elements.suggestionsContainer.innerHTML =
      '<p class="empty-state">No specific suggestions at this time.</p>';
    return;
  }

  suggestions.forEach((suggestion, index) => {
    const item = document.createElement("div");
    item.className = "suggestion-item";

    item.innerHTML = `
            <div class="suggestion-icon">${index + 1}</div>
            <div class="suggestion-text">${escapeHtml(suggestion.trim())}</div>
        `;

    elements.suggestionsContainer.appendChild(item);
  });
}

function displayRecommendedSkills(skills) {
  elements.recommendedSkillsContainer.innerHTML = "";

  if (!skills || skills.length === 0) {
    elements.recommendedSkillsContainer.innerHTML =
      '<p class="empty-state">No additional skills recommended.</p>';
    return;
  }

  skills.forEach((skill) => {
    const tag = document.createElement("span");
    tag.className = "skill-tag";
    tag.textContent = skill.trim();
    elements.recommendedSkillsContainer.appendChild(tag);
  });
}

function displayDetailedAnalysis(rawAnalysis) {
  if (rawAnalysis) {
    elements.detailedAnalysis.textContent = rawAnalysis;
  } else {
    elements.detailedAnalysis.textContent = "No detailed analysis available.";
  }
}

function hideResults() {
  elements.resultsContainer.style.display = "none";
}

// ================================
// Utility Functions
// ================================
function animateNumber(element, start, end, duration) {
  const range = end - start;
  const increment = range / (duration / 16);
  let current = start;

  const timer = setInterval(() => {
    current += increment;
    if (
      (increment > 0 && current >= end) ||
      (increment < 0 && current <= end)
    ) {
      current = end;
      clearInterval(timer);
    }
    element.textContent = Math.round(current);
  }, 16);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function scrollToResults() {
  setTimeout(() => {
    elements.resultsContainer.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, 300);
}

function scrollToAnalyzer() {
  document.getElementById("analyzer").scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

// ================================
// Navigation
// ================================
function handleNavClick(e) {
  e.preventDefault();
  const targetId = e.target.getAttribute("href");
  const targetElement = document.querySelector(targetId);

  if (targetElement) {
    targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Update active link
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.remove("active");
  });
  e.target.classList.add("active");
}

// ================================
// Form Reset
// ================================
function resetForm() {
  elements.form.reset();
  removeFile();
  hideError();
  hideResults();
  updateCharCount();
  currentAnalysisData = null;
}

function analyzeAnother() {
  resetForm();
  scrollToAnalyzer();
}

// ================================
// Export Functions
// ================================
function copyAnalysis() {
  if (!currentAnalysisData || !currentAnalysisData.raw_analysis) {
    showError("No analysis to copy.");
    return;
  }

  navigator.clipboard
    .writeText(currentAnalysisData.raw_analysis)
    .then(() => {
      alert("Analysis copied to clipboard!");
    })
    .catch((err) => {
      console.error("Failed to copy:", err);
      showError("Failed to copy to clipboard.");
    });
}

function downloadReport() {
  if (!currentAnalysisData) {
    showError("No analysis data to download.");
    return;
  }

  const reportContent = generateReportText();
  const blob = new Blob([reportContent], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `resume-analysis-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateReportText() {
  const data = currentAnalysisData;
  let report = "=".repeat(60) + "\n";
  report += "RESUME ANALYSIS REPORT\n";
  report += "=".repeat(60) + "\n\n";

  report += `Generated: ${new Date().toLocaleString()}\n\n`;

  report += "1. MATCH SCORE\n";
  report += "-".repeat(60) + "\n";
  report += `Score: ${data.match_score || "N/A"}/100\n\n`;

  report += "2. MISSING SKILLS\n";
  report += "-".repeat(60) + "\n";
  if (data.missing_skills && data.missing_skills.length > 0) {
    data.missing_skills.forEach((skill, i) => {
      report += `${i + 1}. ${skill}\n`;
    });
  } else {
    report += "None\n";
  }
  report += "\n";

  report += "3. IMPROVEMENT SUGGESTIONS\n";
  report += "-".repeat(60) + "\n";
  if (data.improvement_suggestions && data.improvement_suggestions.length > 0) {
    data.improvement_suggestions.forEach((suggestion, i) => {
      report += `${i + 1}. ${suggestion}\n`;
    });
  } else {
    report += "None\n";
  }
  report += "\n";

  report += "4. RECOMMENDED SKILLS TO LEARN\n";
  report += "-".repeat(60) + "\n";
  if (data.recommended_skills && data.recommended_skills.length > 0) {
    data.recommended_skills.forEach((skill, i) => {
      report += `${i + 1}. ${skill}\n`;
    });
  } else {
    report += "None\n";
  }
  report += "\n";

  report += "5. DETAILED ANALYSIS\n";
  report += "-".repeat(60) + "\n";
  report += data.raw_analysis || "Not available";
  report += "\n\n";

  report += "=".repeat(60) + "\n";
  report += "End of Report\n";
  report += "=".repeat(60) + "\n";

  return report;
}

// ================================
// API Health Check (Optional)
// ================================
async function checkAPIHealth() {
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/health`);
    const data = await response.json();
    console.log("API Health:", data);
    return data.status === "healthy";
  } catch (error) {
    console.error("API health check failed:", error);
    return false;
  }
}

// Optional: Check API health on page load
// checkAPIHealth().then(healthy => {
//     if (!healthy) {
//         console.warn('API server may not be running');
//     }
// });

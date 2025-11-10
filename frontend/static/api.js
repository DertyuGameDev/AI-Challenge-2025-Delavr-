/**
 * api_client.js
 * Full JavaScript client for interacting with the Flask API backend.
 *
 * Supports:
 *  - Fetching random/daily tasks
 *  - Creating new tasks
 *  - Listing all tasks
 *  - Submitting a solution (with file upload)
 *  - Checking submission status
 *
 * Uses native Fetch API and async/await for cleaner syntax.
 */

// Base URL — adjust to your actual backend host/port if needed
const API_BASE = window.location.origin; // e.g. "http://127.0.0.1:5000"

/**
 * Unified fetch helper
 */
async function apiFetch(url, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${url}`, options);

    // Try to parse JSON always
    const contentType = response.headers.get("content-type") || "";
    const data =
      contentType.includes("application/json") ? await response.json() : await response.text();

    if (!response.ok) {
      console.error("API error:", data);
      throw new Error(data.message || data || `HTTP ${response.status}`);
    }

    return data;
  } catch (err) {
    console.error(`Request failed: ${url}`, err);
    throw err;
  }
}

/* =====================================================
 *  TASKS SECTION
 * ===================================================== */

/**
 * Get all tasks (optionally filtered by category and difficulty)
 */
async function getAllTasks(category = "", difficulty = "") {
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (difficulty) params.append('difficulty', difficulty);
  const url = `/tasks${params.toString() ? `?${params.toString()}` : ""}`;
  return apiFetch(url, { method: "GET" });
}

/**
 * Get unique categories and difficulties for filters
 */
async function getTaskFilters() {
  return apiFetch('/tasks/filters', { method: "GET" });
}

/**
 * Get a random task
 */
async function getRandomTask({ difficulty = "", category = "", solvedIds = [] } = {}) {
  const params = new URLSearchParams();
  if (difficulty) params.append("difficulty", difficulty);
  if (category) params.append("category", category);

  return apiFetch(`/tasks/random?${params.toString()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_solved_tasks: solvedIds }),
  });
}

/**
 * Get a daily task (new unsolved)
 */
async function getDailyTask(solvedIds = []) {
  // Daily задача не исключается из решенных, всегда один и тот же на день
  return apiFetch(`/tasks/daily`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_solved_tasks: [] }), // Не передаем решенные задачи
  });
}

/**
 * Create a new task
 */
async function createTask({ title, description, category, difficulty }) {
  return apiFetch(`/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description, category, difficulty }),
  });
}

/* =====================================================
 *  SUBMISSIONS SECTION
 * ===================================================== */

/**
 * Submit a solution (file + problem text)
 */
async function submitSolution(file, taskCondition) {
  if (!file || !taskCondition) {
    throw new Error("File and task condition are required");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("task_condition", taskCondition);

  try {
    const response = await fetch(`${API_BASE}/submit-solution`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || `HTTP ${response.status}` };
      }
      throw new Error(errorData.message || errorData.error || "Submission failed");
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error("submitSolution error:", err);
    throw err;
  }
}

/**
 * Check submission status
 */
async function getSubmissionStatus(submissionId) {
  const url = `/submission-status?submission_id=${encodeURIComponent(submissionId)}`;
  return apiFetch(url, { method: "GET" });
}

/* =====================================================
 *  FRONTEND INTEGRATION HELPERS
 * ===================================================== */

/**
 * Example: Attach UI actions to buttons if they exist
 */
// document.addEventListener("DOMContentLoaded", () => {
//   const randomTaskBtn = document.getElementById("fetchRandomTask");
//   const dailyTaskBtn = document.getElementById("fetchDailyTask");
//   const submitBtn = document.getElementById("submitSolution");
//   const fileInput = document.getElementById("fileInput");
//   const taskInput = document.getElementById("taskInput");
//   const resultArea = document.getElementById("resultsArea");

//   // Random task fetch
//   if (randomTaskBtn) {
//     randomTaskBtn.addEventListener("click", async () => {
//       try {
//         const data = await getRandomTask({ difficulty: "medium" });
//         alert(`🎯 Random task:\n${data.title}\n\n${data.description}`);
//       } catch (err) {
//         alert("Error fetching random task: " + err.message);
//       }
//     });
//   }

//   // Daily task fetch
//   if (dailyTaskBtn) {
//     dailyTaskBtn.addEventListener("click", async () => {
//       try {
//         const data = await getDailyTask();
//         if (taskInput) taskInput.value = data.description;
//         alert(`🗓 Daily task:\n${data.title}\n\n${data.description}`);
//       } catch (err) {
//         alert("Error fetching daily task: " + err.message);
//       }
//     });
//   }

//   // Solution submit
//   if (submitBtn) {
//     submitBtn.addEventListener("click", async () => {
//       try {
//         const file = fileInput?.files?.[0];
//         const taskCondition = taskInput?.value?.trim();

//         if (!file || !taskCondition) {
//           alert("Please select a file and enter task text before submitting!");
//           return;
//         }

//         const { submission_id } = await submitSolution(file, taskCondition);
//         alert("✅ Submission sent! Tracking ID: " + submission_id);

//         // Poll submission status every 2s until completed
//         let completed = false;
//         const interval = setInterval(async () => {
//           const statusData = await getSubmissionStatus(submission_id);
//           console.log("Status:", statusData.status);

//           if (statusData.status === "Completed") {
//             clearInterval(interval);
//             completed = true;
//             if (resultArea)
//               resultArea.innerHTML = `
//                 <h3>✅ Solution Checked</h3>
//                 <p><strong>Score:</strong> ${statusData.completion_percentage}%</p>
//                 <p><strong>Difficulty:</strong> ${statusData.difficulty}</p>
//                 <ul>
//                   ${statusData.hints.map(h => `<li>${h}</li>`).join("")}
//                 </ul>
//               `;
//           }
//         }, 2000);

//         // Safety timeout
//         setTimeout(() => {
//           if (!completed) {
//             clearInterval(interval);
//             alert("⏰ Timeout waiting for completion.");
//           }
//         }, 60000);
//       } catch (err) {
//         alert("Error submitting solution: " + err.message);
//       }
//     });
//   }
// });

/* =====================================================
 *  EXPORTS (optional if using bundlers)
 * ===================================================== */

// Export functions to global scope for use in other scripts
window.API = {
  getAllTasks,
  getRandomTask,
  getDailyTask,
  createTask,
  submitSolution,
  getSubmissionStatus,
};

/* =====================================================
 *  USER DATA SECTION
 * ===================================================== */

/**
 * Get user data from JSON file
 */
async function getUserData() {
  return apiFetch('/user-data', { method: "GET" });
}

/**
 * Update user data in JSON file
 */
async function updateUserData(data) {
  try {
    const response = await apiFetch('/user-data', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    console.log('✅ User data updated successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Error updating user data:', error);
    throw error;
  }
}

// Also export directly to window for backward compatibility
window.getAllTasks = getAllTasks;
window.getRandomTask = getRandomTask;
window.getDailyTask = getDailyTask;
window.createTask = createTask;
window.submitSolution = submitSolution;
window.getSubmissionStatus = getSubmissionStatus;
window.getUserData = getUserData;
window.updateUserData = updateUserData;

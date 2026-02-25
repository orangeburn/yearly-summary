document.addEventListener('DOMContentLoaded', async () => {
  // Initialize UI
  const todayCountEl = document.getElementById('today-count');
  const monthCountEl = document.getElementById('month-count');
  const dashboardBtn = document.getElementById('open-dashboard');

  dashboardBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Mock data fetching for now - real implementation will come next
  // We need to request history permissions if not granted, but popup usually has them if in manifest
  
  // Simple history fetch to show we are alive
  try {
    const msPerDay = 1000 * 60 * 60 * 24;
    const todayStart = new Date().setHours(0,0,0,0);
    
    // Count today
    chrome.history.search({
      text: '', 
      startTime: todayStart,
      maxResults: 1000
    }, (results) => {
      todayCountEl.textContent = results.length >= 1000 ? '999+' : results.length;
    });

    // Count this month (approx)
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0,0,0,0);
    
    chrome.history.search({
      text: '', 
      startTime: monthStart.getTime(),
      maxResults: 10000 // Limit for performance in popup
    }, (results) => {
      monthCountEl.textContent = results.length >= 10000 ? '10k+' : results.length;
    });

  } catch (e) {
    console.error("History access error", e);
    todayCountEl.textContent = "Err";
    monthCountEl.textContent = "Err";
  }
});

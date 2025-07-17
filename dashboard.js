// dashboard.js - Adapted from popup.js for the dashboard UI

let allResults = [];
let currentPage = 0;
let totalLeads = 0;
let emailCount = 0;
let phoneCount = 0;
let exportCount = 0;


// Track statistical data
function updateStats() {
    document.getElementById('totalLeadsCount').textContent = allResults.length;
    
    // Count emails and phones
    emailCount = allResults.filter(result => result.email && result.email.trim() !== '').length;
    phoneCount = allResults.filter(result => result.phone && result.phone.trim() !== '').length;
    
    document.getElementById('emailCount').textContent = emailCount;
    document.getElementById('phoneCount').textContent = phoneCount;
}


document.addEventListener('DOMContentLoaded', function() {
    // Set up custom selects
    const customSelects = document.querySelectorAll('.custom-select');
    const otherCountryInput = document.getElementById('otherCountryInput');
    const otherPlatformInput = document.getElementById('otherPlatformInput');
    
    // Set up custom dropdowns
    customSelects.forEach(select => {
        const selected = select.querySelector('.custom-select-selected');
        const options = select.querySelector('.custom-select-options');

        selected.addEventListener('click', () => {
            options.style.display = options.style.display === 'block' ? 'none' : 'block';
        });

        options.addEventListener('click', (event) => {
            const option = event.target.closest('.custom-select-option:not(.disabled)');
            if (option) {
                selected.textContent = option.textContent;
                options.style.display = 'none';
                select.dataset.value = option.dataset.value;

                // Handle platform manual entry
                if (select.id === 'platformSelect') {
                    otherPlatformInput.style.display = option.dataset.value === 'Other' ? 'block' : 'none';
                }

                // Handle country manual entry
                if (select.id === 'countrySelect') {
                    otherCountryInput.style.display = option.dataset.value === 'Other' ? 'block' : 'none';
                }
            }
        });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-select')) {
            customSelects.forEach(select => {
                select.querySelector('.custom-select-options').style.display = 'none';
            });
        }
    });

    // Set up event listeners
    document.getElementById('searchAndScrape').addEventListener('click', searchAndScrape);
    document.getElementById('downloadExcel').addEventListener('click', downloadExcel);

    // Set up message listener
    chrome.runtime.onMessage.addListener(handleMessage);

    // Star rating functionality
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = this.getAttribute('data-value');
            // Set all stars up to the selected one as active
            stars.forEach(s => {
                if (s.getAttribute('data-value') <= rating) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
            
            // Redirect to Chrome Web Store after a short delay
            setTimeout(() => {
                chrome.tabs.create({ 
                    url: 'https://chrome.google.com/webstore/detail/blegkbedbdcoocieacjmpchfmcmdhfce/reviews' 
                });
            }, 500);
        });
        
        // Hover effect
        star.addEventListener('mouseover', function() {
            const rating = this.getAttribute('data-value');
            stars.forEach(s => {
                if (s.getAttribute('data-value') <= rating) {
                    s.classList.add('hover');
                }
            });
        });
        
        star.addEventListener('mouseout', function() {
            stars.forEach(s => s.classList.remove('hover'));
        });
    });
    
    // Initialize stats
    updateStats();
});

function searchAndScrape() {
    allResults = []; // Reset results
    currentPage = 0; // Reset page count

    // Update UI
    document.getElementById('status').textContent = 'Searching and scraping in progress...';
    document.getElementById('results').innerHTML = '';
    document.getElementById('resultCount').textContent = '0';
    document.getElementById('loadMore').style.display = 'none';

    // Get base keyword
    const keyword = document.getElementById('keywordInput').value.trim();

    // Handle platform selection
    const platformSelect = document.getElementById('platformSelect');
    let platform = platformSelect.dataset.value;
    if (platform === 'Other') {
        platform = document.getElementById('otherPlatformInput').value;
    }
    
    // Handle country selection
    const countrySelect = document.getElementById('countrySelect');
    let countryValue = countrySelect.dataset.value === 'Other'
        ? document.getElementById('otherCountryInput').value
        : countrySelect.dataset.value;
    
    const includeGmail = document.getElementById('gmailCheckbox').checked;
    const includePhone = document.getElementById('phoneCheckbox').checked;

    let query = '';

    // Special handling for Websites platform or All Websites
    if (platform && (platform.toLowerCase() === 'websites' || platform.toLowerCase() === 'website' || platform.toLowerCase() === 'all websites')) {
        query = keyword;
        // Add search modifiers for websites
        query += ' (';
        const websiteSearchTerms = [
            'intext:"contact us"',
            'intext:"email"',
            'intext:"phone"',
            '"contact page"',
            'inurl:contact',
            'site:org',
            'site:com',
            'site:net'
        ];
        query += websiteSearchTerms.join(' OR ');
        query += ')';
    } else if (platform) {
        // For specific platforms (like LinkedIn, Twitter etc.)
        query = keyword + ` site:${platform.toLowerCase()}.com`;
    } else {
        // Generic search if no platform selected
        query = keyword;
    }

    // Add country filter
    if (countryValue && countryValue !== 'All Countries') {
        query += ` "${countryValue}"`;
    }

    // Add email and phone filters
    if (includeGmail || includePhone) {
        query += ' (';
        let options = [];
        if (includeGmail) {
            options.push('"@gmail.com"');
            options.push('"email:"');
            options.push('"mailto:"');
            options.push('intext:email');
        }
        if (includePhone) {
            options.push('"phone number"');
            options.push('"tel:"');
            options.push('"contact number"');
            options.push('intext:phone');
        }
        query += options.join(' OR ');
        query += ')';
    }

    console.log("Search query:", query); // For debugging

    // Store current tab ID to return focus later
    let dashboardTabId;
    chrome.tabs.getCurrent(function(tab) {
        dashboardTabId = tab.id;

        // Create a new tab for search
        chrome.tabs.create({
            url: `https://www.google.com/search?q=${encodeURIComponent(query)}&num=100`,
            active: false  // Don't switch to the new tab
        }, function(newTab) {
            // Send message to background script
            chrome.runtime.sendMessage({
                action: "searchAndScrape",
                query: query,
                searchTabId: newTab.id,
                dashboardTabId: dashboardTabId
            });
        });
    });
}

function handleMessage(request, sender, sendResponse) {
    if (request.action === "displayResults") {
        // Get checkbox states
        const includeGmail = document.getElementById('gmailCheckbox').checked;
        const includePhone = document.getElementById('phoneCheckbox').checked;
        
        // Filter results based on checkboxes
        let filteredResults = request.results;
        
        // Apply email and phone filters if checkboxes are checked
        if (includeGmail && !includePhone) {
            // Only show results with emails
            filteredResults = filteredResults.filter(result => result.email && result.email.trim() !== '');
        } else if (!includeGmail && includePhone) {
            // Only show results with phones
            filteredResults = filteredResults.filter(result => result.phone && result.phone.trim() !== '');
        } else if (includeGmail && includePhone) {
            // Show results with either email or phone
            filteredResults = filteredResults.filter(result => 
                (result.email && result.email.trim() !== '') || 
                (result.phone && result.phone.trim() !== '')
            );
        }

        // Stronger duplicate detection - check name, email and phone
        const newResults = filteredResults.filter(newResult => 
            !allResults.some(existingResult => {
                // Check for duplicate emails (if both have emails)
                if (newResult.email && existingResult.email && 
                    newResult.email.toLowerCase() === existingResult.email.toLowerCase()) {
                    return true;
                }
                
                // Check for duplicate phones (if both have phones)
                if (newResult.phone && existingResult.phone) {
                    // Normalize phone formats by removing non-digits
                    const normalizePhone = (phone) => phone.replace(/\D/g, '');
                    if (normalizePhone(newResult.phone) === normalizePhone(existingResult.phone)) {
                        return true;
                    }
                }
                
                // Check for duplicate URLs
                if (newResult.url && existingResult.url) {
                    // Compare domain names only
                    try {
                        const newUrl = new URL(newResult.url).hostname;
                        const existingUrl = new URL(existingResult.url).hostname;
                        if (newUrl === existingUrl) {
                            // If domains match, only consider a duplicate if name, email or phone match
                            return (newResult.name === existingResult.name) || 
                                   (newResult.email && existingResult.email && 
                                    newResult.email.toLowerCase() === existingResult.email.toLowerCase()) || 
                                   (newResult.phone && existingResult.phone && 
                                    newResult.phone === existingResult.phone);
                        }
                    } catch (e) {
                        // If URL parsing fails, compare raw URLs
                        return newResult.url === existingResult.url;
                    }
                }
                
                return false;
            })
        );
        
        allResults = allResults.concat(newResults);
        
        // Update stats
        updateStats();
        
        // Display all results (no more limit)
        displayResults(allResults);
    } else if (request.action === "scrapingComplete") {
        document.getElementById('status').textContent = 'Scraping completed!';
        
        // Remove load more button
        document.getElementById('loadMore').style.display = 'none';
    } else if (request.action === "captchaFound") {
        // Update UI to show CAPTCHA detected
        document.getElementById('status').textContent = 'CAPTCHA detected! Attempting to solve automatically...';
        
        // Create CAPTCHA notification if it doesn't exist
        if (!document.getElementById('captchaNotification')) {
            const resultsDiv = document.getElementById('results');
            const captchaNotification = document.createElement('div');
            captchaNotification.id = 'captchaNotification';
            captchaNotification.className = 'captcha-notification';
            captchaNotification.innerHTML = `
                <div class="captcha-alert">
                    <h3>🔍 CAPTCHA Detected</h3>
                    <p id="captchaStatus">Attempting to solve CAPTCHA automatically...</p>
                    <p>If automatic solving fails, you'll need to manually solve it.</p>
                    <button id="focusCaptchaBtn" class="captcha-btn">Focus CAPTCHA Tab</button>
                </div>
            `;
            
            // Insert at the top of results
            if (resultsDiv.firstChild) {
                resultsDiv.insertBefore(captchaNotification, resultsDiv.firstChild);
            } else {
                resultsDiv.appendChild(captchaNotification);
            }
            
            // Add CSS for the CAPTCHA notification
            if (!document.getElementById('captcha-notification-styles')) {
                const style = document.createElement('style');
                style.id = 'captcha-notification-styles';
                style.textContent = `
                    .captcha-notification {
                        margin-bottom: 20px;
                        width: 100%;
                    }
                    .captcha-alert {
                        background-color: #fff3cd;
                        border: 1px solid #ffeeba;
                        border-radius: 8px;
                        padding: 15px;
                        margin-bottom: 20px;
                        color: #856404;
                    }
                    .captcha-alert h3 {
                        margin-top: 0;
                        color: #856404;
                    }
                    .captcha-alert.success {
                        background-color: #d4edda;
                        border-color: #c3e6cb;
                        color: #155724;
                    }
                    .captcha-alert.success h3 {
                        color: #155724;
                    }
                    .captcha-alert.error {
                        background-color: #f8d7da;
                        border-color: #f5c6cb;
                        color: #721c24;
                    }
                    .captcha-alert.error h3 {
                        color: #721c24;
                    }
                    .captcha-btn {
                        background-color: #007bff;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        padding: 8px 16px;
                        cursor: pointer;
                        margin-top: 10px;
                        font-weight: bold;
                    }
                    .captcha-btn:hover {
                        background-color: #0069d9;
                    }
                `;
                document.head.appendChild(style);
            }
            
            // Focus CAPTCHA tab on button click
            document.getElementById('focusCaptchaBtn').addEventListener('click', function() {
                chrome.tabs.update(request.tabId, {active: true});
            });
        } else {
            // Update existing notification
            document.getElementById('captchaStatus').textContent = 'Attempting to solve CAPTCHA automatically...';
            const captchaAlert = document.querySelector('.captcha-alert');
            captchaAlert.classList.remove('success', 'error');
        }
    } else if (request.action === "captchaAutoClickAttempt") {
        // Update UI to show automatic click attempt
        document.getElementById('status').textContent = 'Clicking CAPTCHA checkbox automatically...';
        
        // Update CAPTCHA notification if it exists
        if (document.getElementById('captchaNotification')) {
            document.getElementById('captchaStatus').textContent = 'Clicking CAPTCHA checkbox automatically...';
        }
    } else if (request.action === "captchaAutoSolveSuccess") {
        // Update UI to show automatic solve success
        document.getElementById('status').textContent = 'CAPTCHA solved automatically! Resuming scraping...';
        
        // Update CAPTCHA notification if it exists
        if (document.getElementById('captchaNotification')) {
            const captchaAlert = document.querySelector('.captcha-alert');
            captchaAlert.classList.add('success');
            captchaAlert.classList.remove('error');
            document.getElementById('captchaStatus').textContent = 'CAPTCHA solved automatically! Resuming scraping...';
        }
        
        // Remove the notification after a delay
        setTimeout(() => {
            const notification = document.getElementById('captchaNotification');
            if (notification) {
                notification.remove();
            }
        }, 5000);
    } else if (request.action === "captchaAutoSolveFailed") {
        // Update UI to show automatic solve failure
        document.getElementById('status').textContent = 'Automatic CAPTCHA solving failed. Please solve the CAPTCHA manually.';
        
        // Update CAPTCHA notification if it exists
        if (document.getElementById('captchaNotification')) {
            const captchaAlert = document.querySelector('.captcha-alert');
            captchaAlert.classList.add('error');
            captchaAlert.classList.remove('success');
            document.getElementById('captchaStatus').innerHTML = `
                <strong>Automatic CAPTCHA solving failed.</strong><br>
                Please switch to the CAPTCHA tab and solve it manually.<br>
                The CAPTCHA tab will remain open until solved.
            `;
            
            // Make the focus button more prominent
            const focusButton = document.getElementById('focusCaptchaBtn');
            if (focusButton) {
                focusButton.style.backgroundColor = '#dc3545';
                focusButton.style.fontSize = '14px';
                focusButton.style.padding = '10px 20px';
                focusButton.style.marginTop = '15px';
                focusButton.textContent = 'Solve CAPTCHA Now';
            }
        }
    } else if (request.action === "scrapingResumed") {
        // Update UI to show scraping resumed
        document.getElementById('status').textContent = 'Scraping resumed after CAPTCHA...';
        
        // Remove CAPTCHA notification if it exists
        const captchaNotification = document.querySelector('.captcha-notification');
        if (captchaNotification) {
            captchaNotification.remove();
        }

        // Add a success notification for resumption
        const resultsDiv = document.getElementById('results');
        const resumeNotification = document.createElement('div');
        resumeNotification.className = 'resume-notification';
        resumeNotification.innerHTML = `
            <div class="resume-alert">
                <h3>✅ Scraping Resumed</h3>
                <p>Lead generation process has resumed after CAPTCHA verification.</p>
            </div>
        `;
        
        // Insert at the top of results
        if (resultsDiv.firstChild) {
            resultsDiv.insertBefore(resumeNotification, resultsDiv.firstChild);
        } else {
            resultsDiv.appendChild(resumeNotification);
        }
        
        // Remove the notification after 5 seconds
        setTimeout(() => {
            if (resumeNotification && resumeNotification.parentNode) {
                resumeNotification.parentNode.removeChild(resumeNotification);
            }
        }, 5000);
    }
}

function displayResults(results) {
    const resultsDiv = document.getElementById('results');
    const resultCountSpan = document.getElementById('resultCount');
    
    // Get checkbox states for display purposes
    const includeGmail = document.getElementById('gmailCheckbox').checked;
    const includePhone = document.getElementById('phoneCheckbox').checked;
    
    // Apply email and phone filters if checkboxes are checked
    let filteredResults = [...results]; // Create a copy to avoid modifying the original
    
    // Apply filters based on checkboxes
    if (includeGmail && !includePhone) {
        // Only show results with emails
        filteredResults = filteredResults.filter(result => result.email && result.email.trim() !== '');
    } else if (!includeGmail && includePhone) {
        // Only show results with phones
        filteredResults = filteredResults.filter(result => result.phone && result.phone.trim() !== '');
    } else if (includeGmail && includePhone) {
        // Show results with either email or phone
        filteredResults = filteredResults.filter(result => 
            (result.email && result.email.trim() !== '') || 
            (result.phone && result.phone.trim() !== '')
        );
    }
    
    // No more result limits - show all results for both free and pro users
    const displayResults = filteredResults;
    
    // Clear previous results
    resultsDiv.innerHTML = '';

    if (displayResults.length === 0) {
        resultsDiv.innerHTML = '<p>No results found.</p>';
        resultCountSpan.textContent = '0';
        return;
    }

    resultCountSpan.textContent = displayResults.length.toString();

    // Display results
    displayResults.forEach((item, index) => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        
        // Determine which fields to display based on checkboxes
        const emailDisplay = includeGmail ? `<p><strong>Email:</strong> ${item.email || 'N/A'}</p>` : '';
        const phoneDisplay = includePhone ? `<p><strong>Phone:</strong> ${item.phone || 'N/A'}</p>` : '';
        
        resultItem.innerHTML = `
            <h3>Result ${index + 1}</h3>
            <p><strong>Name:</strong> ${item.name}</p>
            ${emailDisplay}
            ${phoneDisplay}
            <p><strong>URL:</strong> <a href="${item.url}" target="_blank">${item.url}</a></p>
        `;
        resultsDiv.appendChild(resultItem);
    });
}

function downloadExcel() {
    // Increment export count
    exportCount++;
    document.getElementById('exportCount').textContent = exportCount;
    
    if (allResults.length === 0) {
        alert('No results to export!');
        return;
    }

    const resultsToExport = allResults;

    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Name,Email,Phone,URL\n";

    resultsToExport.forEach(item => {
        const row = [
            item.name ? `"${item.name.replace(/"/g, '""')}"` : "",
            item.email || "",
            item.phone || "",
            item.url || ""
        ].join(",");
        csvContent += row + "\n";
    });

    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "leadspry_results.csv");
    document.body.appendChild(link);

    // Trigger download
    link.click();
    document.body.removeChild(link);
}
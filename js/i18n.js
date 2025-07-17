// i18n.js - Internationalization handler

let currentLocale = 'en';
let translations = {};

// Function to load translations
async function loadTranslations(locale) {
    try {
        const response = await fetch(`/locales/${locale}.json`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        translations = await response.json();
        currentLocale = locale;
        
        // Save selected language to storage
        chrome.storage.sync.set({ language: locale });
        
        // Update all translatable elements
        updatePageContent();
    } catch (error) {
        console.error(`Error loading translations: ${error}`);
        // Fallback to English if translation fails
        if (locale !== 'en') {
            await loadTranslations('en');
        }
    }
}

// Function to get translation
function t(key) {
    const keys = key.split('.');
    let value = translations;
    
    for (const k of keys) {
        if (value && typeof value === 'object') {
            value = value[k];
        } else {
            return key; // Return the key if translation not found
        }
    }
    
    return value || key;
}

// Function to update all translatable elements
function updatePageContent() {
    try {
        // Update dashboard menu items
        const dashboardTitle = document.querySelector('.dashboard-title');
        if (dashboardTitle) {
            dashboardTitle.textContent = t('dashboard.title');
        }

        // Update buttons and labels
        const elements = {
            'searchAndScrape': t('dashboard.searchAndScrape'),
            'downloadExcel': t('dashboard.downloadExcel'),
            'status': t('dashboard.status'),
            'results': t('dashboard.results'),
            'totalLeads': t('dashboard.totalLeads'),
            'emails': t('dashboard.emails'),
            'phones': t('dashboard.phones'),
            'exports': t('dashboard.exports'),
            'leadGenRuns': t('dashboard.leadGenRuns'),
            'keywordInput': t('search.keyword'),
            
            'gmailCheckbox': t('search.includeGmail'),
            'phoneCheckbox': t('search.includePhone')
        };

        // Update all elements
        Object.entries(elements).forEach(([id, text]) => {
            const element = document.getElementById(id);
            if (element) {
                if (element.tagName === 'INPUT' && element.type === 'checkbox') {
                    const label = element.nextElementSibling;
                    if (label) {
                        label.textContent = text;
                    }
                } else {
                    element.textContent = text;
                }
            }
        });

       

    

        // Update license management section
        const licenseTitle = document.querySelector('.license-title');
        if (licenseTitle) {
            licenseTitle.textContent = t('license.title');
        }

        // Update pro status badge
        const proStatusBadge = document.getElementById('proStatus');
        if (proStatusBadge) {
            proStatusBadge.textContent = t('license.proStatus');
        }

        // Update license buttons
        const verifyLicenseBtn = document.getElementById('verifyLicenseBtn');
        if (verifyLicenseBtn) {
            verifyLicenseBtn.textContent = t('license.verifyLicense');
        }

        const buyLicenseBtn = document.getElementById('buyLicenseBtn');
        if (buyLicenseBtn) {
            buyLicenseBtn.textContent = t('license.buyLicense');
        }

        // Update rating section
        const ratingTitle = document.querySelector('.rating-title');
        if (ratingTitle) {
            ratingTitle.textContent = t('rating.title');
        }

        const ratingSubtitle = document.querySelector('.rating-subtitle');
        if (ratingSubtitle) {
            ratingSubtitle.textContent = t('rating.subtitle');
        }
    } catch (error) {
        console.error('Error updating page content:', error);
    }
}

// Initialize language selector
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Initialize language selector
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            // Load saved language preference or use browser language
            chrome.storage.sync.get(['language'], async function(result) {
                const savedLanguage = result.language;
                const browserLanguage = navigator.language.split('-')[0];
                const defaultLanguage = savedLanguage || browserLanguage || 'en';
                
                // Set initial language
                currentLocale = defaultLanguage;
                await loadTranslations(currentLocale);
                
                // Set selected option
                languageSelect.value = currentLocale;
            });

            // Handle language change
            languageSelect.addEventListener('change', async function() {
                currentLocale = this.value;
                await loadTranslations(currentLocale);
                // Save language preference
                chrome.storage.sync.set({ language: currentLocale });
            });
        }
    } catch (error) {
        console.error('Error initializing language selector:', error);
    }
}); 
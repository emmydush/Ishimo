import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Get saved language from localStorage or default to 'en'
    const savedLanguage = localStorage.getItem('language');
    return savedLanguage || 'en';
  });

  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key) => {
    return translations[language][key] || key;
  };

  const value = {
    language,
    changeLanguage,
    t
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

// Translation files
const translations = {
  en: {
    // Common
    app_name: 'Ishimo',
    welcome: 'Welcome',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    view: 'View',
    search: 'Search',
    filter: 'Filter',
    back: 'Back',
    next: 'Next',
    submit: 'Submit',
    logout: 'Logout',
    login: 'Login',
    register: 'Register',
    
    // Navigation
    dashboard: 'Dashboard',
    find_jobs: 'Find Jobs',
    find_workers: 'Find Workers',
    post_job: 'Post a Job',
    my_profile: 'My Profile',
    settings: 'Settings',
    
    // Roles
    worker: 'Worker',
    employer: 'Employer',
    admin: 'Admin',
    
    // Button text
    employer_button: 'I am an Employer',
    worker_button: 'I am a Worker',
    
    // Landing Page
    landing_title: 'Connect with Elite Professionals',
    landing_subtitle: 'The premier platform connecting skilled workers with discerning employers',
    get_started: 'Get Started',
    learn_more: 'Learn More',
    household_network: 'Household Network',
    connect_description: 'Connect with top-tier nannies, cooks, cleaners, and security professionals. Experience a new standard of trust and excellence in your home.',
    
    // Auth
    email: 'Email',
    password: 'Password',
    full_name: 'Full Name',
    phone: 'Phone Number',
    location: 'Location',
    forgot_password: 'Forgot Password?',
    remember_me: 'Remember Me',
    no_account: "Don't have an account?",
    have_account: 'Already have an account?',
    welcome_back: 'Welcome Back',
    sign_in_account: 'Sign in to your account',
    email_username: 'Email Address or Username',
    enter_password: 'Enter your password',
    sign_in: 'Sign In',
    go_back_home: 'Go back home',
    signed_in_success: 'Signed in successfully!',
    login_failed: 'Login failed',
    server_error: 'Cannot connect to the server. Ensure backend is running.',
    
    // Registration
    register: 'Register',
    create_account: 'Create Account',
    register_as_worker: 'Register as Worker',
    register_as_employer: 'Register as Employer',
    already_have_account: 'Already have an account?',
    sign_up: 'Sign Up',
    registration_success: 'Registration successful!',
    registration_failed: 'Registration failed',
    
    // Worker Dashboard
    welcome_back: 'Welcome back',
    active_jobs: 'Active Jobs',
    hours_logged: 'Hours Logged',
    average_rating: 'Average Rating',
    profile_views: 'Profile Views',
    direct_requests: 'Direct Requests',
    my_applications: 'My Applications',
    find_jobs_btn: 'Find Jobs',
    update_availability: 'Update Availability',
    no_requests: 'No direct job requests yet.',
    no_applications: "You haven't applied to any jobs yet.",
    
    // Employer Dashboard
    find_professionals: 'Find Professionals',
    my_job_postings: 'My Job Postings',
    search_roles: 'Search roles or names...',
    view_profile: 'View Profile',
    request: 'Request',
    no_workers: 'No professionals found matching your search.',
    no_jobs: "You haven't posted any jobs yet.",
    
    // Status
    pending: 'Pending',
    accepted: 'Accepted',
    declined: 'Declined',
    completed: 'Completed',
    available: 'Available',
    busy: 'Busy',
    unavailable: 'Unavailable',
    verified: 'Verified',
    
    // Notifications
    notifications: 'Notifications',
    mark_read: 'Mark as Read',
    no_notifications: 'No notifications',
    
    // Language
    language: 'Language',
    english: 'English',
    french: 'French',
    kinyarwanda: 'Kinyarwanda'
  },
  
  fr: {
    // Common
    app_name: 'Ishimo',
    welcome: 'Bienvenue',
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    cancel: 'Annuler',
    save: 'Enregistrer',
    delete: 'Supprimer',
    edit: 'Modifier',
    view: 'Voir',
    search: 'Rechercher',
    filter: 'Filtrer',
    back: 'Retour',
    next: 'Suivant',
    submit: 'Soumettre',
    logout: 'Déconnexion',
    login: 'Connexion',
    register: 'S\'inscrire',
    
    // Navigation
    dashboard: 'Tableau de bord',
    find_jobs: 'Trouver des emplois',
    find_workers: 'Trouver des travailleurs',
    post_job: 'Publier un emploi',
    my_profile: 'Mon profil',
    settings: 'Paramètres',
    
    // Roles
    worker: 'Travailleur',
    employer: 'Employeur',
    admin: 'Administrateur',
    
    // Button text
    employer_button: 'Je suis Employeur',
    worker_button: 'Je suis Travailleur',
    
    // Landing Page
    landing_title: 'Connectez-vous avec des professionnels d\'élite',
    landing_subtitle: 'La plateforme principale reliant les travailleurs qualifiés aux employeurs exigeants',
    get_started: 'Commencer',
    learn_more: 'En savoir plus',
    household_network: 'Réseau Ménager',
    connect_description: 'Connectez-vous avec des nounous, cuisiniers, nettoyeurs et agents de sécurité de premier plan. Découvrez un nouveau standard de confiance et d\'excellence dans votre foyer.',
    
    // Auth
    email: 'Email',
    password: 'Mot de passe',
    full_name: 'Nom complet',
    phone: 'Numéro de téléphone',
    location: 'Localisation',
    forgot_password: 'Mot de passe oublié?',
    remember_me: 'Se souvenir de moi',
    no_account: 'Vous n\'avez pas de compte?',
    have_account: 'Vous avez déjà un compte?',
    welcome_back: 'Bon retour',
    sign_in_account: 'Connectez-vous à votre compte',
    email_username: 'Adresse email ou nom d\'utilisateur',
    enter_password: 'Entrez votre mot de passe',
    sign_in: 'Se connecter',
    go_back_home: 'Retour à l\'accueil',
    signed_in_success: 'Connexion réussie!',
    login_failed: 'Échec de la connexion',
    server_error: 'Impossible de se connecter au serveur. Assurez-vous que le backend est en cours d\'exécution.',
    
    // Registration
    register: 'S\'inscrire',
    create_account: 'Créer un compte',
    register_as_worker: 'S\'inscrire comme Travailleur',
    register_as_employer: 'S\'inscrire comme Employeur',
    already_have_account: 'Vous avez déjà un compte?',
    sign_up: 'S\'inscrire',
    registration_success: 'Inscription réussie!',
    registration_failed: 'Échec de l\'inscription',
    
    // Worker Dashboard
    welcome_back: 'Bon retour',
    active_jobs: 'Emplois actifs',
    hours_logged: 'Heures enregistrées',
    average_rating: 'Note moyenne',
    profile_views: 'Vues du profil',
    direct_requests: 'Demandes directes',
    my_applications: 'Mes candidatures',
    find_jobs_btn: 'Trouver des emplois',
    update_availability: 'Mettre à jour la disponibilité',
    no_requests: 'Aucune demande d\'emploi directe pour le moment.',
    no_applications: 'Vous n\'avez pas postulé à des emplois pour le moment.',
    
    // Employer Dashboard
    find_professionals: 'Trouver des professionnels',
    my_job_postings: 'Mes offres d\'emploi',
    search_roles: 'Rechercher des rôles ou des noms...',
    view_profile: 'Voir le profil',
    request: 'Demander',
    no_workers: 'Aucun professionnel trouvé correspondant à votre recherche.',
    no_jobs: 'Vous n\'avez pas encore publié d\'offres d\'emploi.',
    
    // Status
    pending: 'En attente',
    accepted: 'Accepté',
    declined: 'Refusé',
    completed: 'Terminé',
    available: 'Disponible',
    busy: 'Occupé',
    unavailable: 'Indisponible',
    verified: 'Vérifié',
    
    // Notifications
    notifications: 'Notifications',
    mark_read: 'Marquer comme lu',
    no_notifications: 'Aucune notification',
    
    // Language
    language: 'Langue',
    english: 'Anglais',
    french: 'Français',
    kinyarwanda: 'Kinyarwanda'
  },
  
  rw: {
    // Common
    app_name: 'Ishimo',
    welcome: 'Murakaza neza',
    loading: 'Ibarurikirwa...',
    error: 'Ikosa',
    success: 'Ibyishimo',
    cancel: 'Guhisha',
    save: 'Gushyira',
    delete: 'Gusiba',
    edit: 'Guhindura',
    view: 'Kureba',
    search: 'Shakisha',
    filter: 'Gucunga',
    back: 'Subira inyuma',
    next: 'Komeza',
    submit: 'Ohereza',
    logout: 'Gusohoka',
    login: 'Kwinjira',
    register: 'Kwandika',
    
    // Navigation
    dashboard: 'Ikaze',
    find_jobs: 'Shakisha akazi',
    find_workers: 'Shakisha abakozi',
    post_job: 'Shyiraho akazi',
    my_profile: 'Imyirondoro yanjye',
    settings: 'Igenzura',
    
    // Roles
    worker: 'Umukozi',
    employer: 'Umukoresha',
    admin: 'Umuyobozi',
    
    // Button text
    employer_button: 'Umukoresha',
    worker_button: 'Umukozi',
    
    // Landing Page
    landing_title: 'Ihuriro rya Elite ry\'Abanyamwuga bo mu Mirimo yo mu Rugo',
    landing_subtitle: 'Platafoma zana abakozi b\'ubuhanga kuri ba mwirinzi',
    get_started: 'Tangira',
    learn_more: 'Soma ibindi',
    household_network: 'Urubuga r\'injyi',
    connect_description: 'Huza na ba Elite b\'abanyamwuga bakomeye mu bijyanye no kurera abana, guteka, gukora isuku no gucunga umutekano. Menya urwego rushya rw\'icyizere, ubunyamwuga n\'ubuziranenge mu rugo rwawe.',
    
    // Auth
    email: 'Imeli',
    password: 'Ijambo ry\'ibanga',
    full_name: 'Amazina yose',
    phone: 'Numero ya telefone',
    location: 'Aho uhari',
    forgot_password: 'Wabuze ijambo ry\'ibanga?',
    remember_me: 'Nibuka',
    no_account: 'Nta konti ufite?',
    have_account: 'Konti ufite iriho?',
    welcome_back: 'Murakaza neza',
    sign_in_account: 'Kwinjira kuri konti yawe',
    email_username: 'Imeli cyangwa Izina ry\'ukoresha',
    enter_password: 'Shyiramo ijambo ry\'ibanga',
    sign_in: 'Kwinjira',
    go_back_home: 'Subira kuri home',
    signed_in_success: 'Kwinjira byagenze neza',
    login_failed: 'Kwinjira byaranze nabi',
    server_error: 'Ntushobora kwihuza na seriveri. Wibuke ko backend ikora.',
    
    // Registration
    register: 'Kwandika',
    create_account: 'Kora Konti',
    register_as_worker: 'Kwandika nka Umukozi',
    register_as_employer: 'Kwandika nka Umukoresha',
    already_have_account: 'Konti ufite iriho?',
    sign_up: 'Kwandika',
    registration_success: 'Kwandika byagenze neza',
    registration_failed: 'Kwandika byaranze nabi',
    
    // Worker Dashboard
    welcome_back: 'Murakaza neza',
    active_jobs: 'Akazi akoreshwa',
    hours_logged: 'amasaha yarakozwe',
    average_rating: 'Ingano ya mupaka',
    profile_views: 'Abarebe imyirondoro',
    direct_requests: 'Ibisabwa byihuse',
    my_applications: 'Ibisabwa byanjye',
    find_jobs_btn: 'Shakisha akazi',
    update_availability: 'Hindura imikorere',
    no_requests: 'Nta bisabwa byihuse biriho.',
    no_applications: 'Watanyweye akazi ukitabye ibisabwa.',
    
    // Employer Dashboard
    find_professionals: 'Shakisha abakozi',
    my_job_postings: 'Akazi kanditswe',
    search_roles: 'Shakisha imikorere cyangwa amazina...',
    view_profile: 'Reba imyirondoro',
    request: 'Saba',
    no_workers: 'Nta mukozi wahuye n\'ishakisha ryawe.',
    no_jobs: 'Nta kazi wahisemo urimo.',
    
    // Status
    pending: 'Iratindikanya',
    accepted: 'Yemewe',
    declined: 'Yakanywe',
    completed: 'Byarangiye',
    available: 'Bihari',
    busy: 'Ari mumwanya',
    unavailable: 'Ntibihari',
    verified: 'Yemewe',
    
    // Notifications
    notifications: 'Amakuru',
    mark_read: 'Vuga ko yabonye',
    no_notifications: 'Nta makuru',
    
    // Language
    language: 'Ururimi',
    english: 'Icyongereza',
    french: 'Igifaransa',
    kinyarwanda: 'Ikinyarwanda'
  }
};
